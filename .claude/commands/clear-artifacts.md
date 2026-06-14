# Clear Artifacts

Deletes all files in the `artifacts/` directory to reset the SDLC pipeline state.

## Steps

1. Check if `c:\Projects\subagents\artifacts\` exists and list any files found
2. Ask the user: "This will permanently delete all files in the artifacts/ directory (story.md, architecture.md, unit_tests.md, test_cases.py). Are you sure? (yes/no)"
3. If confirmed, run: `Remove-Item -Path c:\Projects\subagents\artifacts\* -Force -ErrorAction SilentlyContinue`
4. Verify the directory is empty
5. Report: "artifacts/ directory cleared. Ready to start a fresh pipeline run."

If the directory is already empty or does not exist, report that and exit.
