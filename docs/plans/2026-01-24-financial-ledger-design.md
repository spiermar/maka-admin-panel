# Financial Ledger Application - Design Document

**Date:** 2026-01-24
**Project:** Web-based ledger application for managing, categorizing, and analyzing financial transactions

## Overview

A dashboard-centric financial ledger application focused on cash flow analytics. Multiple users share access to the same financial data (family finances model). Built with Next.js 16 Server Components, PostgreSQL, and deployed on Vercel/Neon.

## Architecture

### Tech Stack
- **Frontend:** Next.js 16 App Router, Shadcn UI, Tailwind CSS
- **Backend:** Next.js 16 Server Components + Server Actions
- **Database:** PostgreSQL (Neon)
- **Auth:** Iron-session with bcrypt password hashing
- **Charts:** Recharts or Tremor
- **Deployment:** Vercel

### Project Structure
```
/app
  /(auth)
    /login - Login page
  /(dashboard)
    /page.tsx - Main dashboard (cash flow analytics)
    /accounts/[id]/page.tsx - Account detail view
    /settings/page.tsx - Category & account management
  /api (minimal - mainly for logout/session checks)
/lib
  /db - Database connection & query functions
  /actions - Server Actions for mutations
  /auth - Authentication helpers
  /analytics - Cash flow calculation logic
/components
  /ui - Shadcn components
  /dashboard - Dashboard-specific components (charts, cards)
  /transactions - Transaction forms, lists
/scripts
  /init-db.sql - Database initialization script
```

### Data Flow
- Pages fetch data directly from PostgreSQL via server-side query functions
- Forms use Server Actions for mutations, trigger revalidation
- No client-side state management - rely on cache revalidation
- Optimistic updates where needed using `useOptimistic` hook

## Database Schema

### Tables

**users**
- `id`: serial PRIMARY KEY
- `username`: varchar(100) UNIQUE NOT NULL
- `password_hash`: varchar(255) NOT NULL
- `created_at`: timestamp DEFAULT now()

**accounts**
- `id`: serial PRIMARY KEY
- `name`: varchar(100) NOT NULL
- `created_at`: timestamp DEFAULT now()

**categories**
- `id`: serial PRIMARY KEY
- `name`: varchar(100) NOT NULL
- `parent_id`: integer REFERENCES categories(id) ON DELETE CASCADE
- `category_type`: enum('income', 'expense') NOT NULL
- `depth`: integer NOT NULL CHECK (depth <= 3)
- `created_at`: timestamp DEFAULT now()

**transactions**
- `id`: serial PRIMARY KEY
- `account_id`: integer REFERENCES accounts(id) ON DELETE CASCADE
- `date`: date NOT NULL
- `payee`: varchar(200) NOT NULL
- `category_id`: integer REFERENCES categories(id) ON DELETE SET NULL
- `amount`: decimal(15,2) NOT NULL
- `comment`: text
- `created_at`: timestamp DEFAULT now()
- `updated_at`: timestamp DEFAULT now()

### Key Design Decisions
- **No user_id foreign keys:** All users see all data (shared finances)
- **category_id nullable:** Transactions can be uncategorized initially
- **depth column:** Enforces max depth of 3, calculated on insert/update
- **ON DELETE CASCADE:** Deleting an account removes its transactions; deleting a parent category removes children
- **decimal for amounts:** Avoids floating-point precision issues

### Indexes
```sql
CREATE INDEX idx_transactions_account_date ON transactions(account_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

## Authentication & Sessions

### Authentication Flow
1. Login page with username + password fields
2. Server Action validates credentials against users table
3. bcrypt comparison of password hash
4. On success, creates iron-session and redirects to dashboard
5. Middleware checks session on all dashboard routes
6. No session = redirect to login

### Session Management
- Iron-session with encrypted cookie-based sessions
- Session stores: `userId`, `username`
- Server Action for logout (destroys session)

### Security
- All auth happens server-side (Server Actions)
- Session cookies (no JWT needed)
- HTTPS enforced in production (Vercel default)
- CSRF protection via Server Actions (built-in)
- Bcrypt with salt rounds = 12

## Dashboard Implementation

### Layout (Cash Flow Analytics Focus)

**Header Cards (Top Row)**
- Total Balance: Sum of all account balances
- Monthly Income: Total income for current month
- Monthly Expenses: Total expenses for current month
- Net Cash Flow: Income - Expenses for current month

**Main Charts (Middle Section)**
- Cash Flow Over Time: Line chart showing monthly income vs expenses (last 6-12 months)
- Monthly Cash Flow Bar: Bar chart showing net cash flow by month (positive/negative)
- Spending by Category: Pie or bar chart of top expense categories for current month

**Recent Activity (Bottom)**
- Last 10 transactions across all accounts
- Click to navigate to account detail view
- Link to specific account from transaction

### Data Fetching
```typescript
// lib/analytics/cash-flow.ts
getCashFlowData(months = 6) // Monthly income/expense aggregation
getAccountBalances() // Sum transactions by account
getRecentTransactions(limit = 10) // Latest transactions with joins
```

### Performance
- Dashboard queries run server-side on each page load
- Cache with `revalidatePath` after mutations
- Consider `unstable_cache` for expensive analytics queries
- All calculations in SQL (SUM, GROUP BY)

## Transaction Management

### Account Detail View (`/accounts/[id]/page.tsx`)
- Shows transactions for a single account in a table
- Columns: Date, Payee, Category, Amount, Comment
- Sortable by date (default: newest first), amount
- Color-coded: green for income, red for expenses
- Inline edit/delete actions on each row
- Account balance displayed at top
- Optional: Transaction history chart (balance over time)
- "Add Transaction" button (pre-fills account)

### Add/Edit Transaction Form
Modal or slide-over panel with fields:
- **Account:** Dropdown (required, pre-filled if from account detail)
- **Date:** Date picker (required, defaults to today)
- **Payee:** Text input (required)
- **Category:** Hierarchical select/tree picker (optional)
- **Amount:** Number input (required, positive or negative)
- **Comment:** Textarea (optional)

### Category Picker
- Shadcn Select or Combobox component
- Shows full path for nested categories (e.g., "Expenses > Food > Dining Out")
- Groups by parent category for navigation
- "Uncategorized" option available

### Server Actions
```typescript
// lib/actions/transactions.ts
createTransaction(formData: FormData)
updateTransaction(id: number, formData: FormData)
deleteTransaction(id: number)
```

## Settings & Configuration

### Settings Page (`/settings/page.tsx`)

**Account Management Section**
- List of all accounts with name
- "Add Account" button
- Edit/Delete actions for each account
- Warning on delete if account has transactions

**Account Form**
- Single field: Account Name (text input)
- Server Actions for create/update/delete

**Category Management Section**
- Tree view showing category hierarchy
- Visual indentation for child categories
- Category type badge/icon (Income/Expense)
- "Add Category" button
- Edit/Delete actions for each category

**Category Form**
- Name: Text input (required)
- Type: Radio buttons - Income or Expense (required)
- Parent Category: Dropdown showing valid parents (optional, respects depth limit)
- Validation: Ensure depth ≤ 3 when selecting parent

### Category Depth Calculation
- If parent has depth=2, child gets depth=3 (max)
- Block creating child if parent depth=3
- Depth calculated server-side on create/update

### Server Actions
```typescript
// lib/actions/accounts.ts
createAccount(formData: FormData)
updateAccount(id: number, formData: FormData)
deleteAccount(id: number) // Check for transactions first

