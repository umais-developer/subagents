# User Story: User-Controlled Output Token Limit with Per-Model Cap Enforcement

## Summary

As a user of the Claude Chat application, I want to specify how many output tokens the model may generate for my messages, so I can control response length and cost — but I need the application to prevent me from entering a value that exceeds the selected model's hard limit, or from entering invalid input such as a negative number or non-numeric text.

---

## Context

The current application (`main.py`) sends all requests with a hardcoded `max_tokens=1024`. The UI exposes model selection but no token limit input. This story adds a numeric input field to the chat UI that feeds into the `max_tokens` parameter of the API call, with client-side and server-side validation enforcing per-model ceilings.

**Known model limits (from Anthropic API):**

| Model ID | `max_tokens` ceiling |
|---|---|
| `claude-opus-4-8` | 128,000 |
| `claude-sonnet-4-6` | 64,000 |
| `claude-haiku-4-5` | 64,000 |

These limits must be defined in `MODELS` in `main.py` and mirrored in the frontend so both layers can enforce them without a round-trip.

---

## User Story

**As** a user of the Claude Chat application,
**I want** to enter a custom maximum output token count before sending a message,
**So that** I have control over response length and cost.

---

## Acceptance Criteria

### Scenario 1: Valid token value within model limit

**Given** the user has selected a model (e.g., `claude-sonnet-4-6`, ceiling 64,000)
**And** the user has typed a message
**When** the user enters `2000` in the max tokens field
**Then** the Send button remains enabled
**And** the request is submitted with `max_tokens=2000`
**And** the assistant reply appears normally.

---

### Scenario 2: Value exceeds the selected model's ceiling

**Given** the user has selected `claude-haiku-4-5` (ceiling 64,000)
**When** the user enters `70000` in the max tokens field
**Then** the Send button is disabled immediately (client-side)
**And** a clear inline error message is displayed, stating the maximum allowed value for the selected model (e.g., "claude-haiku-4-5 supports at most 64,000 output tokens.")
**And** no API request is sent.

---

### Scenario 3: Value is zero or negative

**Given** the user has entered `0` or `-500` in the max tokens field
**When** the value is evaluated
**Then** the Send button is disabled
**And** an inline error message is displayed (e.g., "Output tokens must be a positive integer.")
**And** no API request is sent.

---

### Scenario 4: Value is not a number

**Given** the user has typed `abc` or left the field empty
**When** the value is evaluated
**Then** the Send button is disabled
**And** an inline error message is displayed (e.g., "Please enter a valid number.")
**And** no API request is sent.

---

### Scenario 5: Model is changed after a valid token value is entered

**Given** the user has entered `60000` (valid for `claude-sonnet-4-6`, ceiling 64,000)
**When** the user switches the model to `claude-opus-4-8` (ceiling 128,000)
**Then** the current value `60000` remains valid and the Send button stays enabled
**When** the user then switches to a hypothetical future model with a lower ceiling that would make the entered value invalid
**Then** the field re-validates immediately and shows the appropriate error without requiring a re-type.

---

### Scenario 6: Server-side rejection of out-of-range value

**Given** a request reaches `/api/chat` with `max_tokens` exceeding the server-side model ceiling (e.g., due to a tampered client)
**When** the server validates the value
**Then** a `400` response is returned with a JSON body containing `{"error": "max_tokens exceeds the limit for model <model_id> (max: <ceiling>)."}`
**And** no Anthropic API call is made.

---

### Scenario 7: Server-side rejection of non-positive or non-integer value

**Given** a request reaches `/api/chat` with `max_tokens` of `0`, a negative integer, or a non-integer
**When** the server validates the value
**Then** a `400` response is returned with `{"error": "max_tokens must be a positive integer."}`
**And** no Anthropic API call is made.

---

### Scenario 8: Default value on page load

**Given** the page loads fresh
**Then** the max tokens field is pre-populated with a sensible default (e.g., `1024`)
**And** the default is within the ceiling of the default model (`claude-sonnet-4-6`, ceiling 64,000)
**And** the Send button is enabled.

---

## Implementation Notes

### Backend (`main.py`)

1. Add a `max_tokens` key to each entry in `MODELS` (e.g., `"max_tokens": 64000`).
2. In `api_chat`, read `max_tokens` from the JSON body.
3. Validate: must be a positive integer and must not exceed `MODELS[model_id]["max_tokens"]`. Return `400` with a descriptive error if either check fails.
4. Pass the validated value to `client.messages.create(max_tokens=...)`.

### Frontend (`templates/index.html`)

1. Add a numeric `<input>` element for max tokens, with the default value `1024`.
2. On input and on model selection change, run inline validation:
   - Parse the field value as an integer.
   - Check it is a positive integer.
   - Check it does not exceed the ceiling for the currently selected model.
3. Display an inline error message directly beneath the field when validation fails.
4. Toggle `sendBtn.disabled` based on validation state.
5. Include the model ceilings as a JavaScript constant derived from the server-rendered `models` context variable so frontend and backend stay in sync.
6. Pass `max_tokens` in the JSON body of the `/api/chat` fetch call.

---

## Edge Cases

| Scenario | Expected Behaviour |
|---|---|
| User types fractional number (e.g., `1024.5`) | Treated as invalid; error shown ("must be a positive integer"). Server also rejects via `isinstance` check. |
| User types a number with leading zeros (e.g., `01024`) | Parse as integer 1024; valid if within ceiling. |
| User pastes a number with commas (e.g., `1,024`) | Invalid (non-numeric after stripping); show error. Do not silently coerce. |
| Field is cleared entirely | Treated as invalid ("Please enter a valid number."); Send button disabled. |
| Model list grows (new model added to `MODELS`) | No code change needed in UI if ceiling is injected via the Jinja context; ceiling automatically available. |
| `max_tokens` value at exactly the model ceiling | Valid; allowed. |
| `max_tokens` value of `1` | Valid positive integer; allowed. |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Model ceilings change in the Anthropic API without updating `MODELS` | Low–Medium | User can submit values the API will then reject with a `400` | Source ceilings from the `/v1/models` API at startup or add a comment in code marking where to update on model upgrades. |
| Frontend-only validation bypassed via direct API call | Medium | API call with oversized `max_tokens` reaches Anthropic; Anthropic returns its own error | Server-side validation (Scenario 6 and 7) is mandatory, not optional. |
| User enters a very large valid number and incurs unexpected cost | Medium | Higher API costs per request | Out of scope for this story, but a warning tooltip showing estimated cost range is a natural follow-on. |
| Default value of `1024` feels arbitrary to users | Low | Mild confusion | Document in a tooltip or placeholder text (e.g., "Tokens: default 1024"). |
| Jinja context injection of model ceilings creates a tight coupling between `main.py` and the template | Low | Maintenance burden if models are restructured | `MODELS` dict is already injected via `inject_globals`; adding `max_tokens` to the same dict keeps the coupling minimal. |

---

## Out of Scope

- Changing the input token limit (not a user-facing parameter in the Anthropic API).
- Displaying a real-time cost estimate based on the entered `max_tokens` value (follow-on story).
- Persisting the user's preferred `max_tokens` value across sessions.
- Streaming responses (not currently implemented in this project).
