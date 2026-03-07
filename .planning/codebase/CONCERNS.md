# Concerns Map

## 1) Authorization And Data Isolation
- Expense reports are fetched globally via `getExpenseReports()` without per-user scoping in `lib/db/expense-reports.ts`.
- The page `app/(dashboard)/expense-reports/page.tsx` calls `getExpenseReports()` directly after `requireAuth()`, so any authenticated user can view all reports.
- Mutating actions in `lib/actions/expense-reports.ts` (`updateExpenseReport`, `submitExpenseReport`, `approveExpenseReport`, `rejectExpenseReport`, `markReimbursed`, `addExpense`, `updateExpense`, `deleteExpense`) accept IDs and do not verify ownership/role for the target report.
- There is no role model in `lib/auth/types.ts` or `lib/db/types.ts` (session carries only `userId`, `username`, `sessionVersion`), but approval workflows exist, creating an authorization gap.

## 2) Schema Bootstrap Drift
- `lib/db/schema.sql` defines base tables but does not include `users.session_version`, `users.failed_login_attempts`, or `users.locked_until`.
- Runtime auth code in `lib/auth/session.ts` and `lib/auth/account-lockout.ts` expects those columns to exist.
- Migration files exist (`lib/db/migrations/001_add_session_version.sql`, `lib/db/migrations/002_add_account_lockout.sql`) but `scripts/init-db.js` only executes `lib/db/schema.sql` and `scripts/init-db.sql`; it does not apply migration files.
- This creates a real risk that fresh environments initialized only with `npm run script:init-db` will miss required auth columns and fail during login/session checks.

## 3) Database Init Script Fragility
- `scripts/init-db.sql` starts with `\i lib/db/schema.sql`, a psql meta-command.
- `scripts/init-db.js` executes SQL files through `@vercel/postgres` (`sql.query`), which does not process psql backslash commands.
- Since `scripts/init-db.js` already executes `lib/db/schema.sql` separately, this line is redundant and can cause script failure depending on client behavior.

## 4) Weak Authorization Boundaries On CRUD Entities
- Core data tables (`accounts`, `transactions`, `categories`) do not carry owner/user columns in `lib/db/schema.sql`.
- Server actions in `lib/actions/accounts.ts`, `lib/actions/transactions.ts`, and `lib/actions/categories.ts` rely on authenticated session presence but not user-level resource ownership checks.
- Current model appears intentionally shared, but if product expectations shift toward per-user tenancy, this design becomes a high-impact refactor touching schema, queries, and actions.

## 5) CSRF/Origin Validation Operational Risk
- CSRF-style origin checks are middleware-based in `middleware.ts` and depend on `ALLOWED_ORIGINS` parsing plus wildcard hostname matching.
- If `ALLOWED_ORIGINS` is unset, middleware returns early and mutation routes are not origin-validated.
- The fallback `getRequestOrigin()` can derive origin from `host`/`x-forwarded-proto`; reverse-proxy/header misconfiguration could produce false decisions.

## 6) Security Headers Tradeoff
- `next.config.ts` sets CSP with `script-src 'unsafe-inline' 'unsafe-eval'` for all environments.
- This is practical for compatibility but weakens XSS resistance compared with nonce/hash-based policies.

## 7) Error Logging Consistency
- Secure logging helper exists in `lib/utils/error-handler.ts` and is used in `lib/actions/auth.ts`.
- Many other server actions still use raw `console.error` (`lib/actions/accounts.ts`, `lib/actions/transactions.ts`, `lib/actions/categories.ts`, `lib/actions/expense-reports.ts`).
- Current-state result: inconsistent production log hygiene and uneven sensitive-error handling.

## 8) OFX Import Integrity And Performance
- OFX import loop in `lib/actions/ofx-import.ts` processes transactions one-by-one without wrapping in a DB transaction.
- A failure mid-import can leave partial writes; result reporting tracks errors but does not provide rollback.
- Duplicate detection checks existing rows by `(account_id, date, ofx_fitid, amount)` in app logic only; schema has index on `ofx_fitid` but no uniqueness constraint in `lib/db/schema.sql`.
- Under concurrency or repeated imports, duplicate protection is best-effort rather than enforced by the database.

## 9) Query Cost Patterns
- `lib/db/transactions.ts` repeats a recursive CTE (`category_hierarchy`) in multiple read paths (`getTransactionsByAccount`, `getRecentTransactions`, `getTransactionsForExpenseReport`).
- With larger category trees and transaction volumes, repeated CTE computation can become a hotspot; no materialized cache/view exists currently.

## 10) Testing Gap Around Authorization Rules
- Tests are extensive (`__tests__`, `e2e/`), but current implementation-level checks do not reflect strict per-resource authorization in expense reports.
- Given current action signatures in `lib/actions/expense-reports.ts`, missing authorization tests can allow privilege regressions to ship unnoticed.
