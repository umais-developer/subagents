export const meta = {
  name: 'sdlc-pipeline',
  description: 'SDLC pipeline: story → architecture → tests → implementation → PR',
  phases: [
    { title: 'Stage 1: Refine Story', detail: 'story-refiner agent on Sonnet' },
    { title: 'Stage 2: Architecture', detail: 'architect agent on Sonnet' },
    { title: 'Stage 3: Test Design', detail: 'test-designer agent on Sonnet' },
    { title: 'Stage 4: Write Tests', detail: 'test-author agent on Haiku' },
    { title: 'Stage 5: Implement', detail: 'implementor agent on Sonnet' },
  ],
}

/**
 * SDLC PIPELINE WORKFLOW
 *
 * Agent Configuration: See .claude/agents/config.json
 * Agent Prompts: See .claude/agents/prompts/*.md
 *
 * This workflow orchestrates the four-stage SDLC pipeline:
 * 1. story-refiner (Sonnet) - refine feature request → user story
 * 2. architect (Sonnet) - analyze story → architecture plan
 * 3. test-designer (Sonnet) - design tests → test plan
 * 4. test-author (Haiku) - implement tests → pytest code
 *
 * NOTE: Prompts are embedded below, but should be kept in sync with
 * .claude/agents/prompts/ files. When updating agent instructions,
 * update both locations.
 */

// Parse feature request from args
const featureRequest = args || ''
if (!featureRequest) {
  log('ERROR: No feature request provided. Pass the feature request as the pipeline argument.')
  return { error: 'No feature request provided' }
}

log(`Starting SDLC pipeline for feature: "${featureRequest.substring(0, 80)}${featureRequest.length > 80 ? '...' : ''}"`)

// ============================================================================
// STAGE 1: STORY REFINER
// Config: .claude/agents/config.json → story-refiner
// Prompt: .claude/agents/prompts/story-refiner.md
// ============================================================================
phase('Stage 1: Refine Story')
log('Running story-refiner agent on Claude Sonnet 4.6...')
const storyResult = await agent(
  `Your job:
- Read the raw feature request provided
- Produce a structured user story with acceptance criteria
- Format using Given/When/Then scenarios
- Identify edge cases and risks

Feature request: ${featureRequest}

Steps:
1. Analyze the raw feature request
2. Produce the structured user story with acceptance criteria
3. Use the Write tool to save to: c:\\uvproject\\artifacts\\story.md (absolute path, not relative)
4. After writing, verify the file was created: Get-Item c:\\uvproject\\artifacts\\story.md
5. If verification fails, try writing again

Be concise and precise. Do not invent requirements not implied by the input.

Report back: Confirm the file was successfully written before ending your response.`,
  {
    label: 'story-refiner',
    phase: 'Stage 1: Refine Story',
    subagent_type: 'story-refiner',
    model: 'sonnet',
  }
)

if (!storyResult) {
  log('Stage 1 failed - agent did not complete')
  return { error: 'Story refiner agent failed' }
}

log(`✓ Stage 1 complete`)

// ============================================================================
// STAGE 2: ARCHITECT
// Config: .claude/agents/config.json → architect
// Prompt: .claude/agents/prompts/architect.md
// ============================================================================
phase('Stage 2: Architecture')
log('Running architect agent on Claude Sonnet 4.6...')
const archResult = await agent(
  `Your job:
- Read ./artifacts/story.md
- Explore the codebase as needed to understand existing conventions
- Produce a technical architecture plan
- Include: components affected, data flow, API changes, database changes
- Flag any security or performance concerns

Steps:
1. Analyze the story and codebase
2. Draft the architecture plan
3. Use the Write tool to save to: c:\\uvproject\\artifacts\\architecture.md (absolute path, not relative)
4. After writing, use bash or read to verify the file was created: Get-Item c:\\uvproject\\artifacts\\architecture.md
5. If verification fails, try writing again

Base all decisions on existing codebase conventions visible in the project.

Report back: Confirm the file was successfully written before ending your response.`,
  {
    label: 'architect',
    phase: 'Stage 2: Architecture',
    subagent_type: 'architect',
    model: 'sonnet',
  }
)

if (!archResult) {
  log('Stage 2 failed - agent did not complete')
  return { error: 'Architect agent failed' }
}

log(`✓ Stage 2 complete`)

