---
phase: 03
slug: tenant-and-lease-lifecycle-integrity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | LEASE-01 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | LEASE-01 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | LEASE-02 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | LEASE-02 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | LEASE-03 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | LEASE-04 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/lib/db/rentals-tenants.test.ts` — covers LEASE-01
- [ ] `__tests__/lib/db/rentals-leases.test.ts` — covers LEASE-02, LEASE-03, LEASE-04
- [ ] `__tests__/lib/validations/rentals-tenant.test.ts` — tenant validation
- [ ] `__tests__/lib/validations/rentals-lease.test.ts` — lease validation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual verification of tenant/lease list views | LEASE-01, LEASE-02 | UI rendering | Open /rentals/tenants and /rentals/leases, verify list renders |
| Status transition UI buttons | LEASE-03 | UI workflow | Click status transition buttons, verify UI updates |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending