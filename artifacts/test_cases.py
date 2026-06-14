"""
Full pytest test suite for the User-Controlled Output Token Limit feature.

Covers:
  Module 1 — Backend route validation (/api/chat)
  Module 2 — Frontend JS validation (skipped: requires headless browser)
  Module 3 — API request integration
"""

import json
import os
from unittest.mock import MagicMock, patch

import pytest

# Ensure required env vars exist before importing the Flask app
os.environ.setdefault("ANTHROPIC_API_KEY", "test-api-key")
os.environ.setdefault("FLASK_SECRET_KEY", "test-secret-key")

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, MODELS, DEFAULT_MODEL, DEFAULT_MAX_TOKENS  # noqa: E402


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures & helpers
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def flask_client():
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret"
    with app.test_client() as c:
        yield c


def make_mock_response(reply="Test reply", input_tokens=10, output_tokens=20):
    """Return a mock that mimics an Anthropic messages.create() response."""
    mock_resp = MagicMock()
    mock_resp.content = [MagicMock(text=reply)]
    mock_resp.usage.input_tokens = input_tokens
    mock_resp.usage.output_tokens = output_tokens
    return mock_resp


def post_chat(client, message="hi", model="claude-sonnet-4-6", max_tokens=None):
    """Helper: POST to /api/chat with the given parameters."""
    payload = {"message": message, "model": model}
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    return client.post(
        "/api/chat",
        data=json.dumps(payload),
        content_type="application/json",
    )


def get_create_max_tokens(mock_anthropic):
    """Extract the max_tokens kwarg from the most recent messages.create() call."""
    return mock_anthropic.messages.create.call_args.kwargs["max_tokens"]


# ─────────────────────────────────────────────────────────────────────────────
# Module 1: Backend Route Validation
# ─────────────────────────────────────────────────────────────────────────────


class TestGroup11InputValidation:
    """Group 1.1 — /api/chat Endpoint — Input Validation (Server-Side)"""

    def test_tc_1_1_1_valid_max_tokens_within_ceiling(self, flask_client):
        """TC-1.1.1: Valid max_tokens within model ceiling passes validation."""
        with patch("main.client") as mock_anthropic:
            mock_anthropic.messages.create.return_value = make_mock_response()
            resp = post_chat(flask_client, model="claude-sonnet-4-6", max_tokens=50000)

        assert resp.status_code == 200
        mock_anthropic.messages.create.assert_called_once()
        assert get_create_max_tokens(mock_anthropic) == 50000

    def test_tc_1_1_2_max_tokens_equal_to_ceiling(self, flask_client):
        """TC-1.1.2: max_tokens exactly equal to model ceiling passes validation."""
        ceiling = MODELS["claude-sonnet-4-6"]["max_tokens"]
        with patch("main.client") as mock_anthropic:
            mock_anthropic.messages.create.return_value = make_mock_response()
            resp = post_chat(flask_client, model="claude-sonnet-4-6", max_tokens=ceiling)

        assert resp.status_code == 200

    def test_tc_1_1_3_max_tokens_exceeds_ceiling_returns_400(self, flask_client):
        """TC-1.1.3: max_tokens exceeding model ceiling returns 400."""
        ceiling = MODELS["claude-sonnet-4-6"]["max_tokens"]
        with patch("main.client") as mock_anthropic:
            resp = post_chat(flask_client, model="claude-sonnet-4-6", max_tokens=ceiling + 1000)

        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data
        assert "claude-sonnet-4-6" in data["error"] and str(ceiling) in data["error"]
        mock_anthropic.messages.create.assert_not_called()

    def test_tc_1_1_4_max_tokens_zero_returns_400(self, flask_client):
        """TC-1.1.4: max_tokens=0 returns 400 with 'positive integer' message."""
        with patch("main.client") as mock_anthropic:
            resp = post_chat(flask_client, max_tokens=0)

        assert resp.status_code == 400
        data = resp.get_json()
        assert data["error"] == "max_tokens must be a positive integer."
        mock_anthropic.messages.create.assert_not_called()

    def test_tc_1_1_5_negative_max_tokens_returns_400(self, flask_client):
        """TC-1.1.5: Negative max_tokens returns 400."""
        with patch("main.client") as mock_anthropic:
            resp = post_chat(flask_client, max_tokens=-100)

        assert resp.status_code == 400
        data = resp.get_json()
        assert "positive integer" in data["error"]
        mock_anthropic.messages.create.assert_not_called()

    def test_tc_1_1_6_float_max_tokens_returns_400(self, flask_client):
        """TC-1.1.6: max_tokens as float returns 400."""
        payload = {"message": "hi", "model": "claude-sonnet-4-6", "max_tokens": 1024.5}
        with patch("main.client") as mock_anthropic:
            resp = flask_client.post(
                "/api/chat",
                data=json.dumps(payload),
                content_type="application/json",
            )

        assert resp.status_code == 400
        data = resp.get_json()
        assert data["error"] == "max_tokens must be a positive integer."
        mock_anthropic.messages.create.assert_not_called()

    def test_tc_1_1_7_string_max_tokens_returns_400(self, flask_client):
        """TC-1.1.7: max_tokens as string returns 400."""
        payload = {"message": "hi", "model": "claude-sonnet-4-6", "max_tokens": "abc"}
        with patch("main.client") as mock_anthropic:
            resp = flask_client.post(
                "/api/chat",
                data=json.dumps(payload),
                content_type="application/json",
            )

        assert resp.status_code == 400
        data = resp.get_json()
        assert "positive integer" in data["error"]
        mock_anthropic.messages.create.assert_not_called()

    def test_tc_1_1_8_missing_max_tokens_defaults_to_1024(self, flask_client):
        """TC-1.1.8: Missing max_tokens defaults to DEFAULT_MAX_TOKENS (1024)."""
        with patch("main.client") as mock_anthropic:
            mock_anthropic.messages.create.return_value = make_mock_response()
            resp = flask_client.post(
                "/api/chat",
                data=json.dumps({"message": "hi", "model": "claude-sonnet-4-6"}),
                content_type="application/json",
            )

        assert resp.status_code == 200
        assert get_create_max_tokens(mock_anthropic) == DEFAULT_MAX_TOKENS

    def test_tc_1_1_9_unknown_model_returns_400(self, flask_client):
        """TC-1.1.9: Unknown model ID returns 400 with descriptive error."""
        payload = {"message": "hi", "model": "claude-unknown-99", "max_tokens": 1000}
        with patch("main.client") as mock_anthropic:
            resp = flask_client.post(
                "/api/chat",
                data=json.dumps(payload),
                content_type="application/json",
            )

        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data
        error_lower = data["error"].lower()
        assert "unknown" in error_lower or "model" in error_lower
        mock_anthropic.messages.create.assert_not_called()

    def test_tc_1_1_10_tampered_max_tokens_exceeds_ceiling(self, flask_client):
        """TC-1.1.10: Tampered max_tokens beyond haiku ceiling is rejected server-side."""
        ceiling = MODELS["claude-haiku-4-5"]["max_tokens"]
        with patch("main.client") as mock_anthropic:
            resp = post_chat(flask_client, model="claude-haiku-4-5", max_tokens=999999)

        assert resp.status_code == 400
        assert 999999 > ceiling  # confirm this is actually a ceiling violation
        mock_anthropic.messages.create.assert_not_called()


class TestGroup12SuccessPath:
    """Group 1.2 — /api/chat Success Path — max_tokens Forwarded Correctly"""

    def test_tc_1_2_1_validated_max_tokens_passed_to_api(self, flask_client):
        """TC-1.2.1: Validated max_tokens value is forwarded to Anthropic API."""
        with patch("main.client") as mock_anthropic:
            mock_anthropic.messages.create.return_value = make_mock_response()
            resp = post_chat(flask_client, max_tokens=2000)

        assert resp.status_code == 200
        assert get_create_max_tokens(mock_anthropic) == 2000

    def test_tc_1_2_2_model_ceilings_are_independent(self, flask_client):
        """TC-1.2.2: Ceilings are per-model — 100000 is valid for Opus but invalid for Sonnet."""
        # claude-opus-4-8 ceiling is 128000 → 100000 should pass
        with patch("main.client") as mock_anthropic:
            mock_anthropic.messages.create.return_value = make_mock_response()
            resp_opus = post_chat(flask_client, model="claude-opus-4-8", max_tokens=100000)
        assert resp_opus.status_code == 200

        # claude-sonnet-4-6 ceiling is 64000 → 100000 should fail
        with patch("main.client") as mock_anthropic:
            resp_sonnet = post_chat(flask_client, model="claude-sonnet-4-6", max_tokens=100000)
        assert resp_sonnet.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# Module 2: Frontend Validation (JavaScript)