// ============================================================================
// STAGE 3: TEST DESIGNER
// Config: .claude/agents/config.json → test-designer
// Prompt: .claude/agents/prompts/test-designer.md
// ============================================================================
phase('Stage 3: Test Design')
log('Running test-designer agent on Claude Sonnet 4.6...')
const testDesignResult = await agent(
  `Your job:
- Read ./artifacts/architecture.md
- Read relevant source files to understand what needs testing
- Design a comprehensive unit test plan
- Cover happy paths, edge cases, and failure modes
- Group tests by component or module

Steps:
1. Analyze the architecture document and source files
2. Design the comprehensive test plan
3. Use the Write tool to save to: c:\\uvproject\\artifacts\\unit_tests.md (absolute path, not relative)
4. After writing, use bash or read to verify the file was created: Get-Item c:\\uvproject\\artifacts\\unit_tests.md
5. If verification fails, try writing again

Do not write test code — only the plan and test case descriptions.

Report back: Confirm the file was successfully written before ending your response.`,
  {
    label: 'test-designer',
    phase: 'Stage 3: Test Design',
    subagent_type: 'test-designer',
    model: 'sonnet',
  }
)

if (!testDesignResult) {
  log('Stage 3 failed - agent did not complete')
  return { error: 'Test designer agent failed' }
}

log(`✓ Stage 3 complete`)

// ============================================================================
// STAGE 4: TEST AUTHOR
// Config: .claude/agents/config.json → test-author
// Prompt: .claude/agents/prompts/test-author.md
// Uses Haiku (more efficient for code generation)
// ============================================================================
phase('Stage 4: Write Tests')
log('Running test-author agent on Claude Haiku 4.5...')
const testCodeResult = await agent(
  `Your job:
- Read ./artifacts/unit_tests.md
- Read relevant source files to match project conventions
- Write full pytest implementations for every test case
- Include fixtures, mocks, and assertions
- Run the tests with bash to verify they execute without errors

Steps:
1. Read the test plan and source files
2. Write complete, runnable pytest code with all fixtures and mocks
3. Use the Write tool to save to: c:\\uvproject\\artifacts\\test_cases.py (absolute path, not relative)
4. After writing, verify the file was created: Get-Item c:\\uvproject\\artifacts\\test_cases.py
5. Run the tests: cd c:\\uvproject && python -m pytest artifacts\\test_cases.py -v
6. If tests fail, fix and re-write the file
7. If file creation fails, try writing again

Generate complete, runnable code. Do not leave placeholders or TODOs.

Report back: Confirm the file was successfully written and the tests ran before ending your response.`,
  {
    label: 'test-author',
    phase: 'Stage 4: Write Tests',
    subagent_type: 'test-author',
    model: 'haiku',
  }
)

if (!testCodeResult) {
  log('Stage 4 failed - agent did not complete')
  return { error: 'Test author agent failed' }
}

log(`✓ Stage 4 complete`)

// ============================================================================
// STAGE 5: IMPLEMENTOR
// Config: .claude/agents/config.json → implementor
// Prompt: .claude/agents/prompts/implementor.md
// Creates feature branch, implements code, runs tests, creates PR
// ============================================================================
phase('Stage 5: Implement')
log('Running implementor agent on Claude Sonnet 4.6...')
const implementationResult = await agent(
  `Your job:
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
2. Create a feature branch: git checkout -b feature/<kebab-case-name>
   Example: If story is "User-controlled output token limit", branch is feature/user-controlled-output-token-limit
3. Read architecture.md and test_cases.py to understand requirements
4. Implement the feature in the appropriate source files (main.py, templates, static, etc.)
5. Ensure the implementation follows existing code conventions and patterns
6. Ensure all existing tests still pass: python -m pytest -v
7. Verify new tests pass: Check that all test cases from test_cases.py execute successfully
8. Commit changes: git add . && git commit -m "feat: <feature name>"
9. Create a pull request: gh pr create --title "<feature name>" --body "<detailed description>"
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
- Provide the pull request URL or branch name`,
  {
    label: 'implementor',
    phase: 'Stage 5: Implement',
    subagent_type: 'implementor',
    model: 'sonnet',
  }
)

if (!implementationResult) {
  log('Stage 5 failed - agent did not complete')
  return { error: 'Implementor agent failed' }
}

log(`✓ Stage 5 complete`)

// ============================================================================
// SUMMARY
// ============================================================================
log('✓ SDLC pipeline completed successfully')

return {
  status: 'success',
  artifacts: [
    'artifacts/story.md (user story with acceptance criteria)',
    'artifacts/architecture.md (technical design)',
    'artifacts/unit_tests.md (test plan)',
    'artifacts/test_cases.py (pytest implementation)',
  ],
  implementation: 'Feature branch created with PR',
  config: '.claude/agents/config.json',
  prompts: '.claude/agents/prompts/',
  message: 'All 5 stages complete. Feature branch created and PR submitted. Review code and run tests locally before merging.',
}
