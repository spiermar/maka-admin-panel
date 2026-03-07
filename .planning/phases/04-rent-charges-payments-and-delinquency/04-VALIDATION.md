---
phase: 04
slug: rent-charges-payments-and-delinquency
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm run test:coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | RENT-01 | unit | `npm test -- --run --testNamePattern="rentals-charges"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | RENT-02 | unit | `npm test -- --run --testNamePattern="rentals-payments"` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | RENT-03 | unit | `npm test -- --run --testNamePattern="balance"` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | RENT-04 | unit | `npm test -- --run --testNamePattern="overdue"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/lib/db/rentals-charges.test.ts` — covers RENT-01, RENT-03, RENT-04
- [ ] `__tests__/lib/db/rentals-payments.test.ts` — covers RENT-02
- [ ] `__tests__/lib/validations/rentals-charge.test.ts` — validation tests
- [ ] `__tests__/lib/validations/rentals-payment.test.ts` — validation tests
- [ ] `__tests__/lib/actions/rentals-charges.test.ts` — action tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UI charge generation flow | RENT-01 | Complex UI workflow | Test by generating charges via UI, verify charges appear in list |
| UI payment recording flow | RENT-02 | Complex UI workflow | Test by adding payment via UI, verify allocation to charges |
| Lease detail balance display | RENT-03 | UI verification | Visit lease detail, verify balance shows correct amount |
| Overdue page display | RENT-04 | UI verification | Visit overdue page, verify correct overdue items appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending