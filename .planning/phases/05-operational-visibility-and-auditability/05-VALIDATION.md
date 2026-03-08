---
phase: 05
slug: operational-visibility-and-auditability
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 05 — Validation Strategy

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
| 05-01-01 | 01 | 1 | VIS-01 | unit | `npm test -- --run --testNamePattern="rental-summary"` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | VIS-02 | unit | `npm test -- --run --testNamePattern="audit"` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | VIS-01 | unit | `npm test -- --run --testNamePattern="dashboard"` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 2 | VIS-02 | unit | `npm test -- --run --testNamePattern="audit-log"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/lib/analytics/rentals-operations.test.ts` — tests VIS-01 dashboard summaries
- [ ] `__tests__/lib/db/rentals-audit.test.ts` — tests VIS-02 audit event emission

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard card display on page load | VIS-01 | Complex UI workflow | Visit dashboard, verify summary cards render |
| Audit log page filtering | VIS-02 | Complex UI workflow | Visit /rentals/audit, test filters |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending