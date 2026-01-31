# End-to-End Tests

This directory contains Playwright end-to-end tests for the Maka Admin Panel application.

## Overview

The E2E test suite covers critical user flows including:

- **Authentication**: Login flow, session persistence, redirects
- **Dashboard**: Data visualization, charts, summary cards
- **Performance**: Load times, layout stability

## Test Structure

```
e2e/
├── auth.spec.ts              # Authentication flow tests
├── dashboard.spec.ts         # Dashboard visualization tests
├── helpers/
│   └── auth.ts              # Authentication test helpers
└── README.md                # This file
```

## Running Tests

### Prerequisites

1. Ensure PostgreSQL database is running and seeded with test data
2. Environment variables are configured in `.env.local`
3. Development server dependencies are installed: `npm install`

### Commands

```bash
# Run all E2E tests (starts dev server automatically)
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests and show report
npm run test:e2e && npx playwright show-report

# Debug a specific test
npx playwright test --debug e2e/auth.spec.ts
```

## Test Configuration

Configuration is in `playwright.config.ts` at the project root:

- **Base URL**: `http://localhost:3000`
- **Browser**: Chromium (configurable for Firefox, Safari)
- **Timeout**: 30s per test
- **Retries**: 2 retries on CI, 0 locally
- **Web Server**: Auto-starts `npm run dev` before tests
- **Artifacts**: Screenshots and videos on failure, traces on retry

## Writing Tests

### Best Practices

1. **Use Semantic Locators**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Wait for State**: Use `waitForLoadState`, `waitForURL`, `waitForSelector` for stability
3. **Independent Tests**: Each test should be able to run in isolation
4. **Descriptive Names**: Test names should clearly describe what they verify
5. **Setup/Teardown**: Use `beforeEach`/`afterEach` for common operations

### Example Test

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should do something specific', async ({ page }) => {
    // Arrange
    await page.goto('/some-page');

    // Act
    await page.getByRole('button', { name: /action/i }).click();

    // Assert
    await expect(page.getByText(/expected result/i)).toBeVisible();
  });
});
```

### Authentication Helper

Use the `login()` helper from `helpers/auth.ts` to avoid repetitive login code:

```typescript
import { login } from './helpers/auth';

// Login with credentials from .env.local or database initialization
await login(page);
```

## Debugging Tests

### Visual Debugging

```bash
# Run with browser visible
npx playwright test --headed

# Run in debug mode (step through)
npx playwright test --debug

# Run specific test in debug mode
npx playwright test --debug -g "should successfully login"
```

### Trace Viewer

Playwright captures traces on test failures and retries. View them with:

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Screenshots and Videos

- **Screenshots**: Captured on failure, saved to `test-results/`
- **Videos**: Recorded on failure, saved to `test-results/`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          POSTGRES_URL: ${{ secrets.POSTGRES_URL }}
          SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Common Issues

### Test Timeouts

If tests timeout, check:
1. Database is accessible and responding
2. Network conditions are stable
3. Increase timeout in test or config if needed

```typescript
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 second timeout for this test
  // ... test code
});
```

### Flaky Tests

Reduce flakiness by:
1. Waiting for `networkidle` before assertions
2. Using proper wait conditions instead of `waitForTimeout`
3. Ensuring tests are independent (no shared state)
4. Adding `waitForLoadState` after navigation

### Database State

Tests expect a seeded database. If tests fail due to missing data:

```bash
# Reinitialize database
psql $DATABASE_URL -f scripts/init-db.sql
```

## Coverage

Current test coverage includes:

### Authentication (auth.spec.ts)
- ✓ Login page rendering
- ✓ Form validation
- ✓ Successful login
- ✓ Session persistence
- ✓ Auto-redirect when logged in
- ✓ Invalid credentials handling

### Dashboard (dashboard.spec.ts)
- ✓ Dashboard page structure
- ✓ Summary cards display
- ✓ Cash flow chart rendering
- ✓ Category charts (expenses/income)
- ✓ Recent transactions
- ✓ Responsive design
- ✓ Performance metrics
- ✓ Data integrity
- ✓ Error handling

## Extending Tests

To add new test files:

1. Create `[feature].spec.ts` in `e2e/` directory
2. Follow the test structure pattern
3. Use helpers from `helpers/` directory
4. Add documentation to this README

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Locator Guide](https://playwright.dev/docs/locators)
