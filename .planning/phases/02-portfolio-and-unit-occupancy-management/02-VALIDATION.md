---
phase: 02
slug: portfolio-and-unit-occupancy-management
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-07
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + playwright |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- --run __tests__/lib/actions/rentals*.test.ts` |
| **Full suite command** | `npm run lint && npm test -- --run` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run __tests__/lib/actions/rentals*.test.ts`
- **After every plan wave:** Run `npm run lint && npm test -- --run`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | UNIT-01 | unit/integration | `npm test -- --run __tests__/lib/db/rentals-properties.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | UNIT-01 | unit/integration | `npm test -- --run __tests__/lib/db/rentals-units.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | UNIT-02 | unit/integration | `npm test -- --run __tests__/lib/actions/rentals-occupancy.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | UNIT-02 | unit/integration | `npm test -- --run __tests__/lib/validations/rentals-occupancy.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | UNIT-03 | e2e | `npm run test:e2e -- e2e/20-rentals-inventory.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/lib/db/rentals-properties.test.ts` — coverage for property CRUD query behavior
- [ ] `__tests__/lib/db/rentals-units.test.ts` — coverage for unit uniqueness and inventory query behavior
- [ ] `__tests__/lib/actions/rentals-occupancy.test.ts` — auth-first and overlap-blocking action behavior
- [ ] `__tests__/lib/validations/rentals-occupancy.test.ts` — date-only and status validation rules
- [ ] `e2e/20-rentals-inventory.spec.ts` — table/filter/status badge and create/edit navigation flow

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inventory grouped by status with date-effective current status labeling | UNIT-03 | Visual grouping semantics are easier to confirm in UI | Open `/rentals`, verify groups and status badges match seeded records |
| Create/edit full-page flow + silent discard behavior | UNIT-01 | Browser interaction nuance for close/navigation flows | Start create/edit flow, modify fields, navigate away/close, verify no confirmation prompt and no saved changes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
