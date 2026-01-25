---
name: fix-issue
description: Fix a GitHub issue
disable-model-invocation: true
---
Analyze and fix the GitHub issue: $ARGUMENTS.

1. Use `gh issue view` to get the issue details
2. Understand the problem described in the issue
3. Create a new git branch for the issue, respecting git branching rules.
4. Search the codebase for relevant files
5. Create implementation plan with the necessary changes to fix the issue
6. Document the plan and tasks to be executed in the TODO.md file
7. Execute the plan, marking the completed tasks in the TODO.md file
8. Write tests for any fixes or new features added, particularly integration tests
9. Run tests to verify the fix and/or features
10. Ensure code passes linting and type checking
11. Create a descriptive commit message
12. Commit the changes to the new branch, but do not include the TODO.md file
13. Push the new branch and create a PR, including the plan documented in the TODO.md file
14. Delete the TODO.md file after creating the PR
15. Checkout main git branch again

Remember to use the GitHub CLI (`gh`) for all GitHub-related tasks.
