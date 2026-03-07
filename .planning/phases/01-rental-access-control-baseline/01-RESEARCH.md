# Phase 1: Rental Access Control Baseline - Research

**Researched:** 2026-03-07
**Domain:** Next.js authentication gating for dashboard routes and server actions
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- No RBAC implementation in this project.
- Treat all logged-in users as admins for rental features.
- Enforce authentication-only gating for rental routes and rental server actions.
- Protect rental pages and mutations with existing auth checks.
- Do not add role tables, permission matrices, or per-feature authorization rules in this phase.
- Unauthenticated users follow existing app behavior (redirect to login or forbidden by existing middleware/action flow).
- No role-based denied state is needed because role differentiation is out of scope.

### Claude's Discretion
- Where to apply existing `requireAuth()` checks in new rental routes/actions.
- Any minimal consistency updates needed to keep auth enforcement uniform.

### Deferred Ideas (OUT OF SCOPE)
- Role-based access control (RBAC) for differentiated user personas - future phase only if product scope changes.

</user_constraints>

<research_summary>
## Summary

This phase should extend existing auth enforcement patterns already used in the app rather than introducing any new permission model. The current architecture already has a strong baseline: dashboard route protection in [`app/(dashboard)/layout.tsx`](app/(dashboard)/layout.tsx), centralized session/auth checks in [`lib/auth/session.ts`](lib/auth/session.ts), and server-action entrypoint protection across `lib/actions/*`.

The implementation pattern for rental features is clear: keep all rental UI under dashboard routing so route-level auth is inherited, and call `await requireAuth()` at the top of every rental server action before any validation, reads, writes, or cache revalidation. This preserves consistency with existing actions such as [`lib/actions/transactions.ts`](lib/actions/transactions.ts) and [`lib/actions/expense-reports.ts`](lib/actions/expense-reports.ts).

**Primary recommendation:** Implement rental access as authentication-only by reusing `requireAuth()` in both dashboard routes and every rental mutation/read server action, with zero role checks.
</research_summary>

<standard_stack>
## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `^16.0.0` | App Router, server actions, redirects | Framework used throughout this codebase |
| `react` / `react-dom` | `^19.0.0` | UI runtime | Baseline app runtime |
| `iron-session` | `^8.0.4` | Cookie-backed session management | Already integrated in `lib/auth/session.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^4.3.6` | Input validation in actions | Parse rental form payloads after auth check |
| `vitest` | `^4.0.18` | Unit/integration test runner | Auth utility and server action behavior tests |
| `@playwright/test` | `^1.58.0` | E2E auth flow and route gating | Validate redirects + authenticated rental access |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `requireAuth()` gate in action entrypoints | Middleware-only auth for all access | Middleware does not replace explicit server action auth checks |
| Auth-only model (current scope) | RBAC claims/permission matrix | Out of scope and violates locked phase decisions |

**Installation:**
```bash
# No new packages required for this phase
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
app/
  (dashboard)/
    layout.tsx               # Global dashboard auth gate via requireAuth()
    rentals/                 # Rental pages inherit dashboard auth gate
      page.tsx
      [id]/page.tsx
lib/
  auth/
    session.ts               # requireAuth(), getCurrentUser(), session handling
  actions/
    rentals.ts               # Rental server actions, each starts with requireAuth()
```

### Pattern 1: Dashboard Layout Gate + Nested Rental Routes
**What:** Place rental pages under `app/(dashboard)/...` and rely on existing `await requireAuth()` in the dashboard layout.
**When to use:** All rental UI pages that should only be visible to logged-in users.
**Example:**
```typescript
// Source: app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
```

### Pattern 2: Server Action Entry Guard
**What:** In each rental server action, call `await requireAuth()` as the first executable line.
**When to use:** Every rental create/update/delete action and protected read action.
**Example:**
```typescript
// Source pattern: lib/actions/transactions.ts
'use server';

export async function createRental(formData: FormData) {
  await requireAuth();
  // validate input, execute DB operations, revalidate paths
}
```

### Pattern 3: Optional Current User After Auth
**What:** If mutation data needs `userId`, call `getCurrentUser()` after `requireAuth()`.
**When to use:** When records must store creator/approver/actor identity.
**Example:**
```typescript
// Source pattern: lib/actions/expense-reports.ts
await requireAuth();
const user = await getCurrentUser();
if (!user) return { success: false, error: 'Not authenticated' };
```

