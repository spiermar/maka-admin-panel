# Phase 4: Rent Charges, Payments, and Delinquency - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Monthly rent operations - generating charges from active leases, recording manual payments, tracking balances, and identifying overdue accounts. This phase implements RENT-01, RENT-02, RENT-03, and RENT-04 only.

</domain>

<decisions>
## Implementation Decisions

### Charge Generation Model
- Hybrid approach: Charges are created as records when user generates them, but balance can be recalculated
- Manual trigger: User clicks "Generate Charges" button to create charges for a month
- Dedicated charges page: New `rentals/charges` page with list view and generate action
- Minimal charge fields: Lease reference, charge date, amount, status (pending/paid)

### Payment Recording
- Core payment fields: Payment date, amount, payment method (cash, check, bank transfer, other)
- Partial payments allowed: Landlord can accept any amount, not required to be full
- Dedicated payments page: New `rentals/payments` page with list and add button
- Payment allocation: Oldest pending charge first (standard accounting)

### Balance Calculation
- Simple balance: Total pending charges minus total payments applied
- Balance visible on lease detail page
- Tenant-level aggregate: Total balance across all tenant's leases shown on tenant detail

### Delinquency Definition
- Due date based: Overdue if past due date + grace period
- Fixed grace period: Global setting (e.g., 5 days) applied to all charges
- No late fees in Phase 4: Manual fee handling only if needed
- Dedicated overdue page: New `rentals/overdue` page listing all overdue balances

### Claude's Discretion
- Exact charge/payment column layout in list views
- Grace period default value (e.g., 5 days) and settings location
- Route naming for charges, payments, overdue pages
- Filter/search behavior on list pages (consistent with Phase 2)

</decisions>

<specifics>
## Specific Ideas

- "Generate Charges" is a manual action - landlord controls when monthly charges are created
- Partial payments always accepted - gives landlord flexibility
- Balance is computed from charges minus payments - simple and transparent
- Delinquency is based on due date with fixed grace period - consistent rule

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/db/rentals-leases.ts`: Lease queries with status filters - pattern for rent charge queries
- `lib/actions/rentals.ts`: Existing rental server action pattern
- `app/(dashboard)/rentals/units/[id]/client.tsx`: Detail page pattern with balance/transition workflow

### Established Patterns
- Server actions call `requireAuth()` first, then validation, then DB, then revalidation
- Table-based list views with status badges (from Phase 2)
- Full-page forms for create/edit (from Phase 2)
- Date-only fields (consistent with Phase 2/3)
- Explicit status transitions (from Phase 3)

### Integration Points
- New routes: `app/(dashboard)/rentals/charges/...`, `app/(dashboard)/rentals/payments/...`, `app/(dashboard)/rentals/overdue/...`
- New DB modules: `lib/db/rentals-charges.ts`, `lib/db/rentals-payments.ts`
- Update lease detail: Show balance and payment history
- Update tenant detail: Show aggregate balance across leases
- Navigation: Add Charges, Payments, Overdue to rentals nav

</code_context>

<deferred>
## Deferred Ideas

- Automatic scheduled charge generation (cron job) — future phase
- Late fee calculation (fixed or percentage) — future phase
- Payment receipt generation — future phase
- Online payment integration — Phase 5+ (from PROJECT.md)
- Multiple tenants per unit (roommates) — noted in Phase 3

</deferred>

---

*Phase: 04-rent-charges-payments-and-delinquency*
*Context gathered: 2026-03-07*