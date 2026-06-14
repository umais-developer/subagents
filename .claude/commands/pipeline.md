# SDLC Pipeline

Structured feature development workflow using specialized agents.

## How It Works

The pipeline runs five stages in sequence, from feature request to code review:

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

5. **Stage 5 (Implementor)** — Implements feature, creates feature branch, and submits pull request
   - Agent: `implementor.md`
   - Model: **Claude Sonnet 4.6** (complex implementation decisions)
   - Output: Feature branch + Pull Request

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
- **Stage 5 uses Sonnet 4.6** — Required for complex implementation decisions, multi-file changes, and architectural considerations

This balances quality (Sonnet for complex analysis and implementation) with cost (Haiku for routine test code generation).

## Artifacts

Each stage produces documentation and/or code:

| Stage | Output | Contents |
|---|---|---|
| 1 | `artifacts/story.md` | User story with acceptance criteria, edge cases, risks |
| 2 | `artifacts/architecture.md` | Technical design: components, data flow, API changes, security/perf concerns |
| 3 | `artifacts/unit_tests.md` | Test plan: test cases by module, coverage goals |
| 4 | `artifacts/test_cases.py` | Runnable pytest code with fixtures and mocks |
| 5 | Feature branch + PR | Implementation code in feature branch, pull request submitted for review |

## Agent Definitions

See `.claude/agents/` for agent specifications:
- `story-refiner.md` — Product manager persona
- `architect.md` — Software architect persona
- `test-designer.md` — QA engineer persona
- `test-author.md` — Developer persona
- `implementor.md` — Full-stack developer persona

All agents include explicit file write/git operations with verification steps to ensure artifacts are created and changes are tracked.

## Workflow Implementation

The pipeline is implemented as a workflow script (`.claude/workflows/sdlc-pipeline.js`) that:
- Runs five agents in sequence with explicit model parameters
- Passes artifacts from one stage to the next
- Verifies each stage completes successfully
- Creates feature branch and pull request in final stage
- Returns a summary of produced artifacts and implementation status

Feature request: $ARGUMENTS