### Anti-Patterns to Avoid
- **Adding role logic in Phase 1:** No `role`, `permissions`, or policy checks in session, DB, or UI.
- **Skipping action-level auth because route is protected:** Server actions must still enforce auth at action boundary.
- **Scattering custom redirect logic:** Use existing `requireAuth()` redirect behavior (`/login`) for consistency.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route protection | Custom per-page auth wrappers | `app/(dashboard)/layout.tsx` + `requireAuth()` | Existing shared gate already protects dashboard pages |
| Session validation/invalidation | New cookie/session utilities | `lib/auth/session.ts` | Existing implementation already handles redirect + session version invalidation |
| Action authorization framework | New policy engine / RBAC map | Direct `await requireAuth()` in rental actions | Locked scope is auth-only; extra layer adds risk and drift |

**Key insight:** This phase is about consistent reuse of proven auth gates, not introducing a new authorization system.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Rental Routes Outside Dashboard Segment
**What goes wrong:** Rental page is accessible without dashboard auth gate.
**Why it happens:** Route created outside `app/(dashboard)` or in a parallel segment without auth.
**How to avoid:** Keep rental UI pages under `app/(dashboard)/rentals/*`.
**Warning signs:** Unauthenticated browser request to rental URL does not redirect to `/login`.

### Pitfall 2: Missing `requireAuth()` in New Server Action
**What goes wrong:** Unauthenticated mutation/read can execute server-side code path.
**Why it happens:** Developer assumes route-level auth is sufficient.
**How to avoid:** Make `await requireAuth()` the first line in every exported rental action.
**Warning signs:** Unit tests can call action without session and avoid redirect/error behavior.

### Pitfall 3: Sneaking in Role-Based Branching
**What goes wrong:** Code introduces hidden RBAC (`if user.role !== 'admin'`) contrary to phase constraints.
**Why it happens:** Habit from other projects.
**How to avoid:** Treat any logged-in user as allowed and defer role differentiation.
**Warning signs:** New DB columns, TypeScript role types, or permission helper functions appear in phase diff.
</common_pitfalls>

## Validation Architecture

Validation for this phase should combine unit-level auth enforcement checks with browser-level flow verification.

### Unit/Integration (Vitest)
- Extend auth utility tests in [`__tests__/lib/auth/session.test.ts`](__tests__/lib/auth/session.test.ts) when needed for `requireAuth` expectations.
- Add rental action tests in `__tests__/lib/actions/rentals.test.ts` following current action test style:
  - unauthenticated call triggers redirect behavior via `requireAuth()`.
  - authenticated call proceeds to validation/DB branch.
  - no role-based branching exists in test matrix.
- Keep middleware tests unchanged unless rental endpoints introduce new CSRF-relevant request paths; baseline pattern is in [`__tests__/middleware.test.ts`](__tests__/middleware.test.ts).

### End-to-End (Playwright)
- Add rental access scenarios in `e2e/*` using the existing auth helper flow from [`e2e/01-auth.spec.ts`](e2e/01-auth.spec.ts):
  - unauthenticated visit to rental route redirects to `/login`.
  - authenticated user can open rental pages and execute rental mutations.
  - no admin-role UI state variants are tested because RBAC is out of scope.

### Verification Commands
- `npm run test -- __tests__/lib/auth/session.test.ts`
- `npm run test -- __tests__/lib/actions/rentals.test.ts`
- `npm run test:e2e -- e2e/01-auth.spec.ts`
- Optional targeted rental e2e spec once added: `npm run test:e2e -- e2e/10-rentals-auth.spec.ts`

### Exit Criteria
- Every rental server action contains `await requireAuth()` at entry.
- Rental pages live under dashboard layout and inherit layout auth gate.
- Unauthenticated users are redirected/blocked via existing behavior; authenticated users can proceed.
- No role or permission primitives introduced in schema, session types, or UI gating.

<code_examples>
## Code Examples

Verified patterns from this repository:

### Route-Level Protection at Dashboard Boundary
```typescript
// Source: app/(dashboard)/layout.tsx
import { requireAuth } from '@/lib/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <div>{children}</div>;
}
```

### Action-Level Protection at Mutation Boundary
```typescript
// Source: lib/actions/transactions.ts
export async function createTransaction(formData: FormData) {
  await requireAuth();
  // parse, validate, write, revalidate
}
```

### Session Redirect + Invalidation
```typescript
// Source: lib/auth/session.ts
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId) redirect('/login');
  // sessionVersion check and redirect on mismatch
  return { userId: session.userId, username: session.username, sessionVersion: session.sessionVersion };
}
```
</code_examples>

<sota_updates>
## State of the Art (2024-2025)

