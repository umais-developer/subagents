export const meta = {
  name: 'sdlc-pipeline',
  description: 'SDLC pipeline: story → architecture → tests → implementation → PR',
  phases: [
    { title: 'Pre-flight Check', detail: 'Check for existing artifacts' },
    { title: 'Stage 1: Refine Story', detail: 'story-refiner agent on Sonnet' },
    { title: 'Stage 2: Architecture', detail: 'architect agent on Sonnet' },
    { title: 'Stage 3: Test Design', detail: 'test-designer agent on Sonnet' },
    { title: 'Stage 4: Write Tests', detail: 'test-author agent on Haiku' },
    { title: 'Stage 5: Implement', detail: 'implementor agent on Sonnet' },
  ],
}

// Parse feature request from args
const featureRequest = args || ''
if (!featureRequest) {
  log('ERROR: No feature request provided. Pass the feature request as the pipeline argument.')
  return { error: 'No feature request provided' }
}

log(\Starting SDLC pipeline for feature: "\\"\)

// ============================================================================
// PRE-FLIGHT CHECK: Artifact Detection
// ============================================================================
phase('Pre-flight Check')
const artifactsPath = 'c:\\\\Projects\\\\subagents\\\\artifacts\\\\'
const storyExists = await bash(\Test-Path \story.md\).then(r => r.stdout.trim() === 'True')
const archExists = await bash(\Test-Path \architecture.md\).then(r => r.stdout.trim() === 'True')
const designExists = await bash(\Test-Path \unit_tests.md\).then(r => r.stdout.trim() === 'True')
const testsExists = await bash(\Test-Path \test_cases.py\).then(r => r.stdout.trim() === 'True')

if (storyExists || archExists || designExists || testsExists) {
  log('Found existing artifacts in the artifacts folder.')
  const choice = await prompt('Would you like to (1) resume from the last successful step or (2) wipe them and start from scratch? (Enter 1 or 2)', {
    options: ['1 - Resume', '2 - Wipe and restart']
  })

  if (choice.includes('2')) {
    log('Wiping existing artifacts...')
    await bash(\Remove-Item -Path \* -Force -ErrorAction SilentlyContinue\)
  } else {
    log('Resuming from existing artifacts...')
  }
}

// Re-check existence after potential wipe
const currentStoryExists = await bash(\Test-Path \story.md\).then(r => r.stdout.trim() === 'True')
const currentArchExists = await bash(\Test-Path \architecture.md\).then(r => r.stdout.trim() === 'True')
const currentDesignExists = await bash(\Test-Path \unit_tests.md\).then(r => r.stdout.trim() === 'True')
const currentTestsExists = await bash(\Test-Path \test_cases.py\).then(r => r.stdout.trim() === 'True')

