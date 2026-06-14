# SDLC Pipeline Agents

This directory contains the configuration and specifications for the four-stage SDLC (Software Development Lifecycle) pipeline that orchestrates feature development from raw request to tested code.

## Directory Structure

```
.claude/agents/
├── README.md                 ← This file
├── config.json               ← Central configuration for all agents
├── *.md                      ← Agent documentation and specifications
│   ├── story-refiner.md
│   ├── architect.md
│   ├── test-designer.md
│   └── test-author.md
└── prompts/                  ← Individual prompt files (single source of truth)
    ├── story-refiner.md
    ├── architect.md
    ├── test-designer.md
    └── test-author.md
```

## Configuration

### `config.json`

Central source of truth for agent configuration. Defines for each agent:

- **name** — Agent identifier (kebab-case)
- **model** — Claude model to use (sonnet or haiku)
- **tools** — Available tools (read, write, bash)
- **description** — One-line summary
- **persona** — The role the agent plays
- **prompt_file** — Path to the agent's prompt

**Example:**
```json
{
  "story-refiner": {
    "name": "story-refiner",
    "model": "sonnet",
    "tools": ["read", "write", "bash"],
    "description": "Refines raw feature requests into structured user stories.",
    "persona": "You are a senior product manager and story refiner.",
    "prompt_file": "prompts/story-refiner.md"
  }
}
```

## Prompts

Agent prompts are stored individually in `prompts/` directory. Each file contains:

- The core instructions for the agent
- Steps to follow
- File write and verification procedures
- Reporting requirements

**Why separated prompts?**
- Single source of truth (no duplication in workflows)
- Easy to update agent instructions without touching workflow code
- Clear visibility into what each agent does
- Foundation for future enhancement where workflows can read these files

## Agent Definitions (.md files)

The `.md` files in this directory (story-refiner.md, architect.md, etc.) serve as:

1. **Documentation** — Explain what the agent does and why
2. **Specifications** — Define responsibilities and constraints
3. **References** — Link to config.json and prompts/ for the actual configuration and prompts
4. **Guidelines** — Clarify key constraints and behaviors

These are **NOT the source of truth for prompts** — see `prompts/` directory for that.

## The Five Agents

### Stage 1: Story Refiner

**Model:** Claude Sonnet 4.6  
**Input:** Raw feature request  
**Output:** `artifacts/story.md`  
**Purpose:** Convert unstructured feature request into formal user story with acceptance criteria

**Key responsibilities:**
- Parse feature request
- Produce structured user story (Given/When/Then format)
- Identify edge cases and risks
- Write to disk with verification

---

### Stage 2: Architect

**Model:** Claude Sonnet 4.6  
**Input:** `artifacts/story.md` + codebase exploration  
**Output:** `artifacts/architecture.md`  
**Purpose:** Analyze story and codebase to design technical implementation

**Key responsibilities:**
- Read and understand user story
- Explore existing code conventions
- Design architecture (components, data flow, APIs, DB changes)
- Flag security and performance concerns
- Write to disk with verification

---

### Stage 3: Test Designer

**Model:** Claude Sonnet 4.6  
**Input:** `artifacts/architecture.md` + source files  
**Output:** `artifacts/unit_tests.md`  
**Purpose:** Design comprehensive unit test plan (NOT write code)

**Key responsibilities:**
- Read architecture specification
- Understand what needs testing
- Design test plan organized by module/component
- Describe test cases (happy paths, edge cases, failures)
- Define coverage goals
- Write to disk with verification

---

### Stage 4: Test Author

**Model:** Claude Haiku 4.5  
**Input:** `artifacts/unit_tests.md` + source files  
**Output:** `artifacts/test_cases.py`  
**Purpose:** Write complete, runnable pytest implementations

**Key responsibilities:**
- Read test design document
- Match project conventions in source files
- Write complete pytest code (fixtures, mocks, assertions)
- Run tests and fix failures
- Write to disk with verification

**Note:** Uses Haiku (more efficient than Sonnet) since test code generation is straightforward/formulaic once the design is clear.