What's changed recently:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API Routes + client fetch mutations | Next.js Server Actions in App Router | 2023-2025 mainstream adoption | Auth should be enforced directly in server action entrypoints |
| Ad-hoc page guards | Segment-level layout guards + shared auth helpers | App Router era | Centralized route protection with less duplication |
| Early role scaffolding before feature baseline | Auth-first baseline, role model only when required | Current product-scope best practice | Prevents overengineering and respects locked phase scope |

**New tools/patterns to consider:**
- Existing `requireAuth()` + dashboard segment gating is already the modern baseline for this codebase.
- Keep role/permission model deferred until product requirements explicitly demand differentiated access.

**Deprecated/outdated:**
- Introducing RBAC in this phase is outdated for this scope and contradicts approved context.
</sota_updates>

<open_questions>
## Open Questions

1. **Do rental records need user attribution fields immediately?**
   - What we know: Existing patterns can access `userId` via `getCurrentUser()` after `requireAuth()`.
   - What's unclear: Whether Phase 1 data model needs creator/assignee tracking now or in later phases.
   - Recommendation: Decide during planning; if required, follow `expense-reports` action pattern.

2. **Will rental features include API route handlers (`app/api/*`) in Phase 1?**
   - What we know: Current guidance targets dashboard pages and server actions.
   - What's unclear: Whether Phase 1 introduces extra API surfaces.
   - Recommendation: If API routes are added, enforce auth explicitly there too (same auth-only policy, no RBAC).
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [`/Users/mspier/Workspace/maka-admin-panel/.planning/phases/01-rental-access-control-baseline/01-CONTEXT.md`](/Users/mspier/Workspace/maka-admin-panel/.planning/phases/01-rental-access-control-baseline/01-CONTEXT.md) - locked decisions and phase boundary.
- [`/Users/mspier/Workspace/maka-admin-panel/lib/auth/session.ts`](/Users/mspier/Workspace/maka-admin-panel/lib/auth/session.ts) - `requireAuth`, redirect behavior, session invalidation.
- [`/Users/mspier/Workspace/maka-admin-panel/app/(dashboard)/layout.tsx`](/Users/mspier/Workspace/maka-admin-panel/app/(dashboard)/layout.tsx) - dashboard-wide auth gate.
- [`/Users/mspier/Workspace/maka-admin-panel/lib/actions/transactions.ts`](/Users/mspier/Workspace/maka-admin-panel/lib/actions/transactions.ts) - action-entry `requireAuth()` pattern.
- [`/Users/mspier/Workspace/maka-admin-panel/lib/actions/expense-reports.ts`](/Users/mspier/Workspace/maka-admin-panel/lib/actions/expense-reports.ts) - auth + current-user action pattern.
- [`/Users/mspier/Workspace/maka-admin-panel/package.json`](/Users/mspier/Workspace/maka-admin-panel/package.json) - dependency and test stack versions.

### Secondary (MEDIUM confidence)
- [`/Users/mspier/Workspace/maka-admin-panel/__tests__/lib/auth/session.test.ts`](/Users/mspier/Workspace/maka-admin-panel/__tests__/lib/auth/session.test.ts) - current auth utility test expectations.
- [`/Users/mspier/Workspace/maka-admin-panel/e2e/01-auth.spec.ts`](/Users/mspier/Workspace/maka-admin-panel/e2e/01-auth.spec.ts) - current authentication e2e flow.
- [`/Users/mspier/Workspace/maka-admin-panel/__tests__/middleware.test.ts`](/Users/mspier/Workspace/maka-admin-panel/__tests__/middleware.test.ts) - current CSRF middleware validation scope.

### Tertiary (LOW confidence - needs validation)
- None. This research is grounded in in-repo architecture and phase context.
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Next.js App Router auth gating
- Ecosystem: `iron-session`, server actions, Vitest, Playwright
- Patterns: `requireAuth` in layout + action entrypoints
- Pitfalls: route placement, missing action guards, RBAC scope creep

**Confidence breakdown:**
- Standard stack: HIGH - directly sourced from `package.json` and existing usage
- Architecture: HIGH - sourced from current app layout and action files
- Pitfalls: HIGH - derived from explicit phase constraints and established patterns
- Code examples: HIGH - copied from repository patterns

**Research date:** 2026-03-07
**Valid until:** 2026-04-06 (30 days - stable architecture unless auth model changes)
</metadata>

---

*Phase: 01-rental-access-control-baseline*
*Research completed: 2026-03-07*
*Ready for planning: yes*
