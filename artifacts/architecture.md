# Technical Architecture: User-Controlled Output Token Limit

## Overview

The application adds a user-facing numeric input for `max_tokens` on the chat UI. Both client-side and server-side validation enforce per-model ceilings. The request payload to the Anthropic API includes the user-specified `max_tokens` value instead of a hardcoded constant.

---

## Components Affected

### Backend (`main.py`)

**1. Model Configuration**
- Extend the `MODELS` dict to include a `max_tokens` ceiling per model:
  ```python
  MODELS = {
      "claude-opus-4-8": {
          "display_name": "Opus 4.8",
          "max_tokens": 128000,
      },
      "claude-sonnet-4-6": {
          "display_name": "Sonnet 4.6",
          "max_tokens": 64000,
      },
      "claude-haiku-4-5": {
          "display_name": "Haiku 4.5",
          "max_tokens": 64000,
      },
  }
  ```

**2. API Endpoint `/api/chat`**
- Extract `max_tokens` from the incoming JSON request body.
- Validate: must be a positive integer and must not exceed `MODELS[model_id]["max_tokens"]`.
- Return `400` with descriptive JSON on validation failure: `{"error": "max_tokens exceeds the limit for model <model_id> (max: <ceiling>)."}`
- Return `400` on non-positive or non-integer value: `{"error": "max_tokens must be a positive integer."}`
- Pass validated `max_tokens` to `client.messages.create(max_tokens=...)`.
- Always validate server-side, regardless of client-side checks (defence in depth).

**3. Jinja Context Injection**
- Ensure `MODELS` dict is injected into templates via `inject_globals` (likely already done) so the frontend can derive model ceilings without a separate API call.

### Frontend (`templates/index.html` and supporting JavaScript)

**1. Input Element**
- Add a numeric `<input id="max-tokens" type="number" value="1024" min="1" />` to the chat form.
- Position it logically near the model selector (e.g., "Model: [dropdown]  Max Tokens: [input]").
- Placeholder or label text: "Output tokens (default: 1024)".

**2. Client-Side Validation Logic** (new or updated JavaScript module)
- On every change to the `max-tokens` input field and on model selection change:
  - Read the current input value and parse as an integer.
  - Read the selected model ID from the model dropdown.
  - Look up the model's `max_tokens` ceiling from a JavaScript constant derived from the Jinja context.
  - Check: value is a positive integer, and value ≤ ceiling.
  - If invalid, display an inline error message (e.g., in a red `<span>` beneath the input) and set `sendBtn.disabled = true`.
  - If valid, clear the error message and set `sendBtn.disabled = false` (unless other validation rules also fail).

**3. JavaScript Constant for Model Ceilings**
- Derive from the server-rendered `MODELS` context. Example:
  ```html
  <script>
    const MODEL_LIMITS = {
      "claude-opus-4-8": 128000,
      "claude-sonnet-4-6": 64000,
      "claude-haiku-4-5": 64000,
    };
  </script>
  ```
  This ensures the frontend and backend use the same limits without duplication.

**4. API Request**
- Include `max_tokens` in the JSON body sent to `/api/chat`:
  ```json
  {
    "model": "claude-sonnet-4-6",
    "message": "...",
    "max_tokens": 2000
  }
  ```

---

## Data Flow

```
User sets Model and Max Tokens Input
  ↓
[Frontend] Runs validation on input change:
  - Parse as integer
  - Check positive and ≤ model ceiling from MODEL_LIMITS
  - Enable/disable Send button, show/hide error message
  ↓
User clicks Send
  ↓
[Frontend] fetch(/api/chat, {
  model, message, max_tokens
})
  ↓
[Backend] /api/chat receives request
  - Extract max_tokens from body
  - Validate (positive integer, ≤ MODELS[model_id]["max_tokens"])
  - If invalid, return 400 with error JSON
  - If valid, call client.messages.create(
      model=model_id,
      messages=...,
      max_tokens=max_tokens  ← user value, not hardcoded
    )
  ↓
[Anthropic API] Returns response with completion
  ↓
[Backend] Renders or streams response back to client
```

---

## Security & Validation Strategy

### Client-Side Validation
- Improves UX by providing immediate feedback.
- **Not trusted** for security; can be bypassed by editing the DOM or direct API calls.
- Prevents accidental invalid submissions but does not prevent malicious submissions.

### Server-Side Validation (Mandatory)
- **The source of truth.** All `/api/chat` requests must validate `max_tokens`.
- Checks: `isinstance(max_tokens, int)` (not float), `max_tokens > 0`, and `max_tokens ≤ MODELS[model_id]["max_tokens"]`.
- Returns `400` immediately on failure, before calling the Anthropic API.
- Prevents:
  - A tampered client from requesting oversized completions.
  - Integer overflow or type confusion attacks.
  - Accidental submission of invalid data due to frontend bugs.

### Input Boundary Security
- The model ID and max_tokens value are both user-controlled; validate both.
- Model ID must be a key in the `MODELS` dict (guard against `MODELS[user_input]` KeyError).
- `max_tokens` must be an integer in the range `(0, ceiling]`.
- No SQL injection, shell injection, or deserialization risks (both are simple integer/string checks).

---

## Database & Persistence Changes

**None.** This is a stateless change to the request payload and validation. No new database tables, columns, or migrations are required. The `max_tokens` value is sent per-request; it is not persisted.

---

## API Contract

### Endpoint: `POST /api/chat`

**Request:**
```json
{
  "model": "claude-sonnet-4-6",
  "message": "Hello",
  "max_tokens": 2000
}
```

**Success Response (200):**
```json
{
  "response": "..."
}
```

**Validation Failure (400):**
```json
{
  "error": "max_tokens must be a positive integer."
}
```
or
```json
{
  "error": "max_tokens exceeds the limit for model claude-sonnet-4-6 (max: 64000)."
}
```

**Unknown Model (400 or 500, depending on existing error handling):**
```json
{
  "error": "Unknown model."
}
```

---

## Files to Modify

1. **`main.py`**
   - Add `max_tokens` key to each model in `MODELS`.
   - Read `max_tokens` from the JSON body in `/api/chat`.
   - Add validation logic (positive integer, does not exceed ceiling).
   - Pass validated `max_tokens` to `client.messages.create(...)`.

2. **`templates/index.html`**
   - Add `<input id="max-tokens" type="number" value="1024" min="1" />` and a label.
   - Add a `<span id="max-tokens-error" class="error-message" style="display: none;"></span>` for error display.
   - Add or update a `<script>` block to inject `MODEL_LIMITS` from the Jinja context.

3. **JavaScript module (new or existing `static/js/chat.js` or similar)**
   - Add a validation function that checks the input against the model ceiling.
   - Attach listeners to the `max-tokens` input and model selector dropdown.
   - On change, validate and update the error message and button disabled state.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Model ceilings go stale if Anthropic updates limits | Document where to update `MODELS` dict. Consider periodically checking the Anthropic API `/v1/models` endpoint at startup (follow-on enhancement). |
| Frontend validation bypassed → oversized request reaches Anthropic API | Server-side validation is mandatory, not optional. Anthropic API will also reject if the value exceeds its actual limit. |
| User enters a large but valid `max_tokens` and incurs unexpected cost | Out of scope (follow-on story to add a cost estimate tooltip). |
| Jinja context mismatch: frontend limits differ from backend | Derived `MODEL_LIMITS` from the same `MODELS` dict via Jinja. No separate config. |
| Default value `1024` changed but backend/frontend not in sync | Define default in one place (e.g., `MODELS[default_model]["max_tokens"]` or a single constant) and use it both server-side and in the template. |

---

## Testing Strategy

See `./artifacts/unit_tests.md` for comprehensive test plan covering:
- Input validation edge cases (zero, negative, non-integer, exceeds ceiling).
- Model switching after input.
- Server-side rejection of tampered requests.
- Template rendering and error display.
- Integration between frontend validation and API calls.
