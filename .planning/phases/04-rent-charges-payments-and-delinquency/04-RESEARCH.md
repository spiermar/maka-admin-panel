# Phase 4: Rent Charges, Payments, and Delinquency - Research

**Researched:** 2026-03-07
**Domain:** Rental property financial operations - rent charge generation, payment recording, balance tracking, delinquency management
**Confidence:** HIGH

## Summary

Phase 4 implements monthly rent operations for landlords: generating charges from active leases, recording manual payments, viewing balances, and identifying overdue accounts. This builds directly on Phase 3's lease management by adding financial tracking. The implementation follows established patterns from existing rentals code: server actions with auth/validation/revalidation, Zod schemas for validation, table-based list views, and full-page forms.

**Primary recommendation:** Implement database schema first (charges and payments tables), then server actions, then validation schemas, then UI pages. Use the hybrid balance approach (stored charges with computed balance) as specified in CONTEXT.md.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Charge Generation Model:** Hybrid approach - charges created as records when user generates them, balance can be recalculated. Manual trigger via "Generate Charges" button.
- **Charge Fields:** Minimal - lease reference, charge date, amount, status (pending/paid)
- **Payment Recording:** Core fields: payment date, amount, payment method (cash, check, bank transfer, other). Partial payments always allowed.
- **Payment Allocation:** Oldest pending charge first (standard accounting)
- **Balance Calculation:** Simple balance = total pending charges minus total payments applied
- **Delinquency Definition:** Due date based, overdue if past due date + grace period. Fixed grace period (global setting, default 5 days). No late fees in Phase 4.
- **Navigation:** New routes: `rentals/charges`, `rentals/payments`, `rentals/overdue`
- **DB Modules:** `lib/db/rentals-charges.ts`, `lib/db/rentals-payments.ts`

### Claude's Discretion
- Exact charge/payment column layout in list views
- Grace period default value and settings location
- Route naming (charges, payments, overdue pages)
- Filter/search behavior on list pages (consistent with Phase 2)

### Deferred Ideas (OUT OF SCOPE)
- Automatic scheduled charge generation (cron job) — future phase
- Late fee calculation (fixed or percentage) — future phase
- Payment receipt generation — future phase
- Online payment integration — Phase 5+
- Multiple tenants per unit (roommates) — noted in Phase 3
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RENT-01 | User can generate monthly rent charges from active lease terms | Implement `rentals-charges.ts` DB module with charge generation from active leases, charges list view, "Generate Charges" button |
| RENT-02 | User can record manual rent payments with payment date, amount, and method | Implement `rentals-payments.ts` DB module with payment recording, payment method enum, payments list view |
| RENT-03 | User can see current balance due per lease and per tenant | Implement balance calculation (charges - payments), display on lease detail, aggregate on tenant detail |
| RENT-04 | User can mark and view overdue balances based on due date and configurable grace period | Implement overdue query with grace period logic, dedicated overdue page |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 | App Router | Framework | Already in use |
| React 19 | - | UI Library | Already in use |
| TypeScript | - | Type Safety | Already in use |
| Zod | Latest | Validation | Already in use for rentals validation |
| @vercel/postgres | Latest | Database | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | Latest | Date calculations | Grace period calculations, date comparisons |
| Intl.NumberFormat | Built-in | Currency formatting | Balance display on UI |

**Installation:**
```bash
npm install date-fns
# (zod and @vercel/postgres already installed)
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── db/
│   ├── rentals-charges.ts    # NEW - Charge CRUD + generation
│   └── rentals-payments.ts   # NEW - Payment CRUD + allocation
├── validations/
│   ├── rentals-charge.ts     # NEW - Zod schemas for charges
│   └── rentals-payment.ts    # NEW - Zod schemas for payments
└── actions/
    └── rentals.ts            # UPDATE - Add charge/payment actions

app/(dashboard)/rentals/
├── charges/
│   ├── page.tsx              # NEW - Charges list + generate button
│   └── [id]/                 # (optional) Charge detail
├── payments/
│   ├── page.tsx              # NEW - Payments list + add button
│   ├── new/
│   │   └── page.tsx          # NEW - Add payment form
│   └── [id]/                 # (optional) Payment detail
├── overdue/
│   └── page.tsx              # NEW - Overdue balances list
└── (update existing)
    ├── leases/[id]/client.tsx  # UPDATE - Add balance display
    └── tenants/[id]/client.tsx # UPDATE - Add aggregate balance

components/
├── rentals/
│   ├── charges-list-table.tsx # NEW - Charges table
│   └── payments-list-table.tsx # NEW - Payments table
```

### Pattern 1: Charge Generation from Active Leases

**What:** Bulk create charge records for a month from all active leases

**When to use:** RENT-01 - generating monthly rent charges

**Implementation approach:**
```typescript
// In lib/db/rentals-charges.ts
import { queryMany } from './index';

export interface RentCharge {
  id: number;
  lease_id: number;
  charge_date: string;     // YYYY-MM-DD
  due_date: string;        // YYYY-MM-DD (charge_date + grace period)
  amount: number;          // From lease.monthly_rent
  status: 'pending' | 'paid';
  created_at: Date;
  updated_at: Date;
}

export async function generateMonthlyCharges(
  year: number,
  month: number,
  gracePeriodDays: number = 5
): Promise<RentCharge[]> {
  // 1. Get all active leases that overlap with the month
  // 2. Create one charge per lease for that month
  // 3. Use executeReturning for bulk insert
}
```

**Source:** Context7 patterns for bulk insert with PostgreSQL + established rental patterns

### Pattern 2: Payment Recording with Allocation

**What:** Record payment and auto-allocate to oldest pending charges

**When to use:** RENT-02 - recording manual payments

**Implementation approach:**
```typescript
// In lib/db/rentals-payments.ts
export interface RentPayment {
  id: number;
  lease_id: number;
  payment_date: string;    // YYYY-MM-DD
  amount: number;
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'other';
  notes: string | null;
  created_at: Date;
}

// Payment allocation: oldest pending charge first
export async function recordPaymentAndAllocate(
  data: CreatePaymentInput
): Promise<RentPayment> {
  // 1. Insert payment record
  // 2. Find pending charges for lease, ordered by due_date ASC
  // 3. Apply payment to charges in order until payment exhausted
  // 4. Update charge statuses (partial payment = still pending)
}
```

### Pattern 3: Balance Calculation

**What:** Compute balance as pending charges minus payments applied

**When to use:** RENT-03 - showing current balance per lease/tenant

**Implementation approach:**
```typescript
// In lib/db/rentals-charges.ts or separate balance module
export async function getLeaseBalance(leaseId: number): Promise<number> {
  const result = await queryOne<{ balance: number }>(
    `SELECT 
       COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0)
       - COALESCE(SUM(allocated_amount), 0) as balance
     FROM charges c
     LEFT JOIN payment_allocations pa ON c.id = pa.charge_id
     WHERE c.lease_id = $1`,
    [leaseId]
  );
  return result?.balance ?? 0;
}

// Or simpler: charges - payments
export async function getLeaseBalanceSimple(leaseId: number): Promise<number> {
  const charges = await queryMany<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM charges WHERE lease_id = $1 AND status = 'pending'`,
    [leaseId]
  );
  const payments = await queryMany<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE lease_id = $1`,
    [leaseId]
  );
  return (charges[0]?.total ?? 0) - (payments[0]?.total ?? 0);
}
```

### Pattern 4: Overdue Detection

**What:** Identify charges past due date + grace period

**When to use:** RENT-04 - viewing overdue balances

**Implementation approach:**
```typescript
// In lib/db/rentals-charges.ts
export interface OverdueBalance {
  lease_id: number;
  tenant_id: number;
  tenant_name: string;
  unit_info: string;
  total_overdue: number;
  oldest_due_date: string;
}

export async function getOverdueBalances(gracePeriodDays: number = 5): Promise<OverdueBalance[]> {
  return queryMany<OverdueBalance>(
    `SELECT 
       c.lease_id,
       l.tenant_id,
       t.name as tenant_name,
       CONCAT(p.name, ' - ', u.unit_number) as unit_info,
       SUM(c.amount) as total_overdue,
       MIN(c.due_date) as oldest_due_date
     FROM charges c
     JOIN leases l ON c.lease_id = l.id
     JOIN tenants t ON l.tenant_id = t.id
     JOIN units u ON l.unit_id = u.id
     JOIN properties p ON u.property_id = p.id
     WHERE c.status = 'pending'
       AND c.due_date < CURRENT_DATE - INTERVAL '1 day' * $1
     GROUP BY c.lease_id, l.tenant_id, t.name, p.name, u.unit_number
     ORDER BY oldest_due_date ASC`,
    [gracePeriodDays]
  );
}
```

