export const meta = {
  name: 'sdlc-pipeline',
  description: 'SDLC pipeline: refine story → architect → design tests → write tests',
  phases: [
    { title: 'Stage 1: Refine Story', detail: 'story-refiner agent on Sonnet' },
    { title: 'Stage 2: Architecture', detail: 'architect agent on Sonnet' },
    { title: 'Stage 3: Test Design', detail: 'test-designer agent on Sonnet' },
    { title: 'Stage 4: Write Tests', detail: 'test-author agent on Haiku' },
  ],
}

// Parse feature request from args
const featureRequest = args || ''
if (!featureRequest) {
  log('ERROR: No feature request provided. Pass the feature request as the pipeline argument.')
  return { error: 'No feature request provided' }
}

log(`Starting SDLC pipeline for feature: "${featureRequest.substring(0, 80)}${featureRequest.length > 80 ? '...' : ''}"`)

// Stage 1: Story Refiner (Sonnet)
phase('Stage 1: Refine Story')
log('Running story-refiner agent on Claude Sonnet 4.6...')
const storyResult = await agent(
  `Refine this feature request into a structured user story with acceptance criteria, edge cases, and risks.

Feature request: ${featureRequest}

Instructions:
- Produce a structured user story with acceptance criteria
- Format using Given/When/Then scenarios
- Identify edge cases and risks
- Save output to c:\\uvproject\\artifacts\\story.md using the Write tool (absolute path, not relative)
- After writing, verify the file exists
- Report back that the file was successfully written`,
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

// Stage 2: Architect (Sonnet)
phase('Stage 2: Architecture')
log('Running architect agent on Claude Sonnet 4.6...')
const archResult = await agent(
  `Read ./artifacts/story.md and analyze the codebase. Produce a technical architecture plan.

Include:
- Components affected
- Data flow diagrams
- API changes (new routes, request/response contracts)
- Database changes (if any)
- Security concerns
- Performance concerns

Instructions:
- Base decisions on existing codebase conventions
- Save output to c:\\uvproject\\artifacts\\architecture.md using the Write tool (absolute path, not relative)
- After writing, verify the file exists
- Report back that the file was successfully written`,
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

// Stage 3: Test Designer (Sonnet)
phase('Stage 3: Test Design')
log('Running test-designer agent on Claude Sonnet 4.6...')
const testDesignResult = await agent(
  `Read ./artifacts/architecture.md and relevant source files. Design a comprehensive unit test plan.

Do not write test code yet — only design the plan.

Include:
- Test cases organized by module/component
- Happy paths, edge cases, and failure modes
- Test case descriptions with expected behavior
- Coverage goals (line, branch, integration)

Instructions:
- Read source files to understand what needs testing
- Save output to c:\\uvproject\\artifacts\\unit_tests.md using the Write tool (absolute path, not relative)
- After writing, verify the file exists
- Report back that the file was successfully written`,
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

// Stage 4: Test Author (Haiku - more efficient for code generation)
phase('Stage 4: Write Tests')
log('Running test-author agent on Claude Haiku 4.5...')
const testCodeResult = await agent(
  `Read ./artifacts/unit_tests.md and relevant source files. Write full pytest implementations for every test case.

Instructions:
- Include all fixtures, mocks, and assertions
- Make the code complete and runnable
- Do not leave placeholders or TODOs
- Save output to c:\\uvproject\\artifacts\\test_cases.py using the Write tool (absolute path, not relative)
- After writing, verify the file exists
- Run the tests: cd c:\\uvproject && python -m pytest artifacts\\test_cases.py -v
- If tests fail, fix them and re-write the file
- Report back that the file was successfully written and tests executed`,
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

// Summary
log('✓ SDLC pipeline completed successfully')

return {
  status: 'success',
  artifacts: [
    'artifacts/story.md (user story with acceptance criteria)',
    'artifacts/architecture.md (technical design)',
    'artifacts/unit_tests.md (test plan)',
    'artifacts/test_cases.py (pytest implementation)',
  ],
  message: 'All stages complete. Review artifacts in the ./artifacts directory.',
}
