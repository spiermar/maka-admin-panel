---
phase: 01
slug: rental-access-control-baseline
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-07
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + playwright |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- --run __tests__/auth.session.test.ts` |
| **Full suite command** | `npm run lint && npm test -- --run` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run __tests__/auth.session.test.ts`
- **After every plan wave:** Run `npm run lint && npm test -- --run`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | VIS-03 | integration | `npm test -- --run __tests__/auth.session.test.ts` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | VIS-03 | integration | `npm test -- --run __tests__/actions.auth.test.ts` | ✅ | ⬜ pending |
| 01-01-03 | 01 | 1 | VIS-03 | e2e | `npm run test:e2e -- e2e/auth.spec.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/rentals.auth-guard.test.ts` — add focused guard coverage for rental action entrypoints

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Authenticated user can open rental route in dashboard | VIS-03 | Visual route confirmation in App Router | Start dev server, visit `/rentals` while logged in, confirm page loads without access errors |
| Unauthenticated visitor is redirected away from protected rental route | VIS-03 | Redirect behavior best validated in browser flow | Visit `/rentals` in incognito, confirm redirect to `/login` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
