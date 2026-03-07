# Phase 1: Rental Access Control Baseline - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Ensure rental workflows follow the project's access rule: all authenticated users in this system are admins and should have access. This phase does not introduce RBAC.

</domain>

<decisions>
## Implementation Decisions

### Access model
- No RBAC implementation in this project.
- Treat all logged-in users as admins for rental features.
- Enforce authentication-only gating for rental routes and rental server actions.

### Permission scope
- Protect rental pages and mutations with existing auth checks.
- Do not add role tables, permission matrices, or per-feature authorization rules in this phase.

### Denied behavior
- Unauthenticated users follow existing app behavior (redirect to login or forbidden by existing middleware/action flow).
- No role-based denied state is needed because role differentiation is out of scope.

### Claude's Discretion
- Where to apply existing `requireAuth()` checks in new rental routes/actions.
- Any minimal consistency updates needed to keep auth enforcement uniform.

</decisions>

<specifics>
## Specific Ideas

- "there's no need for access control. RBAC is not in scope of this project and all logged in users are admins and should have access to the feature."

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/auth/session.ts` (`requireAuth`): Existing authentication gate for protected server-rendered routes and actions.
- `app/(dashboard)/layout.tsx`: Current dashboard-wide auth gate using `requireAuth()`.

### Established Patterns
- Server actions in `lib/actions/*` call `requireAuth()` at mutation entry points.
- No current role/permission primitives in session or domain models (`lib/auth/types.ts` has user/session basics only).

### Integration Points
- New rental UI routes under dashboard should inherit dashboard auth behavior.
- New rental server actions should use the same auth-first pattern as existing actions.

</code_context>

<deferred>
## Deferred Ideas

- Role-based access control (RBAC) for differentiated user personas — future phase only if product scope changes.

</deferred>

---
*Phase: 01-rental-access-control-baseline*
*Context gathered: 2026-03-07*