### Anti-Patterns to Avoid

- **Storing computed balance as a column:** Balance should be computed from charges and payments, not stored. The CONTEXT.md specifies "hybrid approach: charges are created as records... balance can be recalculated."
- **Requiring full payment only:** CONTEXT.md explicitly allows partial payments - "Landlord can accept any amount"
- **Late fee auto-calculation:** Explicitly deferred - "No late fees in Phase 4"
- **Hardcoded grace period:** Should be configurable (default 5 days) as per CONTEXT.md

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date calculations | Custom date math | date-fns | Grace period math, month boundaries need careful handling |
| Currency formatting | Custom format | Intl.NumberFormat | Built-in, handles locale correctly |
| Form validation | ad-hoc checks | Zod | Already established pattern in project |

**Key insight:** The balance calculation seems simple but needs careful handling of partial payments. A payment may partially cover a charge, leaving both in "pending" status. The allocation logic must handle this correctly.

## Common Pitfalls

### Pitfall 1: Charge Duplication
**What goes wrong:** Generating charges for same month/lease twice creates duplicate records
**Why it happens:** No unique constraint on (lease_id, charge_date, status)
**How to avoid:** Check for existing charges before generating, or add unique constraint
**Warning signs:** Duplicate rows in charges table, balances that don't match expected

### Pitfall 2: Payment Allocation Logic Errors
**What goes wrong:** Payments applied to wrong charges or in wrong order
**Why it happens:** Not ordering by due_date ASC (oldest first) as specified in CONTEXT.md
**How to avoid:** Always order allocation by due_date ASC, handle partial payments correctly
**Warning signs:** New charges showing as paid while older ones remain overdue

### Pitfall 3: Balance Mismatch with Partial Payments
**What goes wrong:** Balance calculation doesn't account for partial payments correctly
**Why it happens:** Simple charge.sum - payment.sum doesn't handle partial allocations
**How to avoid:** Track allocated amount per charge OR recalculate dynamically with payment allocations
**Warning signs:** Balance doesn't match manual calculation from UI

### Pitfall 4: Month Boundary for Charge Generation
**What goes wrong:** Charges generated for wrong month or overlapping leases incorrectly
**Why it happens:** Not checking if lease is active for the target month
**How to avoid:** Verify lease.start_date <= month_end AND lease.end_date >= month_start

## Code Examples

### Validation Schema Pattern (from existing)
```typescript
// lib/validations/rentals-charge.ts
import { z } from 'zod';

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const createChargeSchema = z.object({
  lease_id: z.coerce.number().int().positive('Lease is required'),
  charge_date: dateOnlySchema,
  amount: z.coerce.number().positive('Amount must be positive'),
  status: z.enum(['pending', 'paid']).default('pending'),
});

export type CreateChargeInput = z.infer<typeof createChargeSchema>;
```

### Server Action Pattern (from existing)
```typescript
// In lib/actions/rentals.ts - add new actions
'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { generateMonthlyCharges } from '@/lib/db/rentals-charges';
import { createChargeSchema } from '@/lib/validations/rentals-charge';

export async function generateChargesAction(
  year: number,
  month: number
): Promise<RentalsActionResult> {
  await requireAuth();
  
  try {
    const charges = await generateMonthlyCharges(year, month);
    revalidatePath('/rentals/charges');
    return { success: true, count: charges.length };
  } catch (error) {
    console.error('Failed to generate charges:', error);
    return { success: false, error: 'Failed to generate charges' };
  }
}

export async function createPaymentAction(
  formData: FormData
): Promise<RentalsActionResult> {
  await requireAuth();
  
  const result = createPaymentSchema.safeParse({
    lease_id: getFormValue(formData, 'lease_id'),
    payment_date: getFormValue(formData, 'payment_date'),
    amount: getFormValue(formData, 'amount'),
    payment_method: getFormValue(formData, 'payment_method'),
    notes: getFormValue(formData, 'notes'),
  });
  
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }
  
  try {
    await recordPaymentAndAllocate(result.data);
    revalidatePath('/rentals/payments');
    revalidatePath('/rentals/leases');
    return { success: true };
  } catch (error) {
    return handleDatabaseError(error);
  }
}
```

### List View Pattern (from existing)
```typescript
// app/(dashboard)/rentals/charges/page.tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChargesListTable } from '@/components/rentals/charges-list-table';
import { getAllCharges } from '@/lib/db/rentals-charges';

export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string }>;
}) {
  const t = await getTranslations('rentals');
  const { status, month } = await searchParams;
  
  const charges = await getAllCharges({ status, month });
  
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('charges.title')}</h2>
          <p className="text-muted-foreground">{t('charges.subtitle')}</p>
        </div>
        {/* Generate Charges button triggers modal or navigates to generate page */}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('charges.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChargesListTable charges={charges} lang={lang} />
        </CardContent>
      </Card>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spreadsheet tracking | Database-backed rent operations | This phase | Structured, auditable, no manual sync |
| Manual balance calc | Computed from charges/payments | This phase | Always accurate, no drift |
| No payment allocation | Auto-allocation to oldest charges | This phase | Proper accounting, legal protection |

**Deprecated/outdated:**
- None relevant to this phase

## Open Questions

1. **Grace period storage**
   - What we know: Default 5 days, configurable
   - What's unclear: Where to store the grace period setting (env var, database config table, or hardcoded constant)
   - Recommendation: Start with constant in code, document as "configurable via code constants" for Phase 4

2. **Charge date vs due date semantics**
   - What we know: Both needed - charge_date is when charge is created, due_date is when payment is expected
   - What's unclear: Should due_date always be same as charge_date + grace period, or configurable per charge?
   - Recommendation: Auto-calculate from charge_date + grace period (simple, consistent with CONTEXT.md)

3. **Lease detail balance display location**
   - What we know: Show balance on lease detail page (CONTEXT.md)
   - What's unclear: Show just balance, or also list recent charges/payments?
   - Recommendation: Show balance + recent charges/payments summary (follows existing pattern from lease detail)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RENT-01 | Generate monthly rent charges from active leases | Unit | `npm test -- --run --reporter=verbose --testNamePattern="rentals-charges"` | ❌ Need to create |
| RENT-02 | Record manual rent payments with date, amount, method | Unit | `npm test -- --run --reporter=verbose --testNamePattern="rentals-payments"` | ❌ Need to create |
| RENT-03 | View current balance per lease and tenant | Unit | `npm test -- --run --reporter=verbose --testNamePattern="balance"` | ❌ Need to create |
| RENT-04 | View overdue balances with grace period | Unit | `npm test -- --run --reporter=verbose --testNamePattern="overdue"` | ❌ Need to create |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `__tests__/lib/db/rentals-charges.test.ts` — covers RENT-01, RENT-03, RENT-04
- [ ] `__tests__/lib/db/rentals-payments.test.ts` — covers RENT-02
- [ ] `__tests__/lib/validations/rentals-charge.test.ts` — validation tests
- [ ] `__tests__/lib/validations/rentals-payment.test.ts` — validation tests
- [ ] `__tests__/lib/actions/rentals-charges.test.ts` — action tests

## Sources

### Primary (HIGH confidence)
- Context7: Next.js 16 App Router patterns
- Existing codebase: lib/db/rentals-leases.ts, lib/actions/rentals.ts, lib/validations/rentals-lease.ts
- Existing UI patterns: app/(dashboard)/rentals/leases/page.tsx, app/(dashboard)/rentals/leases/[id]/client.tsx

### Secondary (MEDIUM confidence)
- PostgreSQL date/interval arithmetic for grace period calculations
- Zod validation patterns from existing validations

### Tertiary (LOW confidence)
- N/A - sufficient primary sources

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - Using existing project stack
- Architecture: HIGH - Following established patterns from Phase 3
- Pitfalls: HIGH - Identified from similar rental systems

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30 days - stable domain)