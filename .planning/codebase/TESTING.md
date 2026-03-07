# Testing (Current State)

## Test Stack Overview
- Unit/integration tests use Vitest with jsdom (`vitest.config.ts`).
- Browser E2E tests use Playwright (`playwright.config.ts`) under `e2e/`.
- Shared test setup for Vitest is in `vitest.setup.ts`.

## Commands in Active Use
- Unit tests: `npm test` (`vitest`).
- Coverage: `npm run test:coverage`.
- E2E: `npm run test:e2e`.
- E2E debug/UI modes: `npm run test:e2e:debug`, `npm run test:e2e:ui`, `npm run test:e2e:headed`.

## Unit Test Conventions (`__tests__/`)
- Unit tests are colocated in `__tests__/` with path mirroring by domain (for example `__tests__/lib/actions/auth.test.ts`, `__tests__/auth/rate-limit.test.ts`).
- File naming convention is `*.test.ts` or `*.test.tsx`.
- Mocks use `vi.mock(...)` heavily for external boundaries (`@vercel/postgres`, `next/headers`, `next/navigation`, auth/session modules).
- `vitest.setup.ts` globally mocks Next.js navigation and headers, and sets `SESSION_SECRET` for tests.
- React component tests are present but limited in count (for example `__tests__/components/transactions/transaction-table.test.tsx`).

## Coverage and Scope Reality
- The repository currently contains broad unit coverage across auth, db, validation, middleware, i18n, analytics, OFX utils, and expense-reports paths.
- Current file set indicates 20+ `*.test.ts(x)` files in `__tests__/`.
- Existing narrative docs like `__tests__/README.md` report older counts/percentages and are not fully aligned with the present file set.

## E2E Conventions (`e2e/`)
- E2E specs are ordered with numeric prefixes (`e2e/01-auth.spec.ts` ... `e2e/09-translations.spec.ts`).
- Custom fixture entrypoint is `e2e/fixtures.ts`, which performs suite-level setup/teardown.
- Test DB reset/seed logic is centralized in `e2e/helpers/database.ts` and executed from fixture `beforeAll`.
- Reusable auth flow helper is in `e2e/helpers/auth.ts`.
- Playwright is currently configured with `fullyParallel: false`, favoring deterministic DB-dependent runs.

## Playwright Runtime Behavior
- `playwright.config.ts` sets `testDir: './e2e'` and uses Chromium project by default.
- `webServer.command` runs `npm run dev` and reuses an existing local server when not in CI.
- Reporter outputs include HTML, list, and JSON (`test-results/results.json`).
- Failure artifacts are enabled: screenshot/video on failure and trace on first retry.

## Practical Risks and Gaps
- E2E docs (`e2e/README.md`, `e2e/TEST_ARCHITECTURE.md`) contain stale filenames/counts compared with actual files (`01-auth.spec.ts`, `02-csrf.spec.ts`, etc.).
- `testMatch` in `playwright.config.ts` includes `*.fixtures.ts`; this currently works with `e2e/fixtures.ts` but increases accidental test-discovery risk if helper filenames drift.
- E2E tests depend on DB connectivity and seed assumptions from `.env.local` plus `TEST_ADMIN_PASSWORD` fallback behavior in `e2e/helpers/auth.ts`.

## Suggested Reading Order for Contributors
- Start with `vitest.config.ts` and `vitest.setup.ts` for unit-test mechanics.
- Then review representative unit suites: `__tests__/lib/actions/auth.test.ts`, `__tests__/middleware.test.ts`, `__tests__/validations/transactions.test.ts`.
- For E2E, read `playwright.config.ts`, `e2e/fixtures.ts`, then `e2e/01-auth.spec.ts`.
