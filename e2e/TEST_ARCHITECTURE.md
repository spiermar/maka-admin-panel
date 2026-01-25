# E2E Test Architecture

## Directory Structure

```
maka-admin-panel/
├── e2e/                          # E2E test directory
│   ├── auth.spec.ts             # Authentication tests
│   ├── dashboard.spec.ts        # Dashboard visualization tests
│   ├── navigation.spec.ts       # Navigation and routing tests
│   ├── visual.spec.ts           # Visual regression & accessibility tests
│   ├── helpers/                 # Reusable test utilities
│   │   └── auth.ts             # Authentication helpers
│   ├── README.md               # Comprehensive documentation
│   ├── QUICK_START.md         # Quick reference guide
│   └── TEST_ARCHITECTURE.md   # This file
├── playwright.config.ts        # Playwright configuration
├── test-results/              # Test artifacts (gitignored)
│   ├── screenshots/
│   ├── videos/
│   └── traces/
└── playwright-report/         # HTML test reports (gitignored)
```

## Test Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E Test Suite (44 tests)                │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Auth Tests   │    │ Dashboard Tests│    │ Navigation    │
│  (6 tests)    │    │  (11 tests)    │    │ Tests (11)    │
└───────┬───────┘    └───────┬────────┘    └───────┬───────┘
        │                    │                      │
        └────────────────────┼──────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Visual Tests   │
                    │   (14 tests)   │
                    └────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Screenshots   │   │ Accessibility │   │  Responsive   │
│  Comparison   │   │    Checks     │   │    Design     │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Test Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Test Execution Flow                       │
└──────────────────────────────────────────────────────────────┘

1. Test Initialization
   ┌────────────────────────────────────┐
   │ Playwright Config Loaded           │
   │ - Base URL: http://localhost:3000  │
   │ - Browser: Chromium                │
   │ - Timeout: 30s                     │
   └────────────────┬───────────────────┘
                    │
                    ▼
   ┌────────────────────────────────────┐
   │ Web Server Auto-Start              │
   │ - Runs: npm run dev                │
   │ - Waits for: localhost:3000        │
   └────────────────┬───────────────────┘
                    │
2. Test Execution    ▼
   ┌────────────────────────────────────┐
   │ Before Each Test                   │
   │ - Clear browser state              │
   │ - Navigate to starting URL         │
   │ - Login (if needed)                │
   └────────────────┬───────────────────┘
                    │
                    ▼
   ┌────────────────────────────────────┐
   │ Test Case Execution                │
   │ - Arrange: Setup test data         │
   │ - Act: Perform user actions        │
   │ - Assert: Verify outcomes          │
   └────────────────┬───────────────────┘
                    │
3. Results          ▼
   ┌────────────────────────────────────┐
   │ Test Artifacts Collection          │
   │ - Screenshots (on failure)         │
   │ - Videos (on failure)              │
   │ - Traces (on retry)                │
   └────────────────┬───────────────────┘
                    │
                    ▼
   ┌────────────────────────────────────┐
   │ Report Generation                  │
   │ - HTML report                      │
   │ - JSON results                     │
   │ - Console output                   │
   └────────────────────────────────────┘
```

## Authentication Flow Architecture

```
┌──────────────────────────────────────────────────────────────┐
│              Authentication Test Flow                         │
└──────────────────────────────────────────────────────────────┘

Test Start
    │
    ▼
┌────────────────┐
│ Navigate to    │ ──────────► /login
│ Login Page     │
└───────┬────────┘
        │
        ▼
┌────────────────┐     ┌─────────────────────────────────┐
│ Fill Form      │────►│ Username: admin                 │
│                │     │ Password: admin123              │
└───────┬────────┘     └─────────────────────────────────┘
        │
        ▼
┌────────────────┐
│ Submit Form    │ ──────────► Server Action: login()
└───────┬────────┘
        │
        ▼
┌────────────────┐     ┌─────────────────────────────────┐
│ Server         │────►│ 1. Validate credentials         │
│ Processing     │     │ 2. Create iron-session          │
│                │     │ 3. Set encrypted cookie         │
└───────┬────────┘     └─────────────────────────────────┘
        │
        ▼