// ============================================================================
// STAGE 1: STORY REFINER
// ============================================================================
if (!currentStoryExists) {
  phase('Stage 1: Refine Story')
  log('Running story-refiner agent on Claude Sonnet 4.6...')
  const storyResult = await agent(
    \Your job:
- Read the raw feature request provided
- Produce a structured user story with acceptance criteria
- Format using Given/When/Then scenarios
- Identify edge cases and risks

Feature request: \

Steps:
1. Analyze the raw feature request
2. Produce the structured user story with acceptance criteria
3. Use the Write tool to save to: c:\\\\Projects\\\\subagents\\\\artifacts\\\\story.md
4. After writing, verify the file was created: Get-Item c:\\\\Projects\\\\subagents\\\\artifacts\\\\story.md

Report back: Confirm the file was successfully written before ending your response.\,
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
  log(\✓ Stage 1 complete\)

  const storyOk = await prompt('Story looks good? Type "yes" to continue to architecture or provide feedback.')
  if (storyOk.toLowerCase() !== 'yes' && storyOk.toLowerCase() !== 'y') {
    return { error: 'User stopped at Stage 1' }
  }
} else {
  log('Skipping Stage 1 (artifact exists)')
}

// ============================================================================
// STAGE 2: ARCHITECT
// ============================================================================
if (!currentArchExists) {
  phase('Stage 2: Architecture')
  log('Running architect agent on Claude Sonnet 4.6...')
  const archResult = await agent(
    \Your job:
- Read c:\\\\Projects\\\\subagents\\\\artifacts\\\\story.md
- Explore the codebase to understand existing conventions
- Produce a technical architecture plan
- Include: components affected, data flow, API changes

Steps:
1. Analyze the story and codebase
2. Draft the architecture plan
3. Save to: c:\\\\Projects\\\\subagents\\\\artifacts\\\\architecture.md
4. Verify the file was created

Report back: Confirm the file was successfully written.\,
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
  log(\✓ Stage 2 complete\)

  const archOk = await prompt('Architecture looks good? Type "yes" to continue to test design or provide feedback.')
  if (archOk.toLowerCase() !== 'yes' && archOk.toLowerCase() !== 'y') {
    return { error: 'User stopped at Stage 2' }
  }
} else {
  log('Skipping Stage 2 (artifact exists)')
}

// ============================================================================
// STAGE 3: TEST DESIGNER
// ============================================================================
if (!currentDesignExists) {
  phase('Stage 3: Test Design')
  log('Running test-designer agent on Claude Sonnet 4.6...')
  const testDesignResult = await agent(
    \Your job:
- Read c:\\\\Projects\\\\subagents\\\\artifacts\\\\architecture.md
- Design a comprehensive unit test plan
- Cover happy paths, edge cases, and failure modes

Steps:
1. Analyze the architecture and source files
2. Design the comprehensive test plan
3. Save to: c:\\\\Projects\\\\subagents\\\\artifacts\\\\unit_tests.md
4. Verify the file was created

Report back: Confirm success.\,
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
  log(\✓ Stage 3 complete\)

  const testPlanOk = await prompt('Test plan looks good? Type "yes" to continue to test implementation or provide feedback.')
  if (testPlanOk.toLowerCase() !== 'yes' && testPlanOk.toLowerCase() !== 'y') {
    return { error: 'User stopped at Stage 3' }
  }
} else {
  log('Skipping Stage 3 (artifact exists)')
}

// ============================================================================
// STAGE 4: TEST AUTHOR
// ============================================================================
if (!currentTestsExists) {
  phase('Stage 4: Write Tests')
  log('Running test-author agent on Claude Haiku 4.5...')
  const testCodeResult = await agent(
    \Your job:
- Read c:\\\\Projects\\\\subagents\\\\artifacts\\\\unit_tests.md
- Write full pytest implementations
- Run the tests to verify they execute

Steps:
1. Write complete, runnable pytest code
2. Save to: c:\\\\Projects\\\\subagents\\\\artifacts\\\\test_cases.py
3. Run: cd c:\\\\Projects\\\\subagents && python -m pytest artifacts\\\\test_cases.py -v
4. If tests fail, fix and re-write

Report back: Confirm success.\,
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
  log(\✓ Stage 4 complete\)

  const testsOk = await prompt('Tests look good? Type "yes" to continue to implementation or provide feedback.')
  if (testsOk.toLowerCase() !== 'yes' && testsOk.toLowerCase() !== 'y') {
    return { error: 'User stopped at Stage 4' }
  }
} else {
  log('Skipping Stage 4 (artifact exists)')
}

// ============================================================================
// STAGE 5: IMPLEMENTOR
// ============================================================================
phase('Stage 5: Implement')
log('Running implementor agent on Claude Sonnet 4.6...')
const implementationResult = await agent(
  \Your job:
- Read artifacts/story.md, architecture.md, and test_cases.py
- Implement the feature
- Create a feature branch and pull request

Steps:
1. Create a feature branch from story title
2. Implement feature in source files
3. Run all tests and verify
4. Commit and create PR with gh cli

Report back: Provide PR URL or branch name.\,
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

log(\✓ Stage 5 complete\)
log('SDLC Pipeline Finished Successfully')