# Skipped: requires a headless browser runtime (Playwright / Selenium).
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.skip(reason="JS/DOM tests require a headless browser (Playwright or Selenium)")
class TestGroup21FrontendInputValidation:
    """Group 2.1 — Client-side max-tokens input validation on change."""

    def test_tc_2_1_1_valid_value_no_error(self): ...
    def test_tc_2_1_2_exceeds_ceiling_shows_error(self): ...
    def test_tc_2_1_3_zero_shows_error(self): ...
    def test_tc_2_1_4_negative_shows_error(self): ...
    def test_tc_2_1_5_non_numeric_shows_error(self): ...
    def test_tc_2_1_6_empty_shows_error(self): ...
    def test_tc_2_1_7_fractional_shows_error(self): ...
    def test_tc_2_1_8_leading_zeros_accepted(self): ...
    def test_tc_2_1_9_commas_rejected(self): ...


@pytest.mark.skip(reason="JS/DOM tests require a headless browser (Playwright or Selenium)")
class TestGroup22ModelSelectionChanges:
    """Group 2.2 — Ceiling re-validation when model selection changes."""

    def test_tc_2_2_1_higher_ceiling_re_enables_send(self): ...
    def test_tc_2_2_2_lower_ceiling_disables_send(self): ...
    def test_tc_2_2_3_switching_back_reenables_send(self): ...


@pytest.mark.skip(reason="JS/DOM tests require a headless browser (Playwright or Selenium)")
class TestGroup23DefaultValue:
    """Group 2.3 — Default max-tokens field value on page load."""

    def test_tc_2_3_1_prepopulated_with_1024(self): ...
    def test_tc_2_3_2_default_valid_for_default_model(self): ...
    def test_tc_2_3_3_reload_resets_to_default(self): ...


# ─────────────────────────────────────────────────────────────────────────────
# Module 3: API Request Integration
# ─────────────────────────────────────────────────────────────────────────────


class TestGroup31FrontendPayload:
    """Group 3.1 — Backend receives the correct max_tokens from the request body."""

    def test_tc_3_1_1_submit_includes_max_tokens_in_request(self, flask_client):
        """TC-3.1.1: max_tokens value from the request body reaches the Anthropic call."""
        with patch("main.client") as mock_anthropic:
            mock_anthropic.messages.create.return_value = make_mock_response()
            resp = post_chat(flask_client, max_tokens=3000)

        assert resp.status_code == 200
        assert get_create_max_tokens(mock_anthropic) == 3000

    def test_tc_3_1_2_invalid_max_tokens_no_anthropic_call(self, flask_client):
        """TC-3.1.2: Invalid max_tokens is rejected before the Anthropic API is called."""
        with patch("main.client") as mock_anthropic:
            resp = post_chat(flask_client, max_tokens=-1)

        assert resp.status_code == 400
        mock_anthropic.messages.create.assert_not_called()

    def test_tc_3_1_3_different_values_produce_different_calls(self, flask_client):
        """TC-3.1.3: Different max_tokens values each reach the server correctly."""
        for tokens in (1000, 5000):
            with patch("main.client") as mock_anthropic:
                mock_anthropic.messages.create.return_value = make_mock_response()
                resp = post_chat(flask_client, max_tokens=tokens)

            assert resp.status_code == 200
            assert get_create_max_tokens(mock_anthropic) == tokens


# ─────────────────────────────────────────────────────────────────────────────
# Bonus: calculate_cost unit tests
# ─────────────────────────────────────────────────────────────────────────────


class TestCalculateCost:
    """Verify calculate_cost() returns the correct USD cost."""

    def test_sonnet_cost(self):
        from main import calculate_cost
        # 1M input tokens at $3/M + 1M output at $15/M = $18
        cost = calculate_cost("claude-sonnet-4-6", 1_000_000, 1_000_000)
        assert cost == pytest.approx(18.0, rel=1e-6)

    def test_zero_tokens(self):
        from main import calculate_cost
        assert calculate_cost("claude-sonnet-4-6", 0, 0) == 0.0

    def test_opus_cost(self):
        from main import calculate_cost
        # 500k input at $15/M + 200k output at $25/M = $7.5 + $5 = $12.5
        cost = calculate_cost("claude-opus-4-8", 500_000, 200_000)
        assert cost == pytest.approx(12.5, rel=1e-6)