┌────────────────┐
│ Redirect       │ ──────────► /dashboard
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Assert Success │ ──────────► URL is /, Dashboard visible
└────────────────┘
```

## Test Helper Pattern

```
┌──────────────────────────────────────────────────────────────┐
│                    Helper Function Usage                     │
└──────────────────────────────────────────────────────────────┘

Test File (dashboard.spec.ts)
    │
    │ import { login } from './helpers/auth'
    │
    ▼
┌────────────────────────────────────┐
│ test.beforeEach(async ({ page })   │
│   await login(page)                │
│ )                                  │
└────────────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ helpers/auth.ts    │
        │                    │
        │ login(page) {      │
        │   - goto /login    │
        │   - fill username  │
        │   - fill password  │
        │   - submit form    │
        │   - wait for /     │
        │ }                  │
        └────────────────────┘
                 │
                 │ Returns authenticated page
                 ▼
┌────────────────────────────────────┐
│ Test execution with logged-in user │
└────────────────────────────────────┘
```

## Visual Regression Test Flow

```
┌──────────────────────────────────────────────────────────────┐
│              Visual Regression Testing                       │
└──────────────────────────────────────────────────────────────┘

First Run (Baseline Creation)
    │
    ▼
┌────────────────┐
│ Capture        │ ──────────► dashboard-full.png
│ Screenshot     │             (saved as baseline)
└────────────────┘

Subsequent Runs (Comparison)
    │
    ▼
┌────────────────┐
│ Capture        │ ──────────► dashboard-full-actual.png
│ Screenshot     │
└───────┬────────┘
        │
        ▼
┌────────────────┐     ┌─────────────────────────────────┐
│ Compare        │────►│ Pixel-by-pixel comparison       │
│ with Baseline  │     │ Max allowed diff: 100 pixels    │
└───────┬────────┘     └─────────────────────────────────┘
        │
        ├──► PASS: Visual matches (within threshold)
        │
        └──► FAIL: Visual differs
                   - Saves diff image
                   - Shows in report
```

## Test Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Test Data Architecture                    │
└──────────────────────────────────────────────────────────────┘

Database (PostgreSQL)
    │
    │ Seeded via: scripts/init-db.sql
    │
    ▼
┌────────────────────────────────────┐
│ Test Data                          │
│ ├─ Users                          │
│ │  └─ admin / admin123            │
│ ├─ Accounts                       │
│ │  └─ Sample checking/savings     │
│ ├─ Categories                     │
│ │  └─ Expense/income categories   │
│ └─ Transactions                   │
│    └─ Sample transaction history  │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ Application (Next.js)              │
│ - Server Actions                   │
│ - Database Queries                 │
│ - Dashboard Analytics              │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ E2E Tests (Playwright)             │
│ - Reads displayed data             │
│ - Verifies UI rendering            │
│ - Checks calculations              │
└────────────────────────────────────┘
```

## Parallel Test Execution

```
┌──────────────────────────────────────────────────────────────┐
│              Parallel Execution Architecture                 │
└──────────────────────────────────────────────────────────────┘

Playwright Test Runner
    │
    ├─────────┬─────────┬─────────┬──────────┐
    │         │         │         │          │
    ▼         ▼         ▼         ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│Worker│  │Worker│  │Worker│  │Worker│  │Worker│
│  1   │  │  2   │  │  3   │  │  4   │  │  5   │
└──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘
   │         │         │         │         │
   │ auth    │ dash    │ nav     │ visual  │ visual
   │ tests   │ tests   │ tests   │ tests   │ tests
   │         │         │         │         │
   └─────────┴─────────┴─────────┴─────────┘
                      │
                      ▼
            ┌──────────────────┐
            │ Aggregate Results│
            └──────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │ Generate Report  │
            └──────────────────┘
```

## CI/CD Integration Architecture