---

### Stage 5: Implementor

**Model:** Claude Sonnet 4.6  
**Input:** `artifacts/story.md` + `artifacts/architecture.md` + `artifacts/test_cases.py` + codebase  
**Output:** Feature branch + Pull Request  
**Purpose:** Implement the feature end-to-end and submit for code review

**Key responsibilities:**
- Read and understand the user story, architecture, and test specifications
- Implement the feature in source code (main.py, templates, static, etc.)
- Follow existing code conventions and patterns
- Create a feature branch with kebab-case name from story title
- Run all tests to verify implementation
- Commit changes with descriptive message
- Create a pull request with detailed description
- Handle errors and provide fallback information (branch name for manual PR)

**Git workflow:**
1. Create feature branch: `git checkout -b feature/kebab-case-name`
2. Implement feature code
3. Run tests: `python -m pytest -v`
4. Commit: `git commit -m "feat: description"`
5. Create PR: `gh pr create --title "..." --body "..."`

**Key characteristics:**
- Uses Sonnet (capable, complex decisions) for code implementation
- Requires git repository and proper branch setup
- GitHub CLI optional (provides fallback if not available)
- Completes the full feature development cycle
- Moves feature from design/testing to code review stage

---

## How Agents Are Used

### By the Workflow

The workflow (`.claude/workflows/sdlc-pipeline.js`) orchestrates all four agents:

1. Reads the feature request from args
2. Spawns each agent with:
   - **subagent_type:** matches the agent name
   - **model:** from config.json
   - **prompt:** embedded (pulled from prompts/ files)
   - **phase:** for UI progress tracking

```javascript
const result = await agent(prompt, {
  label: 'story-refiner',
  subagent_type: 'story-refiner',
  model: 'sonnet',  // From config.json
  phase: 'Stage 1: Refine Story',
})
```

**Why prompts are embedded:** Workflows can't read files directly (no file I/O in workflow runtime). This is a current limitation of the workflow system.

### By Claude Code

When you invoke an agent directly in Claude Code, you specify:

```javascript
Agent({
  subagent_type: 'story-refiner',  // Uses agent definition
  prompt: 'Your custom prompt',
})
```

Claude Code reads the agent definition (story-refiner.md) to get the configured model and tools, but you provide your own prompt.

## Updating Agent Instructions

To update how an agent behaves:

1. **Update the prompt:** Edit `prompts/story-refiner.md` (etc.)
2. **Update the workflow:** Also update the embedded prompt in `.claude/workflows/sdlc-pipeline.js` (keep them in sync)
3. **Update the spec:** Update the `.md` file to document the change
4. **Update config if needed:** Edit `config.json` if model or tools change

**Future enhancement:** Once Claude Code workflows can read files, the workflow will automatically read from `prompts/` and this manual sync step won't be necessary.

## Adding a New Agent

To add a fifth agent to the pipeline:

1. **Add to config.json:**
   ```json
   "my-agent": {
     "name": "my-agent",
     "model": "sonnet",
     "tools": ["read", "write"],
     "description": "What it does",
     "persona": "The role it plays",
     "prompt_file": "prompts/my-agent.md"
   }
   ```

2. **Create prompt file:** `prompts/my-agent.md` with instructions

3. **Create spec file:** `my-agent.md` documenting responsibilities

4. **Update workflow:** Add a stage to `.claude/workflows/sdlc-pipeline.js`

5. **Update pipeline command:** Add to `.claude/commands/pipeline.md`

## Reference

- **Workflow:** `.claude/workflows/sdlc-pipeline.js`
- **Pipeline command:** `.claude/commands/pipeline.md`
- **CLAUDE.md:** Project development guide with workflow explanation
- **README.md:** Project overview

## Notes

- All agents write to `artifacts/` with absolute paths (not relative)
- All agents verify file creation before reporting success
- All agents are designed to be reusable (not one-time-only)
- Model selections (Sonnet for analysis, Haiku for code) balance quality vs. cost
- Prompts emphasize clear instructions and file write verification
