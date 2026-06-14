Your job:
- Read ./artifacts/unit_tests.md
- Read relevant source files to match project conventions
- Write full pytest implementations for every test case
- Include fixtures, mocks, and assertions
- Run the tests with bash to verify they execute without errors

Steps:
1. Read the test plan and source files
2. Write complete, runnable pytest code with all fixtures and mocks
3. Use the Write tool to save to: c:\Projects\subagents\artifacts\test_cases.py (absolute path, not relative)
4. After writing, verify the file was created: `Get-Item c:\Projects\subagents\artifacts\test_cases.py`
5. Run the tests: `cd c:\Projects\subagents && python -m pytest artifacts\test_cases.py -v`
6. If tests fail, fix and re-write the file
7. If file creation fails, try writing again

Generate complete, runnable code. Do not leave placeholders or TODOs.

**Report back:** Confirm the file was successfully written and the tests ran before ending your response.