```
┌──────────────────────────────────────────────────────────────┐
│              CI/CD Pipeline (GitHub Actions)                 │
└──────────────────────────────────────────────────────────────┘

GitHub Push/PR
    │
    ▼
┌────────────────────────────────────┐
│ Workflow Trigger                   │
│ .github/workflows/e2e-tests.yml    │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ Environment Setup                  │
│ - Ubuntu runner                    │
│ - Node.js 18                       │
│ - PostgreSQL service               │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ Dependencies Installation          │
│ - npm ci                           │
│ - Playwright browsers              │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ Database Setup                     │
│ - Initialize schema                │
│ - Seed test data                   │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ Test Execution                     │
│ - npm run test:e2e                 │
│ - Headless mode                    │
│ - 2 retries on failure             │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ Artifact Upload (if failed)        │
│ - Screenshots                      │
│ - Videos                           │
│ - Test reports                     │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ PR Comment (optional)              │
│ - Test results summary             │
│ - Links to artifacts               │
└────────────────────────────────────┘
```

## Browser Context Isolation

```
┌──────────────────────────────────────────────────────────────┐
│              Browser Context per Test                        │
└──────────────────────────────────────────────────────────────┘

Test 1                  Test 2                  Test 3
  │                       │                       │
  ▼                       ▼                       ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ New Browser │      │ New Browser │      │ New Browser │
│  Context    │      │  Context    │      │  Context    │
│             │      │             │      │             │
│ - Clean     │      │ - Clean     │      │ - Clean     │
│   Cookies   │      │   Cookies   │      │   Cookies   │
│ - Clean     │      │ - Clean     │      │ - Clean     │
│   Storage   │      │   Storage   │      │   Storage   │
│ - Clean     │      │ - Clean     │      │ - Clean     │
│   Cache     │      │   Cache     │      │   Cache     │
└─────────────┘      └─────────────┘      └─────────────┘

                  No shared state!
                 Tests are isolated
```

## Test Coverage Map

```
┌──────────────────────────────────────────────────────────────┐
│                  Application Feature Coverage               │
└──────────────────────────────────────────────────────────────┘

Application            E2E Test Coverage
─────────────────────────────────────────────────────────────
Login Page         ───► auth.spec.ts (6 tests)
                        - Form rendering
                        - Validation
                        - Authentication
                        - Redirects

Dashboard          ───► dashboard.spec.ts (11 tests)
                        - Summary cards
                        - Charts
                        - Data display
                        - Responsive design

Navigation         ───► navigation.spec.ts (11 tests)
                        - Route protection
                        - Session persistence
                        - URL handling

Visual/A11y        ───► visual.spec.ts (14 tests)
                        - Screenshot comparison
                        - Accessibility
                        - Responsive layouts
```

## Key Design Decisions

### 1. Test Organization
- **By Feature**: Tests organized by application feature (auth, dashboard, etc.)
- **Helper Functions**: Reusable utilities in dedicated helpers directory
- **Clear Naming**: Descriptive test names that explain what they verify

### 2. Authentication Strategy
- **Helper Function**: Centralized login logic
- **beforeEach Hook**: Automatic login for protected route tests
- **Session Reuse**: Login once per test, not per action

### 3. Wait Strategies
- **Network Idle**: For complete page loads
- **Selector Wait**: For dynamic content
- **URL Wait**: For navigation verification
- **No Fixed Timeouts**: Avoid brittle `waitForTimeout()` calls

### 4. Visual Testing
- **Baseline Creation**: First run creates reference screenshots
- **Threshold Tolerance**: Allow small differences for dynamic content
- **Multiple Viewports**: Test responsive design at key breakpoints

### 5. Reporting
- **Multi-Format**: HTML (interactive), JSON (CI), List (console)
- **Rich Artifacts**: Screenshots, videos, traces for debugging
- **Failure Focus**: Capture detailed info only on failures

## Maintenance Guidelines

### When to Update Tests

1. **UI Changes**: Update visual snapshots
2. **Route Changes**: Update navigation tests
3. **Auth Changes**: Update auth helper and tests
4. **New Features**: Add corresponding E2E tests

### Test Maintenance Workflow

```
Feature Change
    │
    ▼
Run Affected Tests ──► Pass? ──► Done
    │                     │
    │ Fail                │
    ▼                     ▼
Analyze Failure      No Change
    │               Needed
    ├─► Expected (feature changed)
    │   - Update test
    │   - Update snapshots
    │   - Verify pass
    │
    └─► Unexpected (regression)
        - Fix application
        - Verify test passes
```

This architecture ensures maintainable, reliable, and comprehensive E2E test coverage for the Maka Admin Panel application.
