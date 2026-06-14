# Unit Test Plan: User-Controlled Output Token Limit

## Testing Strategy

Tests verify client-side validation, server-side validation, and the integration between them. All external API calls (Anthropic) are mocked. Tests use `pytest` with `httpx` (async) for the FastAPI test client and vanilla assertions for JavaScript DOM testing (either via a headless browser or by mocking the DOM).

---

## Module 1: Backend Route Validation (`main.py`)

### Group 1.1 — `/api/chat` Endpoint — Input Validation (Server-Side)

**TC-1.1.1 — Valid `max_tokens` within model ceiling passes validation**
- POST `/api/chat` with `{"model": "claude-sonnet-4-6", "message": "hi", "max_tokens": 50000}`
- Mock Anthropic API to return a valid response
- Assert HTTP status is 200
- Assert Anthropic `client.messages.create()` is called with `max_tokens=50000`

**TC-1.1.2 — `max_tokens` equal to model ceiling passes validation**
- POST `/api/chat` with `max_tokens=64000` for `claude-sonnet-4-6` (exact ceiling)
- Assert HTTP status is 200

**TC-1.1.3 — `max_tokens` exceeding model ceiling returns 400**
- POST `/api/chat` with `max_tokens=65000` for `claude-sonnet-4-6` (ceiling 64000)
- Assert HTTP status is 400
- Assert JSON body contains `"error"` key with message including the model ID and ceiling
- Assert Anthropic API is never called

**TC-1.1.4 — `max_tokens` of 0 returns 400**
- POST `/api/chat` with `max_tokens=0`
- Assert HTTP status is 400
- Assert JSON body is `{"error": "max_tokens must be a positive integer."}`

**TC-1.1.5 — Negative `max_tokens` returns 400**
- POST `/api/chat` with `max_tokens=-100`
- Assert HTTP status is 400
- Assert error message matches `"max_tokens must be a positive integer."`

**TC-1.1.6 — `max_tokens` as float returns 400**
- POST `/api/chat` with `max_tokens=1024.5`
- Assert HTTP status is 400
- Assert error message is `"max_tokens must be a positive integer."`

**TC-1.1.7 — `max_tokens` as string returns 400**
- POST `/api/chat` with `max_tokens="abc"`
- Assert HTTP status is 400
- Assert error message matches positive integer requirement

**TC-1.1.8 — `max_tokens` missing from request body defaults to a safe value (if applicable) OR returns 400**
- POST `/api/chat` with no `max_tokens` field
- Assert either:
  - HTTP status is 400 with `"max_tokens is required"`, OR
  - HTTP status is 200 and a default value is used (document which approach)

**TC-1.1.9 — Unknown model ID returns 400**
- POST `/api/chat` with `{"model": "claude-unknown-99", "max_tokens": 1000}`
- Assert HTTP status is 400
- Assert error message indicates unknown model

**TC-1.1.10 — Tampered `max_tokens` from client is caught by server validation**
- POST `/api/chat` with `{"model": "claude-haiku-4-5", "max_tokens": 999999}`
- Assert HTTP status is 400
- Assert Anthropic API is never called (validation catches it before any external call)

---

### Group 1.2 — `/api/chat` Success Path — `max_tokens` Forwarded Correctly

**TC-1.2.1 — Validated `max_tokens` is passed to Anthropic API call**
- Spy on `client.messages.create()` call
- POST `/api/chat` with `max_tokens=2000`
- Mock Anthropic response
- Assert `client.messages.create(max_tokens=2000)` was called

**TC-1.2.2 — Different models use their respective ceilings**
- POST `/api/chat` with `max_tokens=100000` and model `claude-opus-4-8` (ceiling 128000) → expect 200
- POST same but with model `claude-sonnet-4-6` (ceiling 64000) → expect 400
- Confirms ceiling is model-specific, not global

---

## Module 2: Frontend Validation (JavaScript)

### Group 2.1 — Input Validation on Change

**TC-2.1.1 — Valid value (within ceiling) does not show error message**
- Set model to `claude-sonnet-4-6` (ceiling 64000)
- Enter `2000` in the max-tokens input
- Assert error message element is hidden or empty
- Assert Send button is enabled

**TC-2.1.2 — Value exceeding ceiling shows error message**
- Set model to `claude-sonnet-4-6` (ceiling 64000)
- Enter `70000` in the max-tokens input
- Assert error message is displayed with text including the model name and ceiling
- Assert Send button is disabled

