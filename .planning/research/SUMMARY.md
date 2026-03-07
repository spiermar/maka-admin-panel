# Project Research Summary

**Project:** Rental Operations Expansion for Maka Admin
**Domain:** Residential rental operations for small landlords (brownfield admin platform)
**Researched:** 2026-03-07
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a brownfield expansion of an existing Next.js admin panel into a rental operations system focused on landlords managing roughly 1-50 units. The v1 product is operationally opinionated: property/unit inventory, tenant/lease lifecycle, rent scheduling, manual payment recording, delinquency visibility, RBAC, and auditability. Research consistently supports a modular-monolith approach in the current codebase rather than introducing distributed services or CQRS patterns.

The recommended implementation path is relational-data first, then workflow correctness, then controls and rollout hardening. PostgreSQL remains the source of truth, server actions remain the mutation boundary, Zod schemas enforce domain contracts, and money/date logic must be centralized (decimal-safe currency math, timezone-safe schedule math). This minimizes migration risk and aligns with existing app conventions for auth, SQL access, and i18n.

The highest risks are workflow correctness failures (reservation/lease state gaps), financial inconsistency (pricing/fee precedence drift), and weak operational controls (inventory drift, weak audit chain, unsegmented rollout). Mitigation is explicit state machines, centralized pricing and ledger logic, immutable high-risk audit events, and phased rollout by pilot cohort with readiness gates and kill switches.

## Key Findings

### Recommended Stack

Stack direction is conservative and strong for v1: keep Next.js 16 + React 19, PostgreSQL-backed relational modeling, Zod + React Hook Form for validated admin flows, and add `decimal.js` plus `date-fns`/`date-fns-tz` to prevent finance/date bugs. Use a modular monolith with domain boundaries in `lib/db/*`, `lib/actions/*`, and `lib/validations/*`.

**Core technologies:**
- Next.js 16 + React 19: admin UI + server actions in an already-proven runtime model.
- PostgreSQL 15+: canonical store for units, leases, charges, and payment history with constraints/indexes.
- Zod 4 + React Hook Form 7: shared validation contracts across form and server boundaries.
- `decimal.js`: exact currency arithmetic for rent, fees, allocations, and reconciliation.
- `date-fns` + `date-fns-tz`: reliable due date cycles, grace periods, and timezone-safe lease timelines.

### Expected Features

Research converges on a table-stakes-first rollout: inventory, lease/reservation lifecycle, billing/payments, operational visibility, and audit/permissions. Differentiators (pricing engine, optimization, portals, advanced integrations) should come after stable core operations.

**Must have (table stakes):**
- Property/building/unit inventory with occupancy/vacancy status.
- Tenant/account records plus lease lifecycle management.
- Availability and reservation/lease scheduling with conflict prevention.
- Billing/invoicing/manual payment recording and delinquency visibility.
- Role-based permissions and immutable activity/audit history.
- Operational reporting (occupancy/utilization, overdue balances, exceptions).

**Should have (competitive):**
- Dynamic pricing rules with explainable precedence.
- Self-service renter portal (status, payments, documents).
- Contract/waiver automation.
- API/webhook integration surface.

**Defer (v2+):**
- Full commercial lease accounting workflows.
- Deep optimization systems (predictive maintenance, route optimization) until operational baseline is stable.
- Broad offline parity and highly customizable workflow builders.

### Architecture Approach

Architecture should mirror existing patterns: server components fetch read models, client components handle interaction, server actions enforce `requireAuth -> validation -> db mutation -> revalidatePath`, and all SQL remains in a domain DB module. For rentals, implement route group pages under `app/(dashboard)/rentals/*`, domain UI under `components/rentals/*`, action/validation boundaries in `lib/actions/rentals.ts` and `lib/validations/rentals.ts`, and typed persistence interfaces in `lib/db/types.ts`.

**Major components:**
1. Presentation layer (`app/(dashboard)/rentals/*`, `components/rentals/*`) - route composition, list/detail/forms, filters.
2. Application layer (`lib/actions/rentals.ts`, `lib/validations/rentals.ts`) - auth, domain validation, orchestration, cache invalidation.
3. Data layer (`lib/db/rentals.ts`, `lib/db/schema.sql`, `lib/db/types.ts`) - SQL ownership, schema constraints, typed read/write models.

### Critical Pitfalls

1. **Reservation/lease state machine gaps** - Define full lifecycle transitions (including exceptions) and enforce idempotent transition handlers.
2. **Pricing and fee precedence conflicts** - Centralize pricing/fee/tax logic and lock with contract-style scenario tests.
3. **Inventory drift from real-world state** - Enforce check-in/check-out gates, evented state transitions, and recurring reconciliation checks.
4. **Weak auditability for high-risk actions** - Require immutable actor/timestamp/reason logs for rate changes, waivers, and contract/payment mutations.
5. **Unsegmented rollout across locations/workflows** - Release by pilot cohorts with readiness scoring, feature flags, and rollback playbooks.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Rental Domain and Lifecycle Integrity
**Rationale:** All downstream billing/reporting depends on a correct property-unit-tenant-lease state model.
**Delivers:** Data model, core CRUD flows, lease/reservation state machine, baseline list/detail UX, auth + validation boundaries.
**Addresses:** Inventory catalog, tenant/lease records, reservation/availability core.
**Avoids:** Reservation state gaps and ad-hoc DB repairs.