// lib/actions/categories.ts
createCategory(formData: FormData) // Calculate depth
updateCategory(id: number, formData: FormData)
deleteCategory(id: number) // Cascade handled by DB
```

## Income vs Expense Classification

Categories are marked as either "income" or "expense" via the `category_type` field. This enables accurate cash flow reporting:
- Income categories: Salary, Business Income, Gifts, etc.
- Expense categories: Groceries, Rent, Utilities, etc.

Transaction amounts can be positive or negative, but the category type determines how they're counted in analytics.

## Error Handling

### Form Validation
- Client-side: Shadcn forms with Zod schemas for immediate feedback
- Server-side: Validate again in Server Actions (never trust client)
- Return errors from Server Actions using `useFormState` hook
- Display errors inline on form fields

### Server Action Error Pattern
```typescript
export async function createTransaction(formData: FormData) {
  try {
    await requireAuth();
    const validated = transactionSchema.parse(formData);
    await db.query('INSERT INTO transactions...');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: error.flatten() };
    }
    return { success: false, message: 'Failed to create transaction' };
  }
}
```

### Database Errors
- Catch constraint violations (e.g., deleting account with transactions)
- Log to stdout for observability
- Show user-friendly messages (not raw SQL errors)

### Global Error Boundaries
- `error.tsx` files in route groups for unexpected errors
- Simple error page with "Try again" button
- Full error logged server-side

## Testing Strategy

### Unit Tests
- Analytics calculations (`lib/analytics/*.ts`)
- Helper functions (category depth calculation, balance calculations)
- Use Vitest or Jest

### Integration Tests
- Server Actions with test database
- Verify CRUD operations
- Test auth flows

### E2E Tests (Optional but Recommended)
- Playwright for critical flows:
  - Login → View dashboard
  - Add transaction → Verify on account detail
  - Create category → Use in transaction
- Run on PR before deploy

## Deployment & Initial Setup

### Database Setup

**Initial Migration Script** (`/scripts/init-db.sql`)
```sql
-- Create tables, indexes
-- Seed initial user
INSERT INTO users (username, password_hash)
VALUES ('admin', <bcrypt_hash_of_initial_password>);

-- Seed default categories
INSERT INTO categories (name, category_type, parent_id, depth) VALUES
  ('Salary', 'income', NULL, 1),
  ('Business Income', 'income', NULL, 1),
  ('Groceries', 'expense', NULL, 1),
  ('Rent', 'expense', NULL, 1),
  ('Utilities', 'expense', NULL, 1);
```

**Neon Setup**
- Create Neon project
- Run init script via Neon dashboard or CLI
- Store connection string in Vercel env vars

### Vercel Deployment

**Environment Variables**
```
DATABASE_URL=<neon_connection_string>
SESSION_SECRET=<random_32_char_string>
NODE_ENV=production
```

**Configuration**
- Automatic deployment on git push
- Preview deployments for testing

### First-Time Setup
- Seed script creates initial admin user
- Credentials documented in README
- User can change password after first login (future enhancement)

### Local Development
- Use local Postgres or Neon branch/dev database
- Copy `.env.example` to `.env.local`
- Run `npm run dev`
- Seed script for local test data

## Out of Scope (Initial Release)

From requirements:
- User login system (using simple multi-user shared auth instead)

Additional items to defer:
- Password reset/recovery
- User management UI (adding/removing users)
- Pagination for transactions (add when needed)
- Data export/import
- Recurring transactions
- Budget tracking
- Multi-currency support (nice-to-have in requirements, defer initially)
- Mobile app
