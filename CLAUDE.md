# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Flask-based chat application that integrates with Anthropic's Claude AI models (Opus 4.8, Sonnet 4.6, Haiku 4.5). Users can:
- Have multi-turn conversations with selected Claude models
- View token usage and cost per request
- Clear conversation history
- Select between different model tiers with real-time pricing

The app uses Flask sessions to persist conversation history client-side, avoiding backend storage of messages.

## Architecture

### Backend (`main.py`)

**Three core routes:**

1. **`GET /`** — Renders the chat UI with current conversation history from the session
2. **`POST /api/chat`** — Accepts user message + model selection, calls Claude API, returns reply + token metrics (input/output tokens, cost)
3. **`POST /api/clear`** — Clears the session's message history

**Key components:**

- `MODELS` dict — Pricing (input/output per million tokens) and labels for each Claude model; injected into templates via `inject_globals()`
- `calculate_cost()` — Computes USD cost from token counts and model pricing
- Session management — Stores `messages` list (message history) in Flask session

**Error handling:** Catches Anthropic API exceptions and returns 502 with error details. On error, removes the user message that triggered the failure to keep the session consistent.

### Frontend

**Templates** (`templates/`):
- `base.html` — Layout boilerplate; includes Bootstrap CSS, marked.js (markdown parser), and navigation
- `index.html` — Chat UI; extends base.html with conversation div, message input, model selector, buttons (Send, Clear)

**Static assets** (`static/`):
- `css/styles.css` — Bootstrap-based theme (Start Bootstrap Business Casual)
- `css/custom.css` — Custom chat bubble styling and layout overrides
- `js/scripts.js` — Minimal setup (highlights current day on contact page; only used if contact page exists)
- Inline scripts in `index.html` handle chat logic: sending messages, rendering bubbles with markdown, token/cost display

**JavaScript chat flow:**
1. User types message and clicks Send
2. Fetch POST to `/api/chat` with message + selected model
3. On success, append assistant bubble with response text (parsed as markdown), token counts, and cost
4. On error, show error bubble
5. Shift+Enter sends, Enter alone adds newline (if implemented in form submission handler)

## Development Setup

### Prerequisites
- Python 3.13+
- `uv` package manager (recommended) or `pip`

### Initial Setup

```bash
# Clone and navigate to project
cd c:\uvproject

# Create virtual environment (if not using uv)
python -m venv .venv
.venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r <requirements if available> 
# OR
pip install anthropic>=0.109.1 flask>=3.1.3 python-dotenv>=1.2.2

# Set up environment variables
# Create .env file with:
# ANTHROPIC_API_KEY=sk-ant-...
# FLASK_SECRET_KEY=<optional, auto-generated if not set>
```

### Running the App

```bash
# Development server (debug mode enabled)
python main.py
# App runs on http://localhost:5000

# Production-like (no debug mode)
FLASK_ENV=production python main.py
```

### Testing

Currently no test suite. If adding tests:
- Recommended: `pytest` + `pytest-flask` for route testing
- Mock `anthropic.Anthropic` client to avoid live API calls
- Test `/api/chat` validation, error cases, and session handling

## SDLC Pipeline

The `.claude/agents/` directory contains agent definitions for a structured development workflow:

- **`story-refiner.md`** — Converts raw feature requests into structured user stories with acceptance criteria
- **`architect.md`** — Reads the story and codebase; produces technical architecture plan (components, data flow, API changes, security concerns)
- **`test-designer.md`** — Reads architecture; designs comprehensive unit test plan (no test code, just test case descriptions)
- **`test-author.md`** — Reads test plan; writes actual pytest code and runs tests

**Key constraint:** All agent prompts require explicit file writes with verification. Absolute paths are used (e.g., `c:\uvproject\artifacts\story.md`). Agents verify files exist after writing before concluding.

**Artifacts directory** (`./artifacts/`) — Stores pipeline outputs:
- `story.md` — Refined user story
- `architecture.md` — Technical architecture plan
- `unit_tests.md` — Test design document
- `test_cases.py` — Generated pytest code

To use the pipeline: run `/pipeline` skill with a feature request.

## Key Code Areas

### Model Pricing (`main.py` lines 13–30)

The `MODELS` dict is the single source of truth for pricing. Update here when Anthropic changes rates:

```python
MODELS = {
    "claude-opus-4-8": {
        "label": "Claude Opus 4.8",
        "input_per_m":  15.00,
        "output_per_m": 25.00,
    },
    # ...
}
```

### API Response Format (`main.py` lines 82–88)

The chat endpoint returns:
```json
{
  "reply": "...",
  "model": "Claude Sonnet 4.6",
  "input_tokens": 150,
  "output_tokens": 200,
  "cost_usd": 0.001234
}
```

Update this contract if frontend or backend metrics change.

### Session Management (`main.py` lines 45–76)

Conversation history is stored in `session["messages"]` as a list of `{"role": "user"|"assistant", "content": "..."}`. The app:
- Initializes the list on first request
- Appends user message before calling Claude API
- On API error, removes the user message to keep state clean
- Appends assistant reply after success
- Sets `session.modified = True` to persist to client session cookie

**Security note:** Flask session is encoded (not plaintext) but not encrypted by default. For production with sensitive conversations, use signed/encrypted sessions.

### Chat UI Logic (`templates/index.html` lines 54–99)

Inline JavaScript handles:
- Markdown rendering via `marked.parse()` for assistant messages
- Bubble rendering with role labels and metadata (tokens, cost)
- Auto-scroll to newest message

## Common Commands

```bash
# Start dev server
python main.py

# Check dependencies
pip list | grep -E "anthropic|flask|python-dotenv"

# Install/upgrade a dependency
pip install --upgrade anthropic

# Run linting (if linters are added)
flake8 main.py

# Run tests (if test suite is created)
pytest tests/ -v
```

## Environment Variables

- `ANTHROPIC_API_KEY` — **Required.** Anthropic API key for Claude access
- `FLASK_SECRET_KEY` — **Optional.** Secret key for session signing. If not set, Flask auto-generates a random key (fine for development; set explicitly for production)
- `FLASK_ENV` — Set to `production` to disable debug mode and auto-reload

## Performance & Limitations

- No persistent database; conversation history lives only in session (lost on browser close/clear cookies)
- Max tokens hardcoded to 1024 per request; future work should expose this as a user-controllable setting
- No rate limiting; users can spam requests
- Simple error messages returned from Claude API failures; not sanitized for display
- Markdown rendering on client-side; no server-side rendering of markdown

## Future Work

Common enhancements (as indicated by the pipeline setup):

1. **User-controlled output token limit** — Add max_tokens input field with per-model ceiling validation (server + client)
2. **Persistent message storage** — Add database (SQLite/PostgreSQL) and user authentication
3. **Conversation management** — Save/load/delete conversations; organize by date/topic
4. **System prompts** — Let users define custom system prompts
5. **Export conversations** — Download chat as markdown or PDF

## Debugging Tips

- **Flask debug mode:** Auto-reloads on file changes; errors shown in browser and console
- **Check session contents:** Add a debug route that returns `jsonify(dict(session))` to inspect stored messages
- **Mock Anthropic calls:** For testing without API quota, patch `client.messages.create` in your test client
- **Browser DevTools:** Network tab shows `/api/chat` request/response; check JSON structure