**TC-2.1.3 — Zero shows error message**
- Enter `0` in the max-tokens input
- Assert error message is displayed (e.g., "must be a positive integer")
- Assert Send button is disabled

**TC-2.1.4 — Negative number shows error message**
- Enter `-500` in the max-tokens input
- Assert error message is displayed
- Assert Send button is disabled

**TC-2.1.5 — Non-numeric text shows error message**
- Enter `abc` in the max-tokens input
- Assert error message is displayed (e.g., "Please enter a valid number")
- Assert Send button is disabled

**TC-2.1.6 — Empty input (cleared field) shows error message**
- Clear the max-tokens input field
- Assert error message is displayed (e.g., "Please enter a valid number")
- Assert Send button is disabled

**TC-2.1.7 — Fractional input (e.g., `1024.5`) shows error message**
- Enter `1024.5` in the max-tokens input
- Assert error message is displayed (must be a positive integer)
- Assert Send button is disabled

**TC-2.1.8 — Leading zeros (e.g., `01024`) are accepted if the integer value is valid**
- Enter `01024` in the max-tokens input
- Assert parsed value is 1024 (within any model ceiling)
- Assert error message is not shown
- Assert Send button is enabled

**TC-2.1.9 — Number with commas (e.g., `1,024`) is rejected**
- Enter `1,024` in the max-tokens input
- Assert error message is displayed (non-numeric)
- Assert Send button is disabled

---

### Group 2.2 — Model Selection Changes

**TC-2.2.1 — Switching to model with higher ceiling enables Send button if previously disabled**
- Set model to `claude-haiku-4-5` (ceiling 64000)
- Enter `64000` (valid for Haiku, at the ceiling)
- Assert Send button is enabled
- Switch model to `claude-opus-4-8` (ceiling 128000)
- Assert Send button remains enabled (64000 is now well within the Opus ceiling)
- Assert no error message is shown

**TC-2.2.2 — Switching to model with lower ceiling disables Send button if value now exceeds new ceiling**
- Set model to `claude-opus-4-8` (ceiling 128000)
- Enter `100000` (valid for Opus)
- Assert Send button is enabled
- Switch model to `claude-sonnet-4-6` (ceiling 64000)
- Assert Send button is disabled
- Assert error message is shown with the new model's ceiling

**TC-2.2.3 — Switching back to original model re-enables Send button**
- From TC-2.2.2, switch back to `claude-opus-4-8`
- Assert Send button is re-enabled
- Assert error message is cleared

---

### Group 2.3 — Default Value on Page Load

**TC-2.3.1 — Max-tokens field is pre-populated with `1024` on page load**
- Load the chat page
- Assert `<input id="max-tokens">` has `value="1024"` (or equivalent initial value)

**TC-2.3.2 — Default value is valid for the default model on page load**
- Load the chat page (assuming default model is `claude-sonnet-4-6`)
- Assert Send button is enabled (default 1024 is within 64000 ceiling)
- Assert no error message is shown

**TC-2.3.3 — Reloading page resets field to default**
- Enter a custom value, refresh the page
- Assert field value is back to `1024`

---

## Module 3: API Request Integration

### Group 3.1 — Frontend Sends Correct Payload

**TC-3.1.1 — Submit button includes current `max_tokens` value in request**
- Set max-tokens to `3000`
- Spy on the `fetch()` call to `/api/chat`
- Click Send
- Assert the JSON body includes `"max_tokens": 3000`

**TC-3.1.2 — Frontend does not send request if Send button is disabled**
- Enter an invalid max-tokens value (e.g., negative)
- Assert Send button is disabled
- Click Send (or verify click handler is not attached)
- Assert no `fetch()` request is made

**TC-3.1.3 — Different `max_tokens` values produce different payloads**
- Send with `max_tokens=1000`
- Verify it reaches the server as 1000
- Send with `max_tokens=5000`
- Verify it reaches the server as 5000

---

## Module 4: Edge Cases and Boundary Conditions

### Group 4.1 — Boundary Values

**TC-4.1.1 — `max_tokens=1` (minimum positive) is accepted**
- Set max-tokens to `1`
- Assert Send button is enabled
- Assert no error message

**TC-4.1.2 — `max_tokens` at exactly the model ceiling is accepted**
- Set max-tokens to `64000` for `claude-sonnet-4-6`
- Assert Send button is enabled

