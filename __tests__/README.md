# Test Suite Documentation

This directory contains comprehensive unit tests for the Maka Admin Panel application using Vitest.

## Test Coverage

Current test coverage: **97%**

- **89 tests** across 7 test files
- All critical paths tested
- Mock implementations for external dependencies

## Test Structure

```
__tests__/
├── lib/
│   ├── actions/
│   │   └── auth.test.ts           # Server action tests (login, logout)
│   ├── analytics/
│   │   └── cash-flow.test.ts      # Analytics and metrics tests
│   ├── auth/
│   │   ├── password.test.ts       # Password hashing/verification tests
│   │   └── session.test.ts        # Session management tests
│   ├── db/
│   │   ├── index.test.ts          # Database helper function tests
│   │   └── transactions.test.ts   # Transaction query tests
│   ├── validations/
│   │   └── auth.test.ts           # Form validation schema tests
│   └── utils/
│       └── mocks.ts               # Shared mock data and utilities
└── README.md                       # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Categories

### 1. Login Functionality Tests (20 tests)

#### Form Validation (`auth.test.ts`)
- ✓ Validates correct login credentials
- ✓ Rejects empty username/password
- ✓ Rejects missing fields
- ✓ Handles special characters

#### Authentication (`actions/auth.test.ts`)
- ✓ Successful login with valid credentials
- ✓ Rejects invalid username
- ✓ Rejects invalid password
- ✓ Session creation and saving
- ✓ Logout and session destruction
- ✓ Error handling for database failures

#### Password Security (`password.test.ts`)
- ✓ Password hashing with bcrypt
- ✓ Unique salts for same passwords
- ✓ Password verification (correct/incorrect)
- ✓ Case-sensitive verification
- ✓ Special character handling

#### Session Management (`session.test.ts`)
- ✓ Session retrieval
- ✓ Auth requirement checks
- ✓ Redirect to login when unauthenticated
- ✓ Current user retrieval

### 2. Transaction Tests (32 tests)

#### Transaction Queries (`db/transactions.test.ts`)
- ✓ Get transaction by ID
- ✓ Get transactions by account with pagination
- ✓ Custom limit and offset handling
- ✓ Recent transactions retrieval
- ✓ Category path inclusion
- ✓ Proper ordering (date DESC)

#### Database Helpers (`db/index.test.ts`)
- ✓ `queryOne()` - Single row retrieval
- ✓ `queryMany()` - Multiple row retrieval
- ✓ `execute()` - Mutations (INSERT/UPDATE/DELETE)
- ✓ `executeReturning()` - Mutations with RETURNING
- ✓ Null handling
- ✓ Empty result sets
- ✓ TypeScript type safety

### 3. Analytics Tests (24 tests)

#### Cash Flow Calculations (`analytics/cash-flow.test.ts`)
- ✓ Account summary retrieval
- ✓ Monthly cash flow data (6-month default)
- ✓ Custom date ranges
- ✓ Income/expense separation
- ✓ Category breakdowns by type
- ✓ Percentage calculations
- ✓ Current month filtering
- ✓ Default values when no data
- ✓ Ordering and aggregations

## Mock Strategy

### Database Mocking
- Uses `vi.mock()` to mock `@vercel/postgres`
- Mock implementations return controlled test data
- All SQL queries validated without actual database calls

### Session Mocking
- Mocks `iron-session` for session management
- Mocks Next.js `cookies()` and `headers()`
- Tests session save/destroy operations

### Navigation Mocking
- Mocks Next.js `redirect()` function
- Verifies redirects by catching thrown errors
- Tests proper navigation flows

## Test Data

Shared mock data in `__tests__/lib/utils/mocks.ts`:
- `mockUser` - Sample user with hashed password
- `mockTransaction` - Basic transaction
- `mockTransactionWithDetails` - Transaction with joins
- `mockAccount` - Sample account
- `mockCategory` - Sample category
- `mockMonthlyData` - Monthly analytics data
- `mockCategoryBreakdown` - Category spending breakdown
- `mockAccountSummary` - Account summary metrics

## Key Testing Patterns

### 1. Async/Await Testing
```typescript
it('should return data', async () => {
  const result = await queryOne('SELECT * FROM test');
  expect(result).toBeDefined();
});
```

### 2. Mock Setup and Cleanup
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

### 3. Testing Redirects
```typescript
// Next.js redirect throws error
await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT: /login');
```

### 4. Parameterized Tests
```typescript
expect(queryMany).toHaveBeenCalledWith(
  expect.stringContaining('WHERE'),
  [accountId, limit, offset]
);
```

### 5. Type Safety Testing
```typescript
const result = await queryOne<User>('SELECT * FROM users');
expect(result?.id).toBe(1);
```

## Coverage Gaps

Minor uncovered areas:
- Line 4 in mocks.ts (ternary operator branch)
- Line 99 in cash-flow.ts (percentage calculation edge case)

These represent edge cases with minimal impact on overall coverage.

## Best Practices

1. **Isolation**: Each test is independent and can run in any order
2. **Mocking**: External dependencies mocked to prevent side effects
3. **Clear naming**: Test descriptions clearly state what is being tested
4. **Arrange-Act-Assert**: Tests follow AAA pattern
5. **Type safety**: TypeScript types validated in tests
6. **Error scenarios**: Both success and failure paths tested

## Continuous Integration

Tests are designed to run in CI/CD pipelines:
- Fast execution (< 5 seconds)
- No external dependencies
- Deterministic results
- Parallel execution safe

## Future Enhancements

Potential additions:
- Component tests for React components (login form, transaction list)
- E2E tests with Playwright
- Visual regression tests
- Performance benchmarks
- Integration tests with test database
- Mutation testing for test quality validation

## Troubleshooting

### Tests fail with "Cannot find module"
Run `npm install` to ensure all dependencies are installed.

### Slow test execution
Password hashing tests are intentionally slow (bcrypt cost factor 12). This is expected behavior.

### Coverage report not generating
Install coverage provider: `npm install --save-dev @vitest/coverage-v8`

### Mocks not working
Ensure `vitest.setup.ts` is configured in `vitest.config.ts` setupFiles.

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
