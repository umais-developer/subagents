# Subagents: Flask Claude Chat with SDLC Pipeline

A Flask-based chat application that integrates with Anthropic's Claude AI models, featuring real-time token tracking, cost calculation, and an integrated SDLC (Software Development Lifecycle) pipeline for structured feature development.

## Overview

This project demonstrates two key concepts:

1. **A working chat application** — A production-ready Flask web app that interfaces with Claude AI (Opus, Sonnet, Haiku) with multi-turn conversations and token usage tracking.

2. **An SDLC pipeline** — A structured workflow using specialized AI agents to refine feature requests, design architecture, plan tests, and implement code.

## What's in This Repo

### Application Code
- **`main.py`** — Flask backend with three API routes: home page, chat endpoint, clear conversation
- **`templates/`** — Jinja2 HTML templates (base layout + chat UI)
- **`static/`** — CSS, JavaScript, and image assets (Bootstrap Business Casual theme)
- **`pyproject.toml`** — Python dependencies and project metadata

### Documentation
- **`CLAUDE.md`** — Comprehensive development guide for future Claude Code instances (architecture, setup, debugging)
- **`README.md`** — This file; project overview and quick start

### SDLC Pipeline
- **`.claude/agents/`** — Four agent definitions:
  - `story-refiner.md` — Converts feature requests into structured user stories
  - `architect.md` — Produces technical architecture plans
  - `test-designer.md` — Designs comprehensive unit test plans
  - `test-author.md` — Writes actual pytest implementations
- **`artifacts/`** — Output from the pipeline:
  - `story.md` — Refined user story for "user-controlled output token limit"
  - `architecture.md` — Technical design document
  - `unit_tests.md` — Test plan with 60+ test cases

### Configuration
- **`.gitignore`** — Excludes `.env`, `__pycache__`, virtual environments, IDE files, etc.
- **`.python-version`** — Python 3.13 requirement

## Quick Start

### Prerequisites
- Python 3.13+
- Anthropic API key ([get one here](https://console.anthropic.com/))

### Setup

```bash
# Clone the repo
git clone https://github.com/umais-developer/subagents.git
cd subagents

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # On Windows

# Install dependencies
pip install anthropic>=0.109.1 flask>=3.1.3 python-dotenv>=1.2.2

# Create .env file
echo ANTHROPIC_API_KEY=sk-ant-... > .env
```

### Run the App

```bash
python main.py
```

Visit **http://localhost:5000** in your browser.

## Features

✅ **Multi-turn conversations** — Maintain conversation history within a session  
✅ **Model selection** — Switch between Claude Opus, Sonnet, Haiku  
✅ **Token tracking** — See input/output tokens for each response  
✅ **Cost calculation** — Real-time USD cost display based on Anthropic pricing  
✅ **Markdown rendering** — Claude responses rendered with markdown support  
✅ **Clear history** — Reset conversation with one click  
✅ **Session persistence** — Browser-based conversation storage  

## Architecture

### Backend Flow

```
User Message
    ↓
POST /api/chat → validate input
    ↓
Call Claude API (anthropic.Anthropic.messages.create)
    ↓
Calculate tokens & cost
    ↓
Return {reply, model, input_tokens, output_tokens, cost_usd}
```

### Frontend Flow

```
User types message → Select model → Click Send
    ↓
Fetch /api/chat
    ↓
Parse response JSON
    ↓
Render chat bubble with markdown
    ↓
Display token count & cost
    ↓
Auto-scroll to bottom
```

### Session Management

Conversation history lives in Flask's session storage (client-side encrypted cookie). No backend database is used, so conversations are lost when the browser closes or cookies are cleared.

## SDLC Pipeline

This repo includes a structured feature development workflow. To use it:

```bash
# In Claude Code, run:
/pipeline
```

When prompted, provide a feature request (e.g., "Users should be able to control output token limit per model").

The pipeline then:

1. **Stage 1 (Story Refiner)** → Produces a structured user story with acceptance criteria
2. **Stage 2 (Architect)** → Analyzes codebase and designs technical architecture
3. **Stage 3 (Test Designer)** → Plans comprehensive unit tests
4. **Stage 4 (Test Author)** → Writes and executes pytest code

Each stage produces an artifact in `artifacts/`:
- `story.md` — User story
- `architecture.md` — Technical design
- `unit_tests.md` — Test plan
- `test_cases.py` — Runnable tests

## Example: Token Limit Feature

This repo includes a complete example of the pipeline in action. The feature request was:

> "Allow users to specify output tokens with per-model ceiling enforcement. Validate on both client and server. Block submission if value exceeds the model's max_tokens limit or is invalid (negative, non-numeric)."

The pipeline produced:
- A story with 8 acceptance criteria scenarios
- An architecture plan covering frontend validation, backend validation, security, and risks
- A test plan with 60+ test cases across 7 modules
- Generated pytest code ready to run

## Development

For detailed development guidance, see **[CLAUDE.md](CLAUDE.md)**, which covers:
- Complete architecture breakdown
- How to run, test, and debug
- Common commands
- Performance notes
- Future enhancements

### Key Files to Know

| File | Purpose |
|---|---|
| `main.py` | Flask app, routes, pricing logic |
| `templates/index.html` | Chat UI and inline JavaScript |
| `static/css/custom.css` | Chat bubble styles |
| `.claude/agents/` | Agent definitions for the SDLC pipeline |
| `artifacts/` | Pipeline-generated documentation |

## Future Work

Potential enhancements (as demonstrated by the pipeline):

1. **User-controlled max_tokens** — Expose output token limit as a user setting (planned architecture in `artifacts/`)
2. **Persistent storage** — Add SQLite/PostgreSQL backend for saving conversations
3. **User authentication** — Log in with email or OAuth
4. **System prompts** — Customize Claude's behavior with user-defined system prompts
5. **Export conversations** — Download chat history as markdown or PDF
6. **Rate limiting** — Prevent spam requests
7. **Conversation management** — Save/load/delete conversations

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | Anthropic API key for Claude access |
| `FLASK_SECRET_KEY` | ❌ No | Secret key for session signing (auto-generated if not set) |
| `FLASK_ENV` | ❌ No | Set to `production` to disable debug mode |

## Troubleshooting

**"API Key not found"**
- Ensure `.env` file exists with `ANTHROPIC_API_KEY=sk-ant-...`
- Check that the API key is valid on [console.anthropic.com](https://console.anthropic.com/)

**"Port 5000 already in use"**
- Change the port: `app.run(debug=True, port=5001)`

**"Session errors in Flask"**
- Clear browser cookies and reload
- Or use incognito/private browsing window

**"Markdown not rendering in chat"**
- Check that `marked.js` is loaded in `base.html`
- Open browser DevTools to see any JavaScript errors

## License

MIT License — See LICENSE file (if present) for details.

## Contributing

This is a reference implementation and SDLC pipeline demo. Feel free to:
- Fork and adapt for your own use
- Use the agent definitions as a template for other projects
- Submit improvements via pull requests

## Resources

- [Anthropic Claude API Docs](https://docs.anthropic.com/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Claude Models & Pricing](https://www.anthropic.com/pricing)
