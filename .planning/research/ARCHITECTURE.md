# Architecture Research

**Domain:** Rental operations in Next.js admin panel
**Researched:** 2026-03-07
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Presentation Layer (Next.js App)                │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │
│  │ app/(dashboard)/  │  │ components/rental │  │ messages/*.json │ │
│  │ rentals/* routes  │  │ UI + client forms │  │ i18n labels     │ │
│  └─────────┬─────────┘  └─────────┬─────────┘  └────────┬────────┘ │
│            │                      │                     │           │
├────────────┴──────────────────────┴─────────────────────┴───────────┤
│             Application Layer (Server Actions + Validation)         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ lib/actions/rentals.ts + lib/validations/rentals.ts           │ │
│  │ auth gate, input validation, orchestration, path revalidation  │ │
│  └───────────────────────────────┬─────────────────────────────────┘ │
├───────────────────────────────────┴───────────────────────────────────┤
│                Data Layer (DB Access + Schema + Types)              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│  │ lib/db/rentals.ts│  │ lib/db/schema.sql│  │ lib/db/types.ts    │ │
│  │ queries/mutations│  │ rental tables    │  │ rental interfaces   │ │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `app/(dashboard)/rentals/*` | Server-rendered entry points for rental operations | Async server components, `requireAuth()`, DB reads |
| `components/rentals/*` | UI composition for lists, detail views, forms | Client components calling server actions |
| `lib/actions/rentals.ts` | Mutation workflow + cache invalidation | Server actions with `requireAuth`, Zod parse, `revalidatePath` |
| `lib/validations/rentals.ts` | Input contract and domain rules | Zod schemas with coercion and guardrails |
| `lib/db/rentals.ts` | Query boundary for rental domain | SQL helpers via `queryOne/queryMany/execute/executeReturning` |
| `lib/db/schema.sql` | Persistence model | PostgreSQL tables, FKs, indexes |
| `lib/db/types.ts` | Shared TypeScript contracts | Interfaces for rows and joined read models |

## Recommended Project Structure

```
app/
├── (dashboard)/
│   ├── rentals/page.tsx              # rental operations list/overview
│   ├── rentals/[rentalId]/page.tsx   # rental operation detail
│   └── rentals/new/page.tsx           # create operation flow
components/
├── rentals/
│   ├── rental-operations-list.tsx    # table/list UI
│   ├── rental-operation-form.tsx     # create/edit form UI
│   └── rental-operation-filters.tsx  # status/date/property filters
lib/
├── actions/rentals.ts                # server actions for rental mutations
├── db/rentals.ts                     # SQL accessors for rental domain
├── validations/rentals.ts            # Zod schemas for rental payloads
└── db/types.ts                       # rental interfaces and joined views
messages/
├── en.json                           # nav/rentals labels
└── pt-BR.json                        # localized rental labels
```

### Structure Rationale

- **Route-group alignment:** Keeps rental operations in the protected `app/(dashboard)` pattern already used by accounts and expense reports.
- **Action/DB split:** Preserves current architecture where actions handle auth/validation/revalidation and db modules own SQL.
- **Domain-scoped UI folder:** Isolates rental UI from transactions/settings while reusing shared `components/ui` primitives.
- **Type + validation locality:** Makes contracts explicit and testable before wiring to pages.

## Architectural Patterns

### Pattern 1: Server Component Read, Client Component Mutate

**What:** Fetch list/detail data in server components; pass to client components that submit mutations through server actions.
**When to use:** Primary rental pages where SEO is irrelevant but first paint with hydrated data is useful.
**Trade-offs:** Clean read/write separation and less client fetching; requires careful prop shaping and path revalidation.

**Example:**
```typescript
// app/(dashboard)/rentals/page.tsx
await requireAuth();
const ops = await getRentalOperations();
return <RentalOperationsList operations={ops} />;
```

### Pattern 2: Action Guardrail Pipeline

**What:** `requireAuth` -> Zod validation -> DB mutation -> `revalidatePath`.
**When to use:** Every create/update/delete operation for rentals.
**Trade-offs:** Consistent behavior and security; extra boilerplate per action.

**Example:**
```typescript
// lib/actions/rentals.ts
export async function createRentalOperation(formData: FormData) {
  await requireAuth();
  const parsed = rentalOperationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, errors: parsed.error.flatten().fieldErrors };
  await db.createRentalOperation(parsed.data);
  revalidatePath('/rentals');
  return { success: true };
}
```

### Pattern 3: DB Module as Domain Boundary

**What:** SQL is centralized in `lib/db/rentals.ts`; UI and actions never embed SQL.
**When to use:** All rental reads/mutations, especially joins with accounts/transactions.
**Trade-offs:** Strong encapsulation and simpler testing; adds an extra function hop.

## Data Flow

### Request Flow

```
[Dashboard User opens /rentals]
    ↓
[app/(dashboard)/rentals/page.tsx]
    ↓ requireAuth()
[lib/db/rentals.ts getRentalOperations]
    ↓
[PostgreSQL rental tables + joins]
    ↓
[Typed result mapped to UI props]
    ↓
[components/rentals/rental-operations-list.tsx render]
```

### State Management

```
[Server-rendered page data]
    ↓ (props)
[Client form/list components]
    ↓ (submit FormData)
[Server action in lib/actions/rentals.ts]
    ↓
[DB mutation + revalidatePath('/rentals', '/rentals/[id]')]
    ↓
[Next.js cache refresh + rerender]
```

### Key Data Flows

1. **Create rental operation:** Form -> server action parse -> `db.createRentalOperation` -> revalidate list/detail.
2. **Update status/payment metadata:** Row action -> guarded action -> transactional update -> rerender affected pages.
3. **Link to ledger records:** Rental operation stores foreign keys (account/transaction/expense-report if needed) -> read model join in `db/rentals.ts` -> unified operations view.

## Component Boundaries

| Boundary | Owns | Does Not Own |
|----------|------|--------------|
| `app/(dashboard)/rentals/*` | Route-level composition, initial data fetch, auth gate | Business-rule validation, mutation orchestration internals |
| `components/rentals/*` | Interaction UX, local form state, optimistic UX if added | Direct SQL, direct auth checks |
| `lib/actions/rentals.ts` | Mutation orchestration and side effects (`revalidatePath`) | Raw table schema definitions |
| `lib/db/rentals.ts` | SQL, joins, persistence shaping | HTTP/session concerns, UI formatting |
| `lib/validations/rentals.ts` | Input constraints and user-facing field errors | DB connectivity, cache revalidation |

## Build Order

1. **Define data model:** Add rental domain tables/columns and indexes in `lib/db/schema.sql` plus matching TS interfaces in `lib/db/types.ts`.
2. **Create DB boundary:** Implement `lib/db/rentals.ts` with minimal read/write primitives and join helpers.
3. **Add validation contracts:** Add `lib/validations/rentals.ts` for create/update/status transitions.
4. **Implement server actions:** Add `lib/actions/rentals.ts` using existing auth + revalidation pattern.
5. **Ship route skeletons:** Add `app/(dashboard)/rentals/page.tsx`, `[rentalId]/page.tsx`, `new/page.tsx` with server-side fetch.
6. **Build domain UI components:** Add `components/rentals/*` and wire actions/forms.
7. **Integrate navigation + i18n:** Update dashboard nav and message catalogs for rental labels.
8. **Add tests:** DB tests for query correctness, action tests for validation/auth behavior, UI tests for primary flows.
9. **Harden and optimize:** Add missing indexes based on query plans and tune revalidation scopes.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k operations/month | Monolith with current server actions + PostgreSQL is sufficient |
| 1k-100k operations/month | Add focused indexes (status/date/property), pagination, and filtered query endpoints in `db/rentals.ts` |
| 100k+ operations/month | Consider read-model materialization and background jobs for heavy aggregates before splitting services |

### Scaling Priorities

1. **First bottleneck:** Unindexed list filters; fix with composite indexes and cursor pagination.
2. **Second bottleneck:** Over-broad cache revalidation; fix by narrowing `revalidatePath` and isolating detail/list refresh paths.

## Anti-Patterns

### Anti-Pattern 1: Mixing SQL into Server Actions

**What people do:** Write ad-hoc SQL directly in `lib/actions/rentals.ts`.
**Why it's wrong:** Couples orchestration to persistence and duplicates query logic.
**Do this instead:** Keep SQL in `lib/db/rentals.ts`; actions call DB methods only.

### Anti-Pattern 2: Skipping Validation for Internal Forms

**What people do:** Trust client-side inputs because form is in admin UI.
**Why it's wrong:** Breaks data integrity and makes server-side behavior inconsistent.
**Do this instead:** Parse every mutation with `lib/validations/rentals.ts` before DB calls.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| PostgreSQL via `@vercel/postgres` | SQL helper wrapper in `lib/db/index.ts` | Reuse existing query helpers and transaction patterns |
| Session auth via `iron-session` | `requireAuth()` in page/action entry points | Keep all rental routes under dashboard auth boundary |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `components/rentals` ↔ `lib/actions/rentals.ts` | Server action calls with `FormData` | Return shape should match existing `{ success, errors?, error? }` pattern |
| `lib/actions/rentals.ts` ↔ `lib/db/rentals.ts` | Direct function calls | DB module remains the only SQL owner |
| `app/(dashboard)/rentals/*` ↔ `lib/db/rentals.ts` | Server component async reads | Prefer typed read models for list/detail pages |
| `components/dashboard/nav.tsx` ↔ rentals routes | Link configuration | Keep `lang` query propagation consistent |

## Sources

- Existing project README and route/module structure in this repository
- `app/(dashboard)` route/auth pattern (`app/(dashboard)/layout.tsx`, `lib/auth/session.ts`)
- Server action conventions (`lib/actions/accounts.ts`, `lib/actions/transactions.ts`, `lib/actions/expense-reports.ts`)
- DB abstraction and schema conventions (`lib/db/index.ts`, `lib/db/schema.sql`, `lib/db/types.ts`)
- i18n/navigation conventions (`components/dashboard/nav.tsx`, `messages/en.json`, `lib/i18n/*`)

---
*Architecture research for: rental operations integration into existing Next.js admin panel*
*Researched: 2026-03-07*
