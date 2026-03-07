# Roadmap: Rental Operations Expansion for Maka Admin

## Overview

This roadmap delivers a residential-first rental operations capability inside the existing Maka admin platform, moving from secure rental access controls to unit and lease lifecycle integrity, then rent collection workflows, and finally visibility and audit controls needed for reliable day-to-day operations without spreadsheets.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Rental Access Control Baseline** - Rental workflows are gated by role-based permissions in admin routes and actions. (completed 2026-03-07)
- [x] **Phase 2: Portfolio and Unit Occupancy Management** - Landlord can manage properties/units and current vacancy state. (completed 2026-03-07)
- [ ] **Phase 3: Tenant and Lease Lifecycle Integrity** - Tenant records and lease lifecycles are managed with overlap protections.
- [ ] **Phase 4: Rent Charges, Payments, and Delinquency** - Monthly rent operations and balances are tracked end-to-end.
- [ ] **Phase 5: Operational Visibility and Auditability** - Dashboard summaries and high-risk operation history are available.

## Phase Details

### Phase 1: Rental Access Control Baseline
**Goal**: Rental operations are accessible only to authorized admin roles across UI workflows and server mutations.
**Depends on**: Nothing (first phase)
**Requirements**: VIS-03
**Success Criteria** (what must be TRUE):
  1. Authorized users can access rental pages and complete rental workflows in admin.
  2. Unauthorized users are blocked from rental pages and protected server actions.
  3. Permission failures are consistently visible as access-denied outcomes rather than partial or silent failures.
**Plans**: TBD

### Phase 2: Portfolio and Unit Occupancy Management
**Goal**: Landlord can maintain a reliable property/unit inventory with clear occupancy/vacancy states.
**Depends on**: Phase 1
**Requirements**: UNIT-01, UNIT-02, UNIT-03
**Success Criteria** (what must be TRUE):
  1. User can create and update properties and residential units with required attributes.
  2. User can set unit occupancy states (occupied, vacant, unavailable) with effective dates.
  3. User can view a filterable unit inventory showing each unit's current vacancy state.
**Plans**: TBD

### Phase 3: Tenant and Lease Lifecycle Integrity
**Goal**: Tenant assignment and lease lifecycle workflows operate correctly without conflicting lease periods.
**Depends on**: Phase 2
**Requirements**: LEASE-01, LEASE-02, LEASE-03, LEASE-04
**Success Criteria** (what must be TRUE):
  1. User can create tenant records and link tenants to units.
  2. User can create leases with required residential terms (start/end dates, monthly rent, security deposit).
  3. User can renew, terminate, and move out leases with explicit lifecycle statuses.
  4. User cannot activate overlapping leases for the same unit and overlapping dates.
**Plans**: TBD

### Phase 4: Rent Charges, Payments, and Delinquency
**Goal**: Landlord can run monthly rent operations, record manual payments, and monitor balances and overdue accounts.
**Depends on**: Phase 3
**Requirements**: RENT-01, RENT-02, RENT-03, RENT-04
**Success Criteria** (what must be TRUE):
  1. User can generate monthly rent charges from active lease terms.
  2. User can record manual rent payments with date, amount, and payment method.
  3. User can view current balance due by lease and by tenant.
  4. User can identify overdue balances using due dates and configurable grace periods.
**Plans**: TBD

### Phase 5: Operational Visibility and Auditability
**Goal**: Rental operations provide clear summary visibility and an auditable history for high-risk changes.
**Depends on**: Phase 4
**Requirements**: VIS-01, VIS-02
**Success Criteria** (what must be TRUE):
  1. User can view dashboard summaries for vacancy, occupied units, and delinquent accounts.
  2. User can review an auditable history of lease status changes, rent amount edits, and payment adjustments.
  3. History entries include enough context (who changed what and when) to support operational review.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 1.1 -> 2 -> 2.1 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Rental Access Control Baseline | 2/2 | Complete    | 2026-03-07 |
| 2. Portfolio and Unit Occupancy Management | 3/3 | Complete    | 2026-03-07 |
| 3. Tenant and Lease Lifecycle Integrity | 0/TBD | Not started | - |
| 4. Rent Charges, Payments, and Delinquency | 0/TBD | Not started | - |
| 5. Operational Visibility and Auditability | 0/TBD | Not started | - |
