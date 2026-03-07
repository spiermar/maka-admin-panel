# Phase 3: Tenant and Lease Lifecycle Integrity - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Tenant records and lease lifecycle workflows operate correctly without conflicting lease periods. This phase implements LEASE-01, LEASE-02, LEASE-03, and LEASE-04 only:
- Create tenant records and link tenants to units
- Create leases with residential terms (start/end dates, monthly rent, security deposit)
- Renew, terminate, and move out leases with explicit lifecycle statuses
- Prevent overlapping leases for the same unit and overlapping dates

</domain>

<decisions>
## Implementation Decisions

### Tenant model
- Tenant records contain: name, phone, email (simple contact fields)
- One tenant per unit (no roommate/multi-tenant support in Phase 3)
- Tenant links to a unit via lease record

### Lease structure
- Lifecycle states: Draft → Pending → Active → Expired/Terminated
- Required fields: start date, end date, monthly rent, security deposit
- Optional fields: Claude's discretion for extended fields (lease type, pets, parking, utilities)
- Lease references both tenant and unit

### Lifecycle workflow
- Explicit status changes only: user manually transitions Pending→Active, Active→Terminated/Expired
- No auto-transitions based on dates
- Renewal creates a new lease record (not extending existing)
- Move-out and termination are explicit status changes

### Overlap protection
- Block overlapping leases for the same unit with overlapping date ranges
- Check at creation time (not retroactive)

### Claude's Discretion
- Exact form field labels and layout
- Tenant search/filter UX details
- Lease list view columns and default sorting
- Route naming for tenant/lease create/detail/edit pages

</decisions>

<specifics>
## Specific Ideas

- Keep tenant model simple - small landlords need basic contact info
- Explicit status transitions give landlord full control over lease state
- Renewal as new lease maintains clean historical record

</specifics>

@code_context
## Existing Code Insights

### Reusable Assets
- `lib/db/rentals-units.ts`, `lib/db/rentals-occupancy.ts`: Existing unit query patterns to follow for tenant/lease queries
- `lib/actions/rentals.ts`: Existing rental server actions pattern
- `app/(dashboard)/rentals/units/[id]/client.tsx`: Detail page pattern with edit/transition workflow

### Established Patterns
- Server actions call `requireAuth()` first, then validation, then DB, then revalidation
- Date-only fields (consistent with Phase 2 occupancy effective dates)
- Full-page forms for create/edit (from Phase 2)
- Overlap blocking pattern exists in unit_occupancy_statuses

### Integration Points
- New routes: `app/(dashboard)/rentals/tenants/...` and `app/(dashboard)/rentals/leases/...`
- New DB modules: `lib/db/rentals-tenants.ts`, `lib/db/rentals-leases.ts`
- Update navigation: add Tenants and Leases to rentals nav
- Update unit detail page: show linked tenant/lease info

@end_code_context

<deferred>
## Deferred Ideas

- Multiple tenants per unit (roommates) — Phase 4 or later
- Auto-transition leases based on dates — future phase
- Month-to-month rollover handling — future phase

</deferred>

---

*Phase: 03-tenant-and-lease-lifecycle-integrity*
*Context gathered: 2026-03-07*