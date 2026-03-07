# Phase 2: Portfolio and Unit Occupancy Management - Research

**Researched:** 2026-03-07
**Domain:** Next.js App Router + PostgreSQL implementation for property/unit inventory and effective-date occupancy state
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Canonical inventory model is `Property -> Unit` for Phase 2.
- `unit_number` is unique within each property (not globally).
- No standalone building entity in Phase 2.
- Units include optional `building_label` text for grouping context only.
- Required unit creation fields are core set only: property, unit number, unit type, bedroom/bathroom count, status.
- Valid statuses in Phase 2: `Occupied`, `Vacant`, `Unavailable`.
- Status changes support current and future effective dates.
- Status transitions are date-only (no time-of-day precision).
- Overlapping scheduled status entries are blocked and must be explicitly resolved.
- `Unavailable` reason is optional.
- Inventory list shows status effective today; future status is separate context.
- No bulk status update workflows in Phase 2.
- UI history requirement is minimal latest-change metadata only.
- Default inventory presentation is table/list view.
- Initial view shows all units, grouped by status.
- In-scope filters: property, status, and text search.
- Default sorting: property then unit number.
- Status shown with colored status badge.
- Empty filtered result shows message-only state.
- Filter state does not persist across visits in Phase 2.
- Create flows use dedicated create pages.
- Forms are full-page forms (not modal/sheet for this phase).
- Unit edit starts by row click to open details, then edit.
- Closing with unsaved edits auto-discards changes silently.

### Claude's Discretion
- Exact copy/labels and small interaction details inside the locked flow choices.
- Exact route naming under dashboard for create/detail/edit pages.
- Minor form layout and spacing details consistent with existing app UI patterns.

### Deferred Ideas (OUT OF SCOPE)
- Standalone `Building` entity (`Property -> Building -> Unit`) - deferred beyond Phase 2.
- Additional status states like `Reserved` or `Notice` - deferred to future phases.
- Bulk status updates and advanced filter/persistence UX - deferred.

</user_constraints>

<research_summary>
## Summary

Phase 2 should be implemented as a new rentals domain that mirrors existing app conventions: server-rendered list/detail pages in `app/(dashboard)`, mutations in `lib/actions/*` with `requireAuth()` first, validation in `lib/validations/*`, and SQL access in `lib/db/*`. Because there is no rentals code yet, the implementation should introduce a clean `properties`, `units`, and `unit_occupancy_statuses` schema slice with query modules and typed models instead of embedding occupancy state directly into `units` only.

The key architectural requirement is effective-date occupancy with overlap prevention while still showing "current status" quickly in inventory. The most robust pattern in this codebase is a normalized status-history table with DB-level protection against date overlap plus service/query helpers that resolve "effective today" and "next scheduled" status for each unit. This satisfies UNIT-02 rules and keeps UNIT-03 list queries predictable.

**Primary recommendation:** Build a dedicated rentals vertical (`app/(dashboard)/rentals`, `lib/actions/rentals.ts`, `lib/db/rentals*.ts`, `lib/validations/rentals*.ts`) backed by `properties` + `units` + `unit_occupancy_statuses` tables, with overlap checks enforced at both Zod/action and SQL levels.
</research_summary>

<standard_stack>
## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `^16.0.0` | App Router pages, server components, server actions | Existing framework for route/data architecture |
| `react` / `react-dom` | `^19.0.0` | Client interactivity for filters/forms/details | Existing UI runtime |
| `@vercel/postgres` | `^0.10.0` | SQL execution and typed query helpers | Existing DB layer in `lib/db/index.ts` |
| `zod` | `^4.3.6` | Input and date/status rule validation | Existing validation pattern in `lib/validations/*` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next-intl` | `^4.4.0` | Labels/messages for new rentals UI | Add `nav`, page, table, form strings |
| `vitest` | `^4.0.18` | Unit tests for validations/actions/db modules | Per-task verification for UNIT-01/02/03 |
| `@playwright/test` | `^1.58.0` | End-to-end inventory/create/edit flows | Validate locked UX and filter behavior |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `lib/actions/rentals.ts` + `lib/db/rentals*.ts` vertical | Extending unrelated modules (`accounts.ts`, `transactions.ts`) | Mixing domains increases coupling and future lease/rent phase risk |
| `unit_occupancy_statuses` history table | `units.status` only | Fails future-effective scheduling and overlap rules |
| DB-backed overlap constraints | Action-only overlap checks | Race conditions can still create overlapping effective-date rows |

**Installation:**
```bash
# No new package dependencies required
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
app/
  (dashboard)/
    rentals/
      page.tsx                    # Unit inventory list, grouped by status, server component
      units/new/page.tsx          # Dedicated full-page create unit flow
      units/[id]/page.tsx         # Unit detail page (latest metadata + scheduled status context)
      units/[id]/edit/page.tsx    # Dedicated full-page edit flow
lib/
  actions/
    rentals.ts                    # Property/unit/status mutations + revalidation
  db/
    rentals-properties.ts         # Property read/write queries
    rentals-units.ts              # Unit read/write queries and inventory query
    rentals-occupancy.ts          # Effective-date status scheduling and overlap-safe writes
  validations/
    rentals-property.ts           # Property create/update schemas
    rentals-unit.ts               # Unit create/update schemas
    rentals-occupancy.ts          # Status transition/date overlap pre-check schemas
  db/
    migrations/
      00x_add_rentals_tables.sql  # properties, units, occupancy statuses, constraints/indexes
```

### Pattern 1: Server List Page + Client Filter Controls
**What:** Keep `app/(dashboard)/rentals/page.tsx` server-rendered for initial inventory load and use a colocated client component for local filter state (`property`, `status`, `search`) without persistence.
**When to use:** UNIT-03 inventory page with initial all-units grouped-by-status view.
**Example files to mirror:**
- `app/(dashboard)/accounts/page.tsx`
- `components/transactions/transaction-table.tsx`

### Pattern 2: Dedicated Full-Page Create/Edit Routes
**What:** Implement create and edit as separate full-page forms, not dialogs. Row click on inventory goes to detail, then edit route.
**When to use:** UNIT-01 create/manage flows and locked UX behavior.
**Example files to mirror:**
- `app/(dashboard)/expense-reports/new/page.tsx`
- `app/(dashboard)/expense-reports/[id]/page.tsx`
- `components/settings/account-manager.tsx` (form field patterns only; not modal flow)

### Pattern 3: Effective-Date Occupancy Timeline with Overlap Guard
**What:** Store occupancy as dated entries in `unit_occupancy_statuses` (`unit_id`, `status`, `effective_date`, `unavailable_reason`, audit columns). Compute current status as latest `effective_date <= CURRENT_DATE`, and future status as earliest `effective_date > CURRENT_DATE`.
**When to use:** UNIT-02 scheduling and UNIT-03 inventory status display.
**Implementation notes:**
- Enforce allowed statuses with SQL `CHECK` and Zod enum.
- Block overlaps by design: one status row per date boundary per unit, and conflict checks before insert/update.
- Keep date as SQL `DATE`, never timestamp.

### Pattern 4: Action Boundary Contract + Revalidation
**What:** All rental server actions call `await requireAuth()` first, validate with Zod, write via `lib/db/*`, then `revalidatePath('/rentals')` plus affected detail/edit paths.
**When to use:** Every rentals mutation action.
**Example files to mirror:**
- `lib/actions/accounts.ts`
- `lib/actions/transactions.ts`

### Anti-Patterns to Avoid
- **Adding `Building` table now:** violates locked phase model.
- **Persisting filter params in local storage/query by default:** violates locked non-persistent filter behavior.
- **Allowing timestamp precision (`TIMESTAMP`) for status effectivity:** violates date-only rule and causes timezone bugs.
- **Encoding future status directly on `units` row:** cannot represent scheduled transitions cleanly.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation and coercion | Custom manual `FormData` parsing in each action | Zod schemas in `lib/validations/rentals-*.ts` | Existing pattern already handles coercion/errors consistently |
| Table primitives and badges | Custom table/status component stack | `components/ui/table.tsx` + existing badge/button primitives | Maintains visual consistency and lower UI risk |
| Auth gating for rentals | New auth helper or custom guards | Existing `requireAuth()` from `lib/auth/session.ts` | Established, tested pattern across dashboard/actions |
| Cache refresh strategy | Custom event/state bus | `revalidatePath` in server actions | Existing Next.js cache invalidation approach in repo |

**Key insight:** This phase should extend existing app conventions, not introduce a second architecture.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Overlap Logic Only in UI/Action
**What goes wrong:** Concurrent requests can still insert conflicting effective-date statuses.
**Why it happens:** Overlap checks done only before insert, without DB-level protection.
**How to avoid:** Add SQL constraint/index strategy plus transaction-safe insert path in `lib/db/rentals-occupancy.ts`.
**Warning signs:** Same unit has conflicting statuses effective on same date range.

### Pitfall 2: Using Timestamps for Effective Dates
**What goes wrong:** "Current status" differs by timezone and day boundaries.
**Why it happens:** `TIMESTAMP` with local conversions instead of canonical `DATE`.
**How to avoid:** Store and compare only SQL `DATE`; enforce `YYYY-MM-DD` format in Zod.
**Warning signs:** User sees different status around midnight or between locales.

### Pitfall 3: Status Grouping After Pagination/Filtering in Wrong Order
**What goes wrong:** Inventory groups become unstable and do not match default sorting requirements.
**Why it happens:** Sorting/grouping done after partial fetch or inconsistent query ORDER BY.
**How to avoid:** Query with deterministic ordering (`property`, `unit_number`), then group in server/client consistently by current status.
**Warning signs:** Same dataset renders in different group order across refreshes.

### Pitfall 4: Modal-Based Create/Edit Drift
**What goes wrong:** UX diverges from locked full-page flow and unsaved-discard behavior.
**Why it happens:** Reusing existing modal patterns (settings/transactions) without phase constraints.
**How to avoid:** Use dedicated routes for create/edit pages and explicit navigation transitions.
**Warning signs:** `Dialog` appears in rentals create/edit implementation.

### Pitfall 5: Missing i18n Keys for New Rentals Surface
**What goes wrong:** Runtime translation failures and inconsistent language support.
**Why it happens:** Added UI without updates to both `messages/en.json` and `messages/pt-BR.json`.
**How to avoid:** Add mirrored key trees (for example `rentals`, `units`, `properties`, status labels) in both locale files.
**Warning signs:** `MISSING_MESSAGE` errors or untranslated fallback text.
</common_pitfalls>

## Validation Architecture

Validation should be task-oriented and mapped directly to UNIT-01, UNIT-02, and UNIT-03 work slices.

### Task A: Data Model + DB Constraints (`UNIT-01`, `UNIT-02` foundation)
- Scope:
  - Add migrations under `lib/db/migrations/` for `properties`, `units`, `unit_occupancy_statuses`.
  - Extend `lib/db/schema.sql` for fresh-init parity.
- Verify:
  - Add/extend DB query tests similar to `__tests__/lib/db/accounts.test.ts` for new rental query modules.
  - Assert unique constraint behavior for `(property_id, unit_number)` and status enum/date checks.
  - Run: `npm test -- --run __tests__/lib/db`

### Task B: Server Actions + Validation (`UNIT-01`, `UNIT-02`)
- Scope:
  - Implement `lib/actions/rentals.ts` with `requireAuth()` first in each action.
  - Add Zod schemas: `lib/validations/rentals-property.ts`, `lib/validations/rentals-unit.ts`, `lib/validations/rentals-occupancy.ts`.
- Verify:
  - Add tests in `__tests__/lib/actions/rentals.test.ts` and `__tests__/lib/validations/rentals-*.test.ts`.
  - Cover: required unit fields, allowed statuses only, date-only format, future/current effective dates allowed, overlapping scheduled status rejected.
  - Run: `npm test -- --run __tests__/lib/actions/rentals.test.ts __tests__/lib/validations`

### Task C: Inventory UX + Routing (`UNIT-03` + locked flow decisions)
- Scope:
  - Build routes under `app/(dashboard)/rentals/*`.
  - Update navigation in `components/dashboard/nav.tsx`.
  - Add i18n keys in `messages/en.json` and `messages/pt-BR.json`.
- Verify:
  - Playwright spec `e2e/10-rentals-units.spec.ts` (new):
    - inventory default shows all units grouped by status;
    - filters by property/status/text work;
    - default sort is property then unit number;
    - empty filtered result shows message-only state;
    - filter state resets on revisit;
    - row click to detail then edit route works;
    - unsaved edit close discards silently.
  - Run: `npm run test:e2e -- e2e/10-rentals-units.spec.ts`

### Task D: End-to-End Integrity (`UNIT-01` + `UNIT-02` + `UNIT-03`)
- Scope:
  - Full journey from create property/unit -> schedule future status -> verify current/future status context in list/detail.
- Verify:
  - Add combined e2e assertions in `e2e/10-rentals-units.spec.ts` or split with `e2e/11-rentals-occupancy.spec.ts`.
  - Confirm no bulk status update surface exists.
  - Run: `npm run test:e2e -- e2e/10-rentals-units.spec.ts e2e/11-rentals-occupancy.spec.ts`

### Phase Exit Verification
- `npm run lint`
- `npm test -- --run`
- `npm run test:e2e`
- Manual DB sanity check query for overlap integrity on `unit_occupancy_statuses` after test fixtures.

<code_examples>
## Code Examples

Verified patterns from this repository:

### Server Action Guard + Validation + Revalidate
```typescript
// Source pattern: lib/actions/transactions.ts
'use server';

export async function createUnit(formData: FormData) {
  await requireAuth();

  const result = unitSchema.safeParse({
    property_id: formData.get('property_id'),
    unit_number: formData.get('unit_number'),
    // ...
  });

  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }

  // DB insert
  revalidatePath('/rentals');
  return { success: true };
}
```

### Server Page Data Load Pattern
```typescript
// Source pattern: app/(dashboard)/accounts/page.tsx
export default async function RentalsPage() {
  const t = await getTranslations('rentals');
  const locale = await getLangFromUrl();
  const units = await getUnitInventory();

  return <RentalsInventoryClient initialUnits={units} locale={locale} />;
}
```

### Query Module Pattern with Typed Return
```typescript
// Source pattern: lib/db/accounts.ts
export async function getUnitsByProperty(propertyId: number): Promise<Unit[]> {
  return queryMany<Unit>(
    'SELECT * FROM units WHERE property_id = $1 ORDER BY unit_number ASC',
    [propertyId]
  );
}
```
</code_examples>

<sota_updates>
## State of the Art (2024-2025)

What's changed recently:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-heavy form submit APIs | App Router server actions for mutations | 2023-2025 | Keep validation + auth close to DB writes |
| Flat current-status fields without schedule history | Effective-date status timeline tables | Common in modern ops tooling | Enables future state scheduling and conflict checks |
| Ad hoc route-level guarding only | Layout-level guard + action-entry auth | App Router era | More reliable protection for both pages and mutations |

**New tools/patterns to consider:**
- Continue using server components for inventory initial fetch, with client filter interactivity for responsive UX.
- Keep date-only occupancy logic strictly in SQL `DATE` + Zod format checks to avoid timezone regressions.

**Deprecated/outdated:**
- Modeling scheduled occupancy with only mutable `units.status` is insufficient for Phase 2 rules.
</sota_updates>

<open_questions>
## Open Questions

1. **Should property management (create/edit/list) ship entirely inside Phase 2 routes or partially in settings?**
   - What we know: Context scope includes property and unit management for UNIT-01.
   - What's unclear: exact UI placement for property CRUD in navigation hierarchy.
   - Recommendation: keep property/unit flows colocated under `app/(dashboard)/rentals/*` to avoid split domain UX.

2. **What exact "latest-change metadata" fields are required for minimal history UI?**
   - What we know: requirement says minimal latest-change metadata only.
   - What's unclear: whether this is `updated_at` only or includes actor/source.
   - Recommendation: default to timestamp + status/effective_date summary now; defer actor-level audit to VIS-02 phase.

3. **Do we need DB-level exclusion constraints for date overlap or a simpler uniqueness+transaction approach?**
   - What we know: overlaps must be blocked explicitly.
   - What's unclear: preferred SQL shape for continuous ranges vs point-in-time transitions.
   - Recommendation: in Phase 2, represent transitions as date points and enforce deterministic single-entry-per-date + conflict checks in transaction, then evolve if range semantics become necessary.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `/Users/mspier/Workspace/maka-admin-panel/.planning/phases/02-portfolio-and-unit-occupancy-management/02-CONTEXT.md` - locked decisions and in-scope UX/flow constraints.
- `/Users/mspier/Workspace/maka-admin-panel/.planning/REQUIREMENTS.md` - UNIT-01/UNIT-02/UNIT-03 requirement scope.
- `/Users/mspier/Workspace/maka-admin-panel/.planning/STATE.md` - milestone and phase planning context.
- `/Users/mspier/Workspace/maka-admin-panel/.planning/codebase/ARCHITECTURE.md`
- `/Users/mspier/Workspace/maka-admin-panel/.planning/codebase/STRUCTURE.md`
- `/Users/mspier/Workspace/maka-admin-panel/.planning/codebase/CONVENTIONS.md`
- `/Users/mspier/Workspace/maka-admin-panel/.planning/codebase/STACK.md`
- `/Users/mspier/Workspace/maka-admin-panel/.planning/codebase/TESTING.md`
- `/Users/mspier/Workspace/maka-admin-panel/.planning/codebase/INTEGRATIONS.md`
- `/Users/mspier/Workspace/maka-admin-panel/.planning/codebase/CONCERNS.md`
- `/Users/mspier/Workspace/maka-admin-panel/CLAUDE.md`

### Repository pattern references (HIGH confidence)
- `/Users/mspier/Workspace/maka-admin-panel/app/(dashboard)/layout.tsx`
- `/Users/mspier/Workspace/maka-admin-panel/app/(dashboard)/accounts/page.tsx`
- `/Users/mspier/Workspace/maka-admin-panel/app/(dashboard)/accounts/[id]/client.tsx`
- `/Users/mspier/Workspace/maka-admin-panel/components/dashboard/nav.tsx`
- `/Users/mspier/Workspace/maka-admin-panel/components/settings/account-manager.tsx`
- `/Users/mspier/Workspace/maka-admin-panel/components/transactions/transaction-table.tsx`
- `/Users/mspier/Workspace/maka-admin-panel/lib/actions/accounts.ts`
- `/Users/mspier/Workspace/maka-admin-panel/lib/actions/transactions.ts`
- `/Users/mspier/Workspace/maka-admin-panel/lib/db/index.ts`
- `/Users/mspier/Workspace/maka-admin-panel/lib/db/accounts.ts`
- `/Users/mspier/Workspace/maka-admin-panel/lib/db/transactions.ts`
- `/Users/mspier/Workspace/maka-admin-panel/lib/db/schema.sql`
- `/Users/mspier/Workspace/maka-admin-panel/lib/db/types.ts`
- `/Users/mspier/Workspace/maka-admin-panel/lib/validations/transactions.ts`
- `/Users/mspier/Workspace/maka-admin-panel/messages/en.json`
- `/Users/mspier/Workspace/maka-admin-panel/messages/pt-BR.json`
- `/Users/mspier/Workspace/maka-admin-panel/__tests__/lib/db/accounts.test.ts`

### Template guidance
- `/Users/mspier/.codex/get-shit-done/templates/research.md`
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Next.js App Router + server actions + Postgres SQL
- Ecosystem: existing repo stack only (no new dependency requirements)
- Patterns: domain-sliced action/db/validation modules, server-page + client interactivity split
- Pitfalls: effective-date overlap, date precision, locked UX drift, i18n and sorting consistency

**Confidence breakdown:**
- Standard stack: HIGH - directly sourced from repo dependencies and usage
- Architecture: HIGH - aligned with existing route/action/db conventions
- Pitfalls: HIGH - derived from locked decisions + known current codebase risks
- Code examples: HIGH - based on in-repo file patterns

**Research date:** 2026-03-07
**Valid until:** 2026-04-06 (30 days; reevaluate if stack or roadmap changes)
</metadata>

---

*Phase: 02-portfolio-and-unit-occupancy-management*
*Research completed: 2026-03-07*
*Ready for planning: yes*
