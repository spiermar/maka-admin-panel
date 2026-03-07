# Phase 3: Tenant and Lease Lifecycle Integrity - Research

**Researched:** 2026-03-07
**Domain:** Property management - tenant and lease data models, lifecycle workflows, overlap detection
**Confidence:** HIGH

## Summary

This phase implements tenant management and lease lifecycle workflows for a rental property management system. Key requirements include: creating tenant records linked to units, managing residential leases with start/end dates and financial terms, explicit status transitions (Draft → Pending → Active → Expired/Terminated), and preventing overlapping leases for the same unit.

**Primary recommendation:** Implement tenant and lease as separate related tables, use explicit status transitions, block lease overlaps at creation time using a date range conflict check, and follow existing rental patterns (server actions → db queries → revalidation).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Tenant model:** name, phone, email only (simple contact fields), one tenant per unit, linked to unit via lease record
- **Lease structure:** Lifecycle states: Draft → Pending → Active → Expired/Terminated
- **Required fields:** start date, end date, monthly rent, security deposit
- **Optional fields:** Claude's discretion (lease type, pets, parking, utilities)
- **Lifecycle workflow:** Explicit status changes only (user manually transitions Pending→Active, Active→Terminated/Expired), no auto-transitions based on dates
- **Renewal:** Creates a new lease record (not extending existing)
- **Overlap protection:** Block overlapping leases for same unit with overlapping date ranges at creation time (not retroactive)

### Claude's Discretion
- Exact form field labels and layout
- Tenant search/filter UX details
- Lease list view columns and default sorting
- Route naming for tenant/lease create/detail/edit pages

