# Phase 2: Portfolio and Unit Occupancy Management - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver property and unit inventory management for residential units with clear occupancy status tracking and effective-date behavior, including a filterable unit inventory view. This phase implements UNIT-01, UNIT-02, and UNIT-03 only.

</domain>

<decisions>
## Implementation Decisions

### Hierarchy model
- Canonical inventory model is `Property -> Unit` for Phase 2.
- `unit_number` is unique within each property (not globally).
- No standalone building entity in Phase 2.
- Units include optional `building_label` text for grouping context only.
- Required unit creation fields are core set only: property, unit number, unit type, bedroom/bathroom count, status.

### Occupancy rules
- Valid statuses in Phase 2: `Occupied`, `Vacant`, `Unavailable`.
- Status changes support current and future effective dates.
- Status transitions are date-only (no time-of-day precision).
- Overlapping scheduled status entries are blocked and must be explicitly resolved.
- `Unavailable` reason is optional.
- Inventory list shows status effective today; future status is separate context.
- No bulk status update workflows in Phase 2.
- UI history requirement is minimal latest-change metadata only.

### Inventory UX
- Default inventory presentation is table/list view.
- Initial view shows all units, grouped by status.
- In-scope filters: property, status, and text search.
- Default sorting: property then unit number.
- Status shown with colored status badge.
- Empty filtered result shows message-only state.
- Filter state does not persist across visits in Phase 2.

### Create/edit flow
- Create flows use dedicated create pages.
- Forms are full-page forms (not modal/sheet for this phase).
- Unit edit starts by row click to open details, then edit.
- Closing with unsaved edits auto-discards changes silently.

### Claude's Discretion
- Exact copy/labels and small interaction details inside the locked flow choices.
- Exact route naming under dashboard for create/detail/edit pages.
- Minor form layout and spacing details consistent with existing app UI patterns.

</decisions>

<specifics>
## Specific Ideas

- Keep inventory model simple for small landlords while still allowing optional building context via unit-level label.
- Prioritize operational scanning: status-grouped table, predictable sorting, and low-friction filters.
- Use dedicated full-page forms for creation/editing in this phase rather than modal workflows.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/(dashboard)/accounts/page.tsx`: Server-rendered list-page pattern with empty state and card/list organization.
- `app/(dashboard)/accounts/[id]/client.tsx`: Client-side interaction pattern for detail workflows and local UI state.
- `lib/actions/accounts.ts`: Auth-first server action pattern with validation, DB mutations, and `revalidatePath`.
- `lib/db/accounts.ts`: Focused domain query module pattern for list/read operations.
- `components/ui/*` primitives (`table`, `input`, `select`, `button`, `card`, `form`): reusable building blocks for inventory table and forms.

### Established Patterns
- Route pages in dashboard are server components; interactive editing UX handled in colocated client components.
- Server actions call `requireAuth()` first, then validation, then DB, then revalidation.
- Zod validation modules under `lib/validations/*` back action inputs.
- i18n strings maintained in `messages/en.json` and `messages/pt-BR.json`.

### Integration Points
- New Phase 2 routes should live under `app/(dashboard)/rentals/...` and inherit dashboard auth gate.
- New inventory actions should live in `lib/actions/rentals.ts` (created in Phase 1 plan) or adjacent rental action modules.
- New inventory data access should follow `lib/db/*` module pattern (for example `lib/db/rentals.ts` / `lib/db/units.ts`).
- Navigation integration point is `components/dashboard/nav.tsx` for rental inventory entry.

</code_context>

<deferred>
## Deferred Ideas

- Standalone `Building` entity (`Property -> Building -> Unit`) — deferred beyond Phase 2.
- Additional status states like `Reserved` or `Notice` — deferred to future phases.
- Bulk status updates and advanced filter/persistence UX — deferred.

</deferred>

---
*Phase: 02-portfolio-and-unit-occupancy-management*
*Context gathered: 2026-03-07*
