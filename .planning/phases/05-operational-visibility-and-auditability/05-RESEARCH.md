# Phase 5: Operational Visibility and Auditability - Research

**Researched:** 2026-03-08
**Domain:** Dashboard summaries and audit trail for rental operations
**Confidence:** HIGH

## Summary

Phase 5 implements operational visibility (VIS-01) and auditability (VIS-02) for the rental management system. VIS-01 requires adding dashboard summary cards showing vacancy count, occupied count, and delinquent account summaries. VIS-02 requires a new audit_events table and dedicated audit log page to track high-risk rental operations (lease status changes, rent amount edits, payment adjustments).

**Primary recommendation:** Use existing analytics patterns from `lib/analytics/cash-flow.ts` for dashboard summaries. Create a new `audit_events` table in schema.sql and emit audit events from existing server actions in `lib/actions/rentals.ts` using a helper function that logs after successful database mutations.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Summary cards on dashboard: vacancy count, occupied count, delinquent account count
- Use existing dashboard structure (extend from Phase 2/3 patterns)
- Metrics computed from existing queries - no new database tables needed
- Click-through to relevant filtered pages (vacancy → units, delinquent → overdue)
- New audit_events table to track high-risk operations
- Tracked events: lease status changes, rent amount edits, payment adjustments
- Each entry: timestamp, user_id, event_type, entity_type, entity_id, old_value, new_value
- Dedicated audit log page at /rentals/audit with filtering by event type, date range
- Server actions for rental mutations emit audit events after successful completion

### Claude's Discretion
- Exact dashboard card layout and styling
- Audit log pagination and filtering UI
- Whether to show audit details in-line or modal
- How many months of audit history to retain

### Deferred Ideas (OUT OF SCOPE)
- Real-time notifications for critical events — future phase
- Audit event retention policies — could be manual for now
- Export audit logs to CSV — future phase

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIS-01 | User can see vacancy, occupied count, and delinquent-account summaries in dashboard views | Analytics query patterns in lib/analytics/cash-flow.ts, SummaryCards component, existing rental queries in lib/db/rentals-units.ts and rentals-charges.ts |
| VIS-02 | User can see an auditable change history for high-risk rental operations (lease status changes, rent amount edits, payment adjustments) | Server action pattern in lib/actions/rentals.ts, List page patterns for audit log UI, database schema conventions |

</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 (App Router) | Latest | Framework for dashboard and audit pages | Existing project foundation |
| React 19 | Latest | UI components | Existing project foundation |
| Tailwind CSS | Latest | Styling for dashboard cards and tables | Existing project foundation |
| PostgreSQL | Latest | Store audit events | Existing database |
| @vercel/postgres | Latest | Database access | Existing project foundation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `queryMany` / `queryOne` | Existing | Analytics queries for dashboard metrics | Computing vacancy/occupied/delinquent counts |
| `executeReturning` | Existing | Insert audit events | Writing audit log entries |

**Installation:**
No new packages required - all functionality uses existing project infrastructure.

---

## Architecture Patterns

### Recommended Project Structure

```
app/(dashboard)/
├── page.tsx                    # Dashboard - extend with rental summary cards
└── rentals/
    ├── audit/                  # NEW: Audit log page
    │   ├── page.tsx
    │   └── client.tsx          # Optional client-side filtering
    └── ...

lib/
├── analytics/
│   ├── cash-flow.ts            # Existing - financial analytics
│   └── rentals-operations.ts   # NEW: Rental operation summaries
├── db/
│   ├── rentals-operations.ts   # NEW: Analytics queries for VIS-01
│   └── rentals-audit.ts        # NEW: Audit event queries
├── actions/
│   └── rentals.ts              # Modify to emit audit events
└── validations/
    └── rentals-audit.ts        # Optional: validation for audit filters
```

### Pattern 1: Dashboard Analytics Query

**What:** Compute vacancy, occupied, and delinquent counts using existing database tables
**When to use:** VIS-01 dashboard summaries
**Example:**
```typescript
// Source: Based on lib/analytics/cash-flow.ts patterns
import { queryOne, queryMany } from '@/lib/db';

export interface RentalOperationSummary {
  vacant_count: number;
  occupied_count: number;
  unavailable_count: number;
  delinquent_count: number;
}

export async function getRentalOperationSummary(): Promise<RentalOperationSummary> {
  // Get vacancy/occupied/unavailable counts from units table
  const unitStats = await queryOne<{ vacant: string; occupied: string; unavailable: string }>(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'Vacant' THEN 1 ELSE 0 END), 0) as vacant,
       COALESCE(SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END), 0) as occupied,
       COALESCE(SUM(CASE WHEN status = 'Unavailable' THEN 1 ELSE 0 END), 0) as unavailable
     FROM units`
  );

  // Get delinquent accounts (overdue balances)
  const gracePeriodDays = 5;
  const today = new Date();
  today.setDate(today.getDate() - gracePeriodDays);
  const cutoffDate = today.toISOString().split('T')[0];

  const delinquent = await queryOne<{ count: string }>(
    `SELECT COUNT(DISTINCT lease_id)::text as count
     FROM charges
     WHERE status = 'pending' AND due_date < $1`,
    [cutoffDate]
  );

  return {
    vacant_count: parseInt(unitStats?.vacant || '0'),
    occupied_count: parseInt(unitStats?.occupied || '0'),
    unavailable_count: parseInt(unitStats?.unavailable || '0'),
    delinquent_count: parseInt(delinquent?.count || '0'),
  };
}
```

### Pattern 2: Audit Event Emission

**What:** Emit audit events after successful server action mutations
**When to use:** VIS-02 - tracking lease status changes, rent edits, payment adjustments
**Example:**
```typescript
// Source: Based on lib/actions/rentals.ts patterns
import { executeReturning, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

interface AuditEventInput {
  event_type: 'lease_status_change' | 'rent_amount_edit' | 'payment_adjustment';
  entity_type: 'lease' | 'charge' | 'payment';
  entity_id: number;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
}

async function emitAuditEvent(input: AuditEventInput): Promise<void> {
  const session = await getSession();
  if (!session?.user?.id) return;

  await executeReturning(
    `INSERT INTO audit_events (user_id, event_type, entity_type, entity_id, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      session.user.id,
      input.event_type,
      input.entity_type,
      input.entity_id,
      input.old_value ? JSON.stringify(input.old_value) : null,
      input.new_value ? JSON.stringify(input.new_value) : null,
    ]
  );
}
```

### Pattern 3: Audit Log Page

**What:** Filterable list page showing audit events with pagination
**When to use:** VIS-02 - /rentals/audit page
**Example:**
```typescript
// Source: Based on app/(dashboard)/rentals/overdue/page.tsx pattern
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuditEvents, AuditEventFilters } from '@/lib/db/rentals-audit';

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ eventType?: string; startDate?: string; endDate?: string; page?: string }>;
}) {
  const t = await getTranslations('rentals');
  const { eventType, startDate, endDate, page } = await searchParams;
  
  const filters: AuditEventFilters = {
    eventType: eventType as 'lease_status_change' | 'rent_amount_edit' | 'payment_adjustment' | undefined,
    startDate,
    endDate,
  };
  
  const pageNum = page ? parseInt(page, 10) : 1;
  const pageSize = 20;
  const events = await getAuditEvents(filters, pageNum, pageSize);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">{t('audit.title')}</h2>
      
      {/* Filter Controls */}
      <Card>
        <CardContent className="py-4">
          {/* Filter form - uses URL search params */}
        </CardContent>
      </Card>

      {/* Audit Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('audit.events')}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            {/* Event rows */}
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Creating separate analytics service:** Use existing `lib/analytics/` pattern
- **Emitting audit events before DB commit:** Audit events should be emitted AFTER successful database mutations to ensure data integrity
- **Storing large JSON in old_value/new_value:** Keep audit payloads minimal - store only changed fields

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dashboard summaries | Custom aggregation functions | Existing `queryOne`/`queryMany` pattern | Simple SQL aggregation sufficient |
| Audit table creation | Multiple audit tables | Single `audit_events` table with event_type enum | Simplifies queries, consistent with existing schema patterns |
| Server action audit emission | Decorator/wrapper pattern | Simple helper function call after mutation | Lower complexity, clearer control flow |

**Key insight:** This is a small feature scope (2 requirements) - don't over-engineer with complex patterns when simple function calls work.

---

## Common Pitfalls

### Pitfall 1: Incorrect vacancy/occupied count (doesn't account for scheduled changes)
**What goes wrong:** Count shows current status but doesn't account for scheduled occupancy changes
**Why it happens:** Query only checks current status, not future effective dates
**How to avoid:** Use the same LATERAL join pattern from `rentals-units.ts` that considers scheduled status changes
**Warning signs:** Dashboard shows occupied units that are scheduled to vacate

### Pitfall 2: Audit events emitted before transaction commits
**What goes wrong:** Audit shows change even if DB mutation fails
**Why it happens:** Calling audit helper before awaiting DB mutation
**How to avoid:** Place audit emission AFTER successful database operation (after `await` returns)
**Warning signs:** Audit log shows events that didn't actually persist

### Pitfall 3: Audit log missing pagination
**What goes wrong:** Page becomes slow with large audit history
**Why it happens:** Loading all audit events at once
**How to avoid:** Implement OFFSET/LIMIT pagination or cursor-based pagination
**Warning signs:** Slow load times on /rentals/audit page

---

## Code Examples

### Dashboard Summary Card Component Extension
```typescript
// Source: Based on components/dashboard/summary-cards.tsx
import { getRentalOperationSummary } from '@/lib/analytics/rentals-operations';

export async function RentalSummaryCards() {
  const summary = await getRentalOperationSummary();
  
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Vacant Units
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.vacant_count}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Occupied Units
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.occupied_count}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Delinquent Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {summary.delinquent_count}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Audit Events Table Schema Addition
```sql
-- Source: Based on lib/db/schema.sql patterns
-- Add to schema.sql

-- Audit events table for tracking high-risk rental operations
CREATE TABLE audit_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'lease_status_change',
    'rent_amount_edit',
    'payment_adjustment'
  )),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('lease', 'charge', 'payment')),
  entity_id INTEGER NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_events_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_created ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_user ON audit_events(user_id);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No rental operation visibility | Dashboard summaries for vacancy/occupied/delinquent | VIS-01 (this phase) | Immediate operational visibility |
| No audit trail for rentals | Audit events table with server action emission | VIS-02 (this phase) | Trackable high-risk changes |

**Deprecated/outdated:**
- Manual tracking of rental changes in external spreadsheets (now replaced with audit trail)

---

## Open Questions

1. **How should the audit page handle JSONB values in old_value/new_value?**
   - What we know: PostgreSQL JSONB stores structured data
   - What's unclear: Display format in UI - modal vs inline expansion
   - Recommendation: Use modal for JSON detail view (Claude's discretion per CONTEXT.md)

2. **Should we track unit status changes in audit?**
   - What we know: Not explicitly listed in CONTEXT.md as tracked events
   - What's unclear: User might want visibility into unit availability changes
   - Recommendation: Keep scope limited to CONTEXT.md decisions (lease, rent, payment only) - can expand later

---

## Validation Architecture

> Included since workflow.nyquist_validation is not explicitly set to false in config.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIS-01 | Dashboard shows vacancy count | Unit | Test `getRentalOperationSummary` returns correct counts | ❌ Create analytics test |
| VIS-01 | Dashboard shows occupied count | Unit | Test `getRentalOperationSummary` returns correct counts | ❌ Create analytics test |
| VIS-01 | Dashboard shows delinquent count | Unit | Test `getRentalOperationSummary` returns correct counts | ❌ Create analytics test |
| VIS-02 | Audit events created on lease status change | Integration | Test `emitAuditEvent` called after `transitionLeaseStatus` | ❌ Create audit test |
| VIS-02 | Audit events created on rent amount edit | Integration | Test `emitAuditEvent` called after `updateLease` (rent change) | ❌ Create audit test |
| VIS-02 | Audit events created on payment adjustment | Integration | Test `emitAuditEvent` called after `createPaymentAction` | ❌ Create audit test |
| VIS-02 | Audit log page displays events | E2E | `npm run test:e2e` (via existing test runner) | ❌ Create e2e test |

### Sampling Rate
- **Per task commit:** Unit tests for analytics and audit functions
- **Per wave merge:** Full suite (`npm test -- --run && npm run test:e2e`)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `__tests__/analytics/rentals-operations.test.ts` — tests VIS-01 dashboard summaries
- [ ] `__tests__/db/rentals-audit.test.ts` — tests VIS-02 audit event emission
- [ ] `e2e/audit.spec.ts` — E2E tests for audit log page
- [ ] `e2e/dashboard-rentals.spec.ts` — E2E tests for dashboard rental summaries

---

## Sources

### Primary (HIGH confidence)
- lib/analytics/cash-flow.ts - Existing analytics query patterns
- lib/actions/rentals.ts - Server action patterns for mutations
- lib/db/rentals-units.ts - Unit inventory query patterns
- lib/db/rentals-charges.ts - Delinquent balance query patterns
- app/(dashboard)/page.tsx - Dashboard page structure
- app/(dashboard)/rentals/overdue/page.tsx - List page pattern

### Secondary (MEDIUM confidence)
- Project CLAUDE.md - Tech stack and coding conventions
- .planning/phases/05-operational-visibility-and-auditability/05-CONTEXT.md - Requirements

### Tertiary (LOW confidence)
- None required - sufficient context from project codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing project infrastructure
- Architecture: HIGH - Follows established patterns from prior phases
- Pitfalls: HIGH - Based on existing code patterns and common SQL/React patterns

**Research date:** 2026-03-08
**Valid until:** 30 days (stable domain - audit logging is well-understood pattern)