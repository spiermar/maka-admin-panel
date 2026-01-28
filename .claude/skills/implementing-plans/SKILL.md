---
name: implementing-plans
description: Use when implementing solution designs from @docs/plans/ directory that include database migrations, new files, tests, and deployment steps
---

# Implementing Solution Plans

## Overview

Execute solution designs from `@docs/plans/` following design-first workflow, git worktree isolation, and comprehensive testing.

## Implementation Process

**1. Read Design** - `{date}-{feature}-design.md` (MANDATORY)

**2. Create Worktree** (BEFORE CODE)
   - Use `using-git-worktrees` skill
   - Branch MUST be created from `main` branch (not current branch)
   - Branch naming: `feat/description` or `fix/description` or `security/description`

**3. Execute Steps** - `{date}-{feature}-implementation.md` numerically (1→2→3)

**4. Run ALL Tests** - In order:
   - `npm test` (unit)
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:e2e`

**5. Debug Until ALL Pass** (MANDATORY)
   - If ANY fails: `systematic-debugging`
   - Fix in worktree, re-run failed tests
   - Repeat until ALL pass
   - Never modify files outside repo
   - Stop only when exhausted options

**6. Commit** - `git commit -m "feat: description"`

**7. Create PR** - `git push && gh pr create`

**8. Cleanup Worktree** - After PR: `cd $(git rev-parse --show-toplevel) && git worktree remove <path>`

---

## Quick Reference

| Phase | Action | Prerequisite |
|-------|--------|--------------|
| Design | Read design doc | All work |
| Worktree | Create with new branch (feat/fix/security) | Step 1 |
| Steps | Execute 1→2→3 | Next step |
| Test | Run unit, lint, typecheck, E2E | Any commit |
| Debug | Fix until ALL pass | Failed tests |
| Commit | Conventional message | Push |
| PR | gh pr create | Ready to merge |
| Cleanup | Remove worktree | PR submitted |

---

## Common Mistakes

| Problem | Fix |
|---------|-----|
| Skip design/worktree | Read design + use-git-worktrees |
| Branch from wrong base | Always create branch from `main`, not current branch |
| Steps out of order | Follow numerical sequence |
| Partial testing | Run ALL: unit, lint, typecheck, E2E |
| Give up on failures | Debug until ALL pass (mandatory) |
| Modify outside repo | Only in worktree |
| Skip PR/cleanup | Always create PR + cleanup |

---

## Test Failure Workflow (MANDATORY)

If ANY test fails:
1. `systematic-debugging` → diagnose
2. Fix in worktree
3. Re-run failed test
4. Re-run ALL tests
5. Repeat until ALL pass
6. **Never** modify files outside repo
7. Temporary troubleshooting files only in repo's `tmp/` directory
8. Stop ONLY when exhausted

---

## Red Flags - STOP

- start without design/worktree
- create branch from current branch instead of `main`
- "just unit tests" - must run ALL suites
- "CI will handle lint"
- give up on test failures
- modify files outside repo (use repo's `tmp/` for temporary files)
- skip worktree cleanup

---

## Success Criteria

✅ Design read, worktree with branch (feat/fix/security)
✅ Steps executed in order
✅ ALL tests pass (unit + lint + typecheck + E2E)
✅ All failures debugged/fixed
✅ Committed conventionally
✅ PR created
✅ Worktree removed

---

## Example

Rate limiting:
1. Read design
2. Worktree → `using-git-worktrees`: create `.worktrees/security-rate-limit` with branch from `main`: `fix/security-rate-limit`
3. Steps 1-4 → install, files, migration
4. Test → `npm test` + `lint` + `typecheck` + `E2E`
5. Debug → E2E fails → `systematic-debugging` → fix → re-run
6. Commit → `git commit -m "fix: add rate limiting"`
7. PR → `gh pr create`
8. Cleanup → `git worktree remove .worktrees/security-rate-limit`

---

## Required Background

**REQUIRED:**
- **using-git-worktrees** - Create isolated workspaces
- **systematic-debugging** - Debug until ALL tests pass

**ALSO USES:**
- **test-driven-development** - Write tests first when plan specifies
- **verification-before-completion** - Verify all tests pass
- **finishing-a-development-branch** - Cleanup/merge options
