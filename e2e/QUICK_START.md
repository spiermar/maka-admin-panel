# E2E Testing Quick Start Guide

Quick reference for running Playwright end-to-end tests.

## Prerequisites Checklist

- [ ] Node.js installed (v18+)
- [ ] Dependencies installed: `npm install`
- [ ] PostgreSQL database running
- [ ] Database seeded: `psql $DATABASE_URL -f scripts/init-db.sql`
- [ ] Environment variables configured in `.env.local`

## Quick Commands

```bash
# Run all tests
npm run test:e2e

# Run tests with UI (recommended for development)
npm run test:e2e:ui

# Run tests in headed mode (see the browser)
npm run test:e2e:headed

# Debug a specific test
npm run test:e2e:debug
```

## Test Files

| File | Description |
|------|-------------|
| `auth.spec.ts` | Login, logout, session management |
| `dashboard.spec.ts` | Dashboard visualization and data display |
| `navigation.spec.ts` | Protected routes and navigation flows |

## Running Specific Tests

```bash
# Run only auth tests
npx playwright test auth

# Run only dashboard tests
npx playwright test dashboard

# Run a specific test by name
npx playwright test -g "should successfully login"

# Run in specific browser
npx playwright test --project=chromium
```

## Debugging Tips

### Visual Debugging
```bash
# Run with visible browser
npm run test:e2e:headed

# Step through test execution
npm run test:e2e:debug
```

### Viewing Test Results
```bash
# Show last test report
npx playwright show-report

# View trace for failed test
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Common Issues

**Tests timeout:**
- Check database is running and accessible
- Verify dev server can start on port 3000
- Check network connectivity

**Login fails:**
- Ensure database is seeded with admin user
- Verify credentials match what was generated during initialization

**Port already in use:**

**Port already in use:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Test Data

Default test credentials are generated during database initialization.
Run `npm run script:init-db` to create the admin user and display the credentials.

To reset database:
```bash
psql $DATABASE_URL -f scripts/init-db.sql
```

## CI/CD Integration

Tests run automatically in CI with:
- Auto-starting dev server
- Headless browser mode
- 2 retries on failure
- Artifact uploads for failures

## Next Steps

1. Run tests: `npm run test:e2e:ui`
2. Review test coverage in UI
3. Add new tests for your features
4. See `README.md` for detailed documentation

## Resources

- [Playwright Docs](https://playwright.dev)
- [Test API Reference](https://playwright.dev/docs/api/class-test)
- [Best Practices](https://playwright.dev/docs/best-practices)
