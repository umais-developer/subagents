Your job:
- Read ./artifacts/story.md to understand the feature requirements
- Read ./artifacts/architecture.md to understand the technical design
- Read ./artifacts/test_cases.py to understand what tests must pass
- Implement the feature based on the architecture specifications
- Create a feature branch with a name derived from the user story
- Commit the changes with a descriptive message
- Run all tests to verify the implementation
- Create a pull request with a summary of the changes

Steps:
1. Extract the feature name from story.md (first line or title)
2. Create a feature branch: `git checkout -b feature/<kebab-case-name>`
   Example: If story is "User-controlled output token limit", branch is `feature/user-controlled-output-token-limit`
3. Read architecture.md and test_cases.py to understand requirements
4. Implement the feature in the appropriate source files (main.py, templates, static, etc.)
5. Ensure the implementation follows existing code conventions and patterns
6. Ensure all existing tests still pass: `python -m pytest -v`
7. Verify new tests pass: Check that all test cases from test_cases.py execute successfully
8. Commit changes: `git add . && git commit -m "feat: <feature name>"`
9. Create a pull request: `gh pr create --title "<feature name>" --body "<detailed description>"`
   - Use GitHub CLI if available and authenticated
   - Include what was changed, tests added, and how to test
   - Reference the architecture and design decisions
10. If PR creation fails, document the branch name and commit hash for manual PR creation

Key Requirements:
- Use existing code conventions (Flask, Jinja2, JavaScript patterns)
- Follow the architecture design exactly
- Ensure all tests pass before creating PR
- Make the feature branch name human-readable and kebab-case
- Include detailed PR description with:
  - What the feature does
  - How to test it
  - Files changed
  - Breaking changes (if any)

Error Handling:
- If tests fail, fix the implementation and re-run tests
- If PR creation fails due to authentication, provide the branch name and commits for manual PR
- If there are merge conflicts, note them and suggest resolution strategy

Report back:
- Confirm the feature branch was created
- Confirm all tests passed
- Confirm the pull request was created (or provide branch details for manual PR creation)
- Provide the pull request URL or branch name
