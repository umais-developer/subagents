---
name: clear-artifacts
description: "Clears all files in the artifacts/ directory, resetting the SDLC pipeline state. Use before starting a fresh pipeline run."
model: "Claude Sonnet 4.6 (copilot)"
tools: [read, edit, execute]
---

Check if the `c:\Projects\subagents\artifacts\` directory contains any files (`story.md`, `architecture.md`, `unit_tests.md`, `test_cases.py`).

- If the directory is empty or does not exist, report: "artifacts/ is already empty. Nothing to clear."
- If files exist, list them and ask the user: "This will permanently delete all files in artifacts/. Are you sure? (yes/no)"
- If confirmed, delete all files in the directory
- Verify the directory is empty afterwards
- Report: "artifacts/ directory cleared. Ready for a fresh pipeline run."
