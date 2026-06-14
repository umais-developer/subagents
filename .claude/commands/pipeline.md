# SDLC Pipeline

Structured feature development workflow using specialized agents.

## How It Works

The pipeline runs four stages in sequence:

1. **Stage 1 (Story Refiner)** — Converts raw feature request into structured user story
   - Agent: `story-refiner.md`
   - Model: **Claude Sonnet 4.6** (comprehensive narrative work)
   - Output: `artifacts/story.md`

2. **Stage 2 (Architect)** — Analyzes story and codebase, produces technical design
   - Agent: `architect.md`
   - Model: **Claude Sonnet 4.6** (complex analysis and design)
   - Output: `artifacts/architecture.md`

3. **Stage 3 (Test Designer)** — Designs comprehensive unit test plan
   - Agent: `test-designer.md`
   - Model: **Claude Sonnet 4.6** (structured planning)
   - Output: `artifacts/unit_tests.md`

4. **Stage 4 (Test Author)** — Writes actual pytest code and runs tests
   - Agent: `test-author.md`
   - Model: **Claude Haiku 4.5** (efficient code generation)
   - Output: `artifacts/test_cases.py`

## Usage

```bash
# Run the pipeline with a feature request
/pipeline "Add user-controlled output token limit with per-model ceiling enforcement"
```

OR use the workflow directly:

```bash
# Using the workflow script (recommended - explicit model control)
# In Claude Code: Workflow({name: 'sdlc-pipeline', args: 'Your feature request here'})
```

## Model Selection

- **Stages 1-3 use Sonnet 4.6** — More capable for narrative work, architecture analysis, and test planning
- **Stage 4 uses Haiku 4.5** — Efficient for straightforward code generation (test writing is formulaic)

This balances quality (Sonnet for complex analysis) with cost (Haiku for routine code generation).

## Artifacts

Each stage produces a markdown or Python file in `./artifacts/`:

| Stage | Output File | Contents |
|---|---|---|
| 1 | `story.md` | User story with acceptance criteria, edge cases, risks |
| 2 | `architecture.md` | Technical design: components, data flow, API changes, security/perf concerns |
| 3 | `unit_tests.md` | Test plan: test cases by module, coverage goals |
| 4 | `test_cases.py` | Runnable pytest code with fixtures and mocks |

## Agent Definitions

See `.claude/agents/` for agent prompts:
- `story-refiner.md` — Product manager persona
- `architect.md` — Software architect persona
- `test-designer.md` — QA engineer persona
- `test-author.md` — Developer persona

All agents include explicit file write instructions with verification steps to ensure artifacts are persisted to disk.

## Workflow Implementation

The pipeline is implemented as a workflow script (`.claude/workflows/sdlc-pipeline.js`) that:
- Runs agents in sequence with explicit model parameters
- Passes artifacts from one stage to the next
- Verifies each stage completes successfully
- Returns a summary of produced artifacts

Feature request: $ARGUMENTS