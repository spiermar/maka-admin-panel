# Rental Operations Expansion for Maka Admin

## What This Is

This project extends the existing Maka admin panel into a rental-operations system for small landlords managing residential and commercial properties. The first release focuses on replacing spreadsheet workflows for vacancy and rent tracking with structured, auditable workflows in one admin interface. Commercial support is planned after residential-first delivery, with baseline pathways designed so commercial capabilities can be layered without rewriting core models.

## Core Value

Small landlords can reliably manage rent collection status and vacancy across their units without spreadsheets.

## Requirements

### Validated

- ✓ Secure admin authentication, session control, and route protection — existing
- ✓ Financial account, category, and transaction management foundation — existing
- ✓ Expense and reporting workflows with server-side data integrity patterns — existing

### Active

- [ ] Landlord can manage property/building/unit inventory with clear occupancy and vacancy states
- [ ] Landlord can manage tenant and lease records for residential units with lease lifecycle states
- [ ] Landlord can track rent schedules, manual payment entries, balances due, and delinquency status

### Out of Scope

- Full commercial lease accounting (NNN/CAM/modified gross) in v1 — deferred to follow-up phases after residential baseline is stable
- Online payment processing integrations in v1 — manual payment recording is sufficient for initial rollout

## Context

The codebase is a brownfield Next.js 16 + React 19 + TypeScript admin platform with production-oriented patterns already in place: authenticated dashboards, server actions, SQL-backed domain modules, validation schemas, and testing infrastructure. Existing architecture centers on financial ledger workflows (accounts, categories, transactions, expenses, reports). This project incrementally adds rental domain features while preserving established conventions, security posture, and data-access patterns.

Primary target user for v1 is small landlords operating roughly 1-50 units. The immediate problem to solve is spreadsheet-based tracking of rent payments and vacancy status, which currently creates operational risk and poor visibility.

## Constraints

- **Audience**: Small landlords (1-50 units) — prioritize simple, low-friction workflows over enterprise complexity
- **Scope**: Residential-first v1 — commercial workflows are phased in later
- **Payments**: Manual payment recording in v1 — no processor integration in initial release
- **Platform**: Build within existing Next.js/Postgres architecture — reduce migration risk and reuse proven auth/data patterns

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Residential-first rollout | Faster path to value and reduced domain complexity for first release | — Pending |
| Manual payment tracking before online processing | Solves immediate spreadsheet pain with lower implementation risk | — Pending |
| Focus on rent and vacancy operations as v1 success criteria | Directly addresses the main user pain points stated during initialization | — Pending |

---
*Last updated: 2026-03-07 after initialization*