**TC-4.1.3 — `max_tokens` one below model ceiling is accepted**
- Set max-tokens to `63999` for `claude-sonnet-4-6`
- Assert Send button is enabled

**TC-4.1.4 — `max_tokens` one above model ceiling is rejected**
- Set max-tokens to `64001` for `claude-sonnet-4-6`
- Assert Send button is disabled
- Assert error message is shown

**TC-4.1.5 — Very large valid value (e.g., 128000 for Opus) is accepted**
- Set model to `claude-opus-4-8`
- Set max-tokens to `128000`
- Assert Send button is enabled

---

### Group 4.2 — Unicode and Special Characters

**TC-4.2.1 — Numeric input field rejects non-ASCII number input**
- Type `१२३४` (Devanagari digits) in the max-tokens field
- Assert field either rejects the input or displays error
- (Browser behavior may vary; document the observed behavior)

---

### Group 4.3 — Rapid Input Changes

**TC-4.3.1 — Rapid input changes trigger re-validation correctly**
- Quickly type `999999`, then `5`, then `100`
- Assert Send button state reflects the final value (`100` is valid)
- Assert no stale error messages persist

---

## Module 5: Error Message Clarity

### Group 5.1 — User-Facing Error Messages

**TC-5.1.1 — Error message for exceeding ceiling mentions the model and the limit**
- Set max-tokens above the limit for `claude-sonnet-4-6`
- Assert error message contains "claude-sonnet-4-6" and "64000"

**TC-5.1.2 — Error message for non-positive value says "must be a positive integer"**
- Enter `0` or `-1`
- Assert error message contains "positive integer"

**TC-5.1.3 — Error message for non-numeric input says "valid number"**
- Enter `abc`
- Assert error message contains "valid number"

**TC-5.1.4 — Error message for empty input says "valid number"**
- Clear the field
- Assert error message contains "valid number"

---

## Module 6: Accessibility and Usability

### Group 6.1 — Form Element Attributes

**TC-6.1.1 — Max-tokens input has a proper `<label>` associated with it**
- Assert HTML contains `<label for="max-tokens">` or equivalent

**TC-6.1.2 — Error message element has appropriate ARIA attributes (if applicable)**
- Assert error `<span>` has `role="alert"` or `aria-live="polite"` to announce changes to screen readers

---

## Module 7: Server-Side Failure Modes

### Group 7.1 — Anthropic API Errors

**TC-7.1.1 — If Anthropic API rejects the `max_tokens` value, error is propagated gracefully**
- Mock Anthropic API to raise an error with a message about `max_tokens`
- POST `/api/chat` with a value the server validated but Anthropic rejects
- Assert error response is returned to the client without crashing the server

**TC-7.1.2 — Server validation error is returned before Anthropic API is called**
- Spy on Anthropic `client.messages.create()`
- POST `/api/chat` with `max_tokens` exceeding the ceiling
- Assert `client.messages.create()` is never called
- Assert 400 is returned immediately

---

## Test File Organization

```
tests/
  test_backend_validation.py    <- Groups 1.x, 7.x
  test_frontend_validation.py   <- Groups 2.x
  test_api_integration.py       <- Groups 3.x
  test_edge_cases.py            <- Groups 4.x
  test_error_messages.py        <- Groups 5.x
  test_accessibility.py         <- Groups 6.x
  conftest.py                   <- Shared fixtures
```

---

## Fixtures to Define in `conftest.py`

- **`client`** — `TestClient(app)` for FastAPI route testing
- **`mock_anthropic_client`** — Mock or patch of `anthropic.Anthropic` client
- **`valid_response`** — Default mock response from Anthropic
- **`model_limits_map`** — Dict mapping model IDs to ceilings for use in tests
- **`dom_setup`** — (For JavaScript tests) Function to inject a fresh chat form DOM with the required elements

---

## Coverage Goals

- **Lines of code** — 100% of validation logic
- **Branches** — All success and failure paths in validation
- **Edge cases** — All boundary values documented above
- **Integration** — Frontend call triggers server-side validation
- **Security** — Tampered request cannot bypass server-side validation

---

## Notes

1. Server-side validation is the true security boundary; it must never be skipped.
2. Client-side validation is for UX; all tests should verify it works but also confirm that the server has independent checks.
3. Error messages should be user-friendly and mention which model they're validating against.
4. The `MODEL_LIMITS` constant in JavaScript must be derived from the backend's `MODELS` dict to prevent drift.