### Phase 2: Rent Scheduling, Ledger Posting, and Manual Collections
**Rationale:** Primary v1 value is replacing spreadsheets for rent tracking and delinquency.
**Delivers:** Rent schedule generation, recurring charge posting, manual payment entry/allocation, balance due + delinquency views.
**Uses:** PostgreSQL relational constraints, `decimal.js`, timezone-safe date tooling.
**Implements:** Action guardrail pipeline and DB domain boundary for finance-adjacent operations.
**Avoids:** Pricing/fee inconsistency from duplicated calculations.

### Phase 3: Controls, Audit, and Operational Hardening
**Rationale:** Financial correctness without controls creates dispute and compliance risk.
**Delivers:** Immutable audit trail, high-risk action reason codes, approval thresholds, reconciliation utilities, hardened error handling.
**Addresses:** RBAC and audit expectations; exception governance.
**Avoids:** Weak dispute evidence, unauthorized overrides, untracked financial mutations.

### Phase 4: Reporting, Rollout Safety, and Scale Readiness
**Rationale:** After workflow correctness is stable, optimize visibility and deployment safety.
**Delivers:** KPI dashboards, AR aging/occupancy reporting, phased rollout playbooks, feature-flag gates, index/pagination tuning.
**Addresses:** Operational reporting and rollout reliability.
**Avoids:** Branch-wide launch disruption, slow query regressions, and manual workaround drift.

### Phase 5: Differentiators and Expansion (v2 Track)
**Rationale:** Advanced capabilities should build on a stable core and validated controls.
**Delivers:** Dynamic pricing governance, self-service renter portal, integration APIs/webhooks, commercial-first extensions where justified.
**Addresses:** Competitive differentiation and ecosystem reach.
**Avoids:** Premature complexity and support burden in early v1.

### Phase Ordering Rationale

- Dependency chain is strict: domain lifecycle -> billing/ledger -> controls/audit -> reporting/scale -> differentiators.
- Architecture supports this order by letting each phase add domain modules incrementally without pattern changes.
- Pitfall mapping aligns directly: state-machine risk first, pricing/audit next, then rollout/performance hardening.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Rent proration edge cases, allocation precedence, and delinquency rule variants need scenario research before implementation details.
- **Phase 5:** Dynamic pricing governance and external integration contracts require targeted research to avoid overbuilding.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Strongly documented within existing app patterns (auth/action/db/validation split).
- **Phase 3:** Control/audit mechanisms are well-established with known implementation patterns.
- **Phase 4:** Reporting/indexing/rollout gating patterns are standard and already captured in current research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Strong compatibility with existing codebase; some recommendations (Drizzle/WebAuthn) are optional and not yet implementation-validated here. |
| Features | MEDIUM | Feature set is well-prioritized, but source base is more market-pattern synthesis than direct user-interview evidence. |
| Architecture | HIGH | Directly grounded in current repository conventions and concrete module boundaries. |
| Pitfalls | HIGH | Risks are specific, operationally realistic, and mapped to prevention + phase verification. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Domain terminology drift (reservation vs lease semantics):** Lock glossary and state definitions during Phase 1 planning to avoid model confusion.
- **Commercial workflow boundaries:** Define explicit v1 exclusion criteria and extension seams so v2 commercial work does not force rewrites.
- **Payment processing future path:** Even with manual payments in v1, model payment stages now to reduce integration rework later.
- **Reporting KPI definitions:** Finalize metric formulas (occupancy, AR aging, delinquency) early to avoid dashboard/data mismatch.

## Sources

### Primary (HIGH confidence)
- Local repository architecture and conventions (`app/(dashboard)`, `lib/actions/*`, `lib/db/*`, `lib/validations/*`) - module boundaries, auth/action patterns, SQL ownership.
- `.planning/research/ARCHITECTURE.md` - recommended component boundaries, build order, anti-patterns.
- `.planning/research/PITFALLS.md` - critical risk patterns, prevention controls, phase verification mapping.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` - stack recommendations and compatibility guidance for rental-ledger correctness.
- `.planning/research/FEATURES.md` - table stakes, differentiators, anti-features, and dependency graph.
- `PROJECT.md` - validated scope constraints and v1 intent (residential-first, manual payments).

### Tertiary (LOW confidence)
- None identified in current research set.

---
*Research completed: 2026-03-07*
*Ready for roadmap: yes*
