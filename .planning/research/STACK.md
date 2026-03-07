# Stack Research

**Domain:** Residential rental operations (v1), small landlords
**Researched:** 2026-03-07
**Confidence:** MEDIUM-HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js (App Router) | 16.x (current: 16.0.0) | Admin UI, server actions, API routes | Already in production stack; minimizes migration risk and keeps rental features consistent with existing auth/i18n patterns. |
| React | 19.x (current: 19.0.0) | Component model for dashboards, leases, units, tenants | Matches current panel, strong ecosystem, and good fit for incremental feature rollout in existing UI architecture. |
| PostgreSQL | 15+ (service: Vercel Postgres-compatible) | Source of truth for properties, units, leases, charges, payments | Relational model is the safest fit for rental ledgers, constraints, and auditability needed for finance-adjacent workflows. |
| Zod | 4.x (current: 4.3.6) | Runtime schema validation for forms/actions | Prevents malformed lease/payment inputs and keeps validation shared between form and server boundaries. |
| React Hook Form | 7.x (current: 7.71.1) | Complex form handling (lease setup, move-in/out, charge setup) | Already used; integrates directly with Zod and reduces custom form-state bugs for high-field workflows. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.x | Query caching, mutation retries, optimistic updates | Use for read-heavy operator views (units, tenants, rent roll) and mutation UX requiring immediate feedback. |
| date-fns + date-fns-tz | 3.x + 3.x | Billing cycles, due dates, grace periods, timezone-safe date math | Use for all lease schedule calculations; avoid manual Date arithmetic. |
| decimal.js | 10.x | Exact currency math for charges, fees, allocations | Use in all ledger calculations to avoid floating-point rounding errors. |
| drizzle-orm + drizzle-kit | 0.4x + 0.3x | Typed SQL access and schema migrations | Use if introducing a formal data layer/migrations beyond raw SQL scripts. |
| @simplewebauthn/browser + @simplewebauthn/server | 13.x + 13.x | Phishing-resistant MFA for admin accounts | Use once baseline password auth is stable and v1 role model is in place. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest (current) | Unit and integration tests for domain logic | Add focused suites for rent schedule generation, proration, and payment allocation edge cases. |
| Playwright (current) | E2E validation of lease-to-payment workflows | Cover critical paths: create lease, post charge, record payment, produce delinquency view. |
| ESLint + TypeScript (current) | Guardrails for reliability in finance-adjacent code | Tighten rules around `any`, date handling, and unsafe numeric operations in ledger modules. |

## Installation

```bash
# Supporting runtime packages
npm install @tanstack/react-query date-fns date-fns-tz decimal.js

# Optional typed DB layer + migrations
npm install drizzle-orm
npm install -D drizzle-kit

# Optional MFA hardening
npm install @simplewebauthn/browser @simplewebauthn/server
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| PostgreSQL | Firestore / DynamoDB | If product scope is mostly document-centric and financial reporting constraints are minimal. |
| React Hook Form + Zod | Formik + Yup | If team has deep existing Formik expertise and limited need for shared TS-first schema logic. |
| decimal.js | integer-cents only | If all amounts are guaranteed 2-decimal fiat with no tax-rate precision or split-allocation complexity. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Floating-point currency math (`number` for ledger totals) | Causes reconciliation drift and hard-to-debug rounding errors | `decimal.js` or strict integer-cents strategy |
| Event-sourced/CQRS architecture in v1 | Adds major complexity beyond small-landlord operational needs | Single relational write model with explicit audit columns |
| Multi-tenant microservices early | Premature ops burden for residential-first small-landlord scope | Modular monolith inside current Next.js app |
| Client-only authorization checks | Security gap for sensitive tenant/payment operations | Server-side authorization in actions/routes with role checks |

## Stack Patterns by Variant

**If serving 1-200 units (v1 target):**
- Use modular monolith + PostgreSQL + server actions.
- Because deployment and operational overhead stay low while preserving data correctness.

**If approaching 1k+ units or multiple operators per landlord:**
- Introduce queue-backed async jobs (statement generation, reminders) and stronger read caching.
- Because heavy periodic processing and broader concurrency start to impact interactive admin performance.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| next@16.x | react@19.x | Keep both in same major track to avoid runtime/SSR mismatch. |
| react-hook-form@7.x | @hookform/resolvers@5.x | Stable resolver integration for Zod schemas. |
| zod@4.x | @hookform/resolvers@5.x | Current resolver supports Zod v4 schema adapters. |
| drizzle-orm@0.4x | drizzle-kit@0.3x | Pin tested pair in lockfile before generating migrations. |

## Sources

- Existing project dependency baseline (`package.json`) — compatibility and upgrade-risk alignment
- Next.js/React/Zod/RHF official docs (industry standard behavior and integration patterns) — medium confidence
- Common rental-ops system design patterns (ledger accuracy, date correctness, relational modeling) — medium confidence

---
*Stack research for: residential rental operations (small landlords, v1)*
*Researched: 2026-03-07*