### Deferred Ideas (OUT OF SCOPE)
- Multiple tenants per unit (roommates) — Phase 4 or later
- Auto-transition leases based on dates — future phase
- Month-to-month rollover handling — future phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEASE-01 | User can create tenant records and link tenants to units | Tenant DB table with name/phone/email, lease table links tenant_id to unit_id |
| LEASE-02 | User can create residential leases with start date, end date, monthly rent, and security deposit | Lease DB table with required fields: start_date, end_date, monthly_rent, security_deposit |
| LEASE-03 | User can renew, terminate, or move-out leases with explicit lifecycle status | Lease status enum with explicit transitions (Draft→Pending→Active→Terminated/Expired) |
| LEASE-04 | User cannot activate overlapping leases for the same unit and overlapping date range | Overlap check query before lease creation: `SELECT ... WHERE unit_id = $1 AND daterange overlaps` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 | App Router | Framework | Per CLAUDE.md - current project version |
| React 19 | Latest | UI Library | Per CLAUDE.md - current project version |
| TypeScript | Latest | Language | Per CLAUDE.md - current project version |
| @vercel/postgres | Latest | PostgreSQL driver | Per CLAUDE.md - current project version |
| Zod | Latest | Validation | Per CLAUDE.md - used in existing validations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| iron-session | Latest | Session management | Already in project - auth via requireAuth() |
| Shadcn UI | Latest | Component library | Per CLAUDE.md - existing UI components |
| Vitest | Latest | Unit testing | Per CLAUDE.md - existing test framework |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New tables for tenant/lease | Use existing schema extensions | Project already has units/properties - clean separation better |

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── db/
│   ├── rentals-tenants.ts    # NEW - Tenant CRUD queries
│   ├── rentals-leases.ts     # NEW - Lease CRUD + overlap check
│   └── types.ts              # UPDATE - Add Tenant, Lease types
├── actions/
│   └── rentals.ts            # UPDATE - Add tenant/lease actions
├── validations/
│   ├── rentals-tenant.ts     # NEW - Tenant Zod schema
│   └── rentals-lease.ts      # NEW - Lease Zod schema
app/(dashboard)/rentals/
├── tenants/
│   ├── page.tsx              # NEW - Tenant list
│   ├── new/
│   │   └── page.tsx          # NEW - Create tenant
│   └── [id]/
│       ├── page.tsx          # NEW - Tenant detail
│       ├── edit/
│       │   └── page.tsx      # NEW - Edit tenant
├── leases/
│   ├── page.tsx              # NEW - Lease list
│   ├── new/
│   │   └── page.tsx          # NEW - Create lease
│   └── [id]/
│       ├── page.tsx          # NEW - Lease detail
│       └── edit/
│           └── page.tsx      # NEW - Edit/transition lease
```

### Pattern 1: Server Actions with Validation
**What:** Follow existing pattern: requireAuth → Zod validation → DB call → revalidatePath
**When to use:** All form submissions for tenant/lease CRUD
**Example:**
```typescript
// Source: lib/actions/rentals.ts - existing pattern
export async function createTenantAction(formData: FormData): Promise<ActionResult> {
  await requireAuth();
  
  const result = createTenantSchema.safeParse({
    name: getFormValue(formData, 'name'),
    phone: getFormValue(formData, 'phone'),
    email: getFormValue(formData, 'email'),
  });
  
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }
  
  try {
    await createTenant(result.data);
    revalidatePath('/rentals/tenants');
    return { success: true };
  } catch (error) {
    return handleDatabaseError(error);
  }
}
```

### Pattern 2: Overlap Protection via Database Query
**What:** Check for overlapping date ranges before creating lease - block at creation time
**When to use:** When creating or updating lease with unit assignment
**Example:**
```typescript
// Source: rental industry standard - date range overlap pattern
export async function checkLeaseOverlap(
  unitId: number, 
  startDate: string, 
  endDate: string,
  excludeLeaseId?: number
): Promise<boolean> {
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM leases 
     WHERE unit_id = $1 
       AND status NOT IN ('Terminated', 'Expired')
       AND (start_date, end_date) OVERLAPS ($2::date, $3::date)
       ${excludeLeaseId ? 'AND id != $4' : ''}`,
    excludeLeaseId 
      ? [unitId, startDate, endDate, excludeLeaseId]
      : [unitId, startDate, endDate]
  );
  return existing !== null;
}
```

### Pattern 3: Explicit Status Transitions
**What:** User manually triggers status changes - no automatic transitions based on dates
**When to use:** All lease lifecycle state changes
**Example:**
```typescript
// Source: CONTEXT.md lifecycle workflow requirement
// Transitions: Draft → Pending → Active → Expired/Terminated
// - Pending→Active: landlord confirms tenant moved in
// - Active→Terminated: early termination
// - Active→Expired: lease ended naturally (no renewal)
export type LeaseStatus = 'Draft' | 'Pending' | 'Active' | 'Expired' | 'Terminated';
```

### Anti-Patterns to Avoid
- **Auto-transitioning leases based on dates:** CONTEXT.md explicitly requires explicit status changes only - no auto-transitions
- **Storing tenant directly on unit:** Tenant links to unit via lease (allows historical tracking)
- **Extending existing lease for renewal:** CONTEXT.md requires renewal creates new lease record

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date overlap detection | Custom overlap algorithm | PostgreSQL OVERLAPS operator | Already supported natively, reliable |
| Session management | Custom auth | iron-session + requireAuth() | Already implemented in project |
| Form validation | Manual validation | Zod | Already used project-wide |

**Key insight:** The OVERLAPS operator in PostgreSQL is the industry standard for date range conflict detection. Using it ensures correctness and is simpler than custom logic.

## Common Pitfalls

### Pitfall 1: Overlap Detection Missing Unit Filter
**What goes wrong:** Overlap check doesn't filter by unit, blocks leases across different units
**Why it happens:** Copy-paste from existing occupancy check without adding unit_id filter
**How to avoid:** Always include unit_id in the overlap WHERE clause
**Warning signs:** "Cannot create lease" errors when creating lease for empty unit

### Pitfall 2: Forgetting to Link Tenant to Unit via Lease
**What goes wrong:** Tenant exists but no lease = tenant not actually linked to unit
**Why it happens:** Creating tenant without immediately creating lease
**How to avoid:** Require lease creation in same flow, or show "no active lease" indicator on tenant detail
**Warning signs:** Tenant list shows tenants without unit assignment

### Pitfall 3: Not Handling Renewal as New Record
**What goes wrong:** Extending existing lease record breaks historical tracking
**Why it happens:** Treating renewal like date update instead of new record
**How to avoid:** Renewal action creates brand new lease, optionally links to previous_lease_id for reference
**Warning signs:** Cannot see previous lease terms when reviewing tenant history

### Pitfall 4: Status Transition Without Validation
**What goes wrong:** Allow invalid transitions (e.g., Draft → Terminated skipping Pending/Active)
**Why it happens:** Not validating state machine rules
**How to avoid:** Validate transition is valid from current status before updating
**Warning signs:** Leases in impossible states in database

## Code Examples

### Tenant Validation Schema
```typescript
// Source: Follows pattern from lib/validations/rentals-unit.ts
import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
});

export const updateTenantSchema = createTenantSchema.partial();

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
```

### Lease Validation Schema
```typescript
// Source: Follows pattern from lib/validations/rentals-occupancy.ts
import { z } from 'zod';

export const leaseStatusSchema = z.enum(['Draft', 'Pending', 'Active', 'Expired', 'Terminated']);

export const createLeaseSchema = z.object({
  tenant_id: z.coerce.number().int().positive('Tenant is required'),
  unit_id: z.coerce.number().int().positive('Unit is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  monthly_rent: z.coerce.number({ invalid_type_error: 'Monthly rent is required' }).positive('Rent must be positive'),
  security_deposit: z.coerce.number({ invalid_type_error: 'Security deposit is required' }).min(0, 'Deposit cannot be negative'),
  // Optional fields - Claude's discretion
  lease_type: z.string().max(50).optional(),
  pets_allowed: z.boolean().optional(),
  pets_deposit: z.coerce.number().min(0).optional(),
  parking_spot: z.string().max(100).optional(),
  utilities_included: z.boolean().optional(),
}).refine(data => new Date(data.end_date) > new Date(data.start_date), {
  message: 'End date must be after start date',
  path: ['end_date'],
});

export const updateLeaseSchema = createLeaseSchema.partial();
export const transitionLeaseSchema = z.object({
  status: leaseStatusSchema,
});
```

### Lease Overlap Check
```typescript
// Source: PostgreSQL OVERLAPS operator documentation
export class LeaseOverlapError extends Error {
  code = 'LEASE_OVERLAP';
}

export async function checkAndCreateLease(data: CreateLeaseInput): Promise<Lease> {
  // Check for overlap with existing non-terminated leases
  const conflict = await queryOne<{ id: number }>(
    `SELECT id FROM leases 
     WHERE unit_id = $1 
       AND status NOT IN ('Terminated', 'Expired')
       AND (start_date, end_date) OVERLAPS ($2::date, $3::date)`,
    [data.unit_id, data.start_date, data.end_date]
  );
  
  if (conflict) {
    throw new LeaseOverlapError(
      'A lease already exists for this unit during the selected date range'
    );
  }
  
  return createLease(data);
}
```

### Client/Server Component Split (Lease Detail Page)
```typescript
// Source: Pattern from app/(dashboard)/rentals/units/[id]/page.tsx
// page.tsx (Server Component)
import { getLeaseById } from '@/lib/db/rentals-leases';
import { getTenantById } from '@/lib/db/rentals-tenants';
import { LeaseDetailClient } from './client';

export default async function LeasePage({ params }: { params: { id: string } }) {
  const lease = await getLeaseById(Number(params.id));
  const tenant = lease ? await getTenantById(lease.tenant_id) : null;
  
  return <LeaseDetailClient lease={lease} tenant={tenant} />;
}

// client.tsx (Client Component) - handles status transitions
'use client';
export function LeaseDetailClient({ lease, tenant }: { lease: Lease; tenant: Tenant | null }) {
  // Form handlers for status transitions, edit mode, etc.
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auto-lease transitions | Explicit status changes only | CONTEXT.md 2026-03-07 | More control for landlord |
| Extend lease for renewal | New lease record for renewal | CONTEXT.md 2026-03-07 | Clean historical record |
| Check overlap at unit level | Check overlap per unit + date range | CONTEXT.md 2026-03-07 | Prevents conflicting leases |

**Deprecated/outdated:**
- Auto-termination based on end_date: Now requires explicit status change

## Open Questions

1. **How to handle the "Optional fields" for lease?**
   - What we know: CONTEXT.md says these are Claude's discretion
   - What's unclear: Which fields are most important for small landlords?
   - Recommendation: Start with lease_type, pets_allowed, parking_spot as optional - defer pets_deposit, utilities_included to later

2. **Should renewal link to previous lease?**
   - What we know: CONTEXT.md says renewal creates new lease record
   - What's unclear: Need previous_lease_id for audit trail?
   - Recommendation: Add optional previous_lease_id column for reference (helps with VIS-02 audit trail)

3. **Default sort order for lease list?**
   - What we know: Default to Active leases first, sorted by end_date (soonest expiring first)
   - What's unclear: N/A - this is Claude's discretion per CONTEXT.md
   - Recommendation: Sort by status (Active first), then end_date ASC

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEASE-01 | Create tenant with name/phone/email, link to unit via lease | Unit | `npm test -- --run --reporter=dot` | Need to create |
| LEASE-02 | Create lease with required fields (start/end date, rent, deposit) | Unit | Same as above | Need to create |
| LEASE-03 | Status transitions: Draft→Pending→Active, Active→Terminated/Expired | Unit | Same as above | Need to create |
| LEASE-04 | Block overlapping leases for same unit/date range | Unit | Same as above | Need to create |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `__tests__/lib/db/rentals-tenants.test.ts` — covers LEASE-01
- [ ] `__tests__/lib/db/rentals-leases.test.ts` — covers LEASE-02, LEASE-03, LEASE-04
- [ ] `__tests__/lib/validations/rentals-tenant.test.ts` — tenant validation
- [ ] `__tests__/lib/validations/rentals-lease.test.ts` — lease validation
- [ ] `__tests__/lib/actions/rentals-tenants.test.ts` — tenant actions
- [ ] `__tests__/lib/actions/rentals-leases.test.ts` — lease actions

## Sources

### Primary (HIGH confidence)
- Project CLAUDE.md - Tech stack and architecture patterns
- lib/actions/rentals.ts - Server action patterns
- lib/db/rentals-occupancy.ts - Overlap protection pattern (OccupancyConflictError)
- lib/validations/rentals-unit.ts - Validation schema patterns
- __tests__/lib/db/rentals-occupancy.test.ts - Test patterns

### Secondary (MEDIUM confidence)
- PostgreSQL OVERLAPS operator: Standard SQL feature for date range overlap detection
- Zod documentation: Current validation library used in project

### Tertiary (LOW confidence)
- N/A - All patterns derived from existing project code

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - All libraries/patterns from existing project
- Architecture: HIGH - Follows established project patterns exactly
- Pitfalls: MEDIUM - Derived from similar occupancy phase, may need validation during implementation

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30 days for stable requirements)