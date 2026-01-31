# Financial Ledger Application Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web-based financial ledger with cash flow analytics, multi-account transaction management, and hierarchical categories.

**Architecture:** Next.js 16 App Router with Server Components and Server Actions, PostgreSQL database with direct queries (no ORM), iron-session for auth. Dashboard-centric UI with Recharts for analytics.

**Tech Stack:** Next.js 16, React 19, TypeScript, PostgreSQL, Shadcn UI, Tailwind CSS, iron-session, bcrypt, Zod, Recharts

---

## Task 1: Project Setup & Dependencies

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.env.local`
- Create: `.gitignore`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`

**Step 1: Initialize Next.js project**

Run: `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"`

Expected: Project scaffolding created

**Step 2: Install dependencies**

Run:
```bash
npm install @vercel/postgres iron-session bcrypt zod recharts
npm install -D @types/bcrypt
npm install @types/node@latest
```

Expected: Dependencies installed

**Step 3: Initialize Shadcn UI**

Run: `npx shadcn@latest init -d`

Select: Default style, Slate color, CSS variables

Expected: Shadcn configured with components.json

**Step 4: Install required Shadcn components**

Run:
```bash
npx shadcn@latest add button card input label select table form dialog sheet textarea
```

Expected: UI components added to components/ui

**Step 5: Create environment files**

Create `.env.example`:
```
POSTGRES_URL=postgresql://user:password@localhost:5432/ledger
SESSION_SECRET=your-32-character-secret-key-here
```

Copy to `.env.local` and fill with actual values for local Postgres.

**Step 6: Update .gitignore**

Ensure `.env.local` is ignored (create-next-app should handle this).

**Step 7: Commit**

Run:
```bash
git add .
git commit -m "feat: initialize Next.js project with dependencies

- Add Next.js 16 with App Router and TypeScript
- Install Shadcn UI with required components
- Add database and session dependencies
- Configure environment variables"
```

---

## Task 2: Database Schema & Migration

**Files:**
- Create: `scripts/init-db.sql`
- Create: `lib/db/schema.sql`

**Step 1: Write database schema**

Create `lib/db/schema.sql`:
```sql
-- Enable extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create category_type enum
CREATE TYPE category_type AS ENUM ('income', 'expense');

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Accounts table
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  category_type category_type NOT NULL,
  depth INTEGER NOT NULL CHECK (depth >= 1 AND depth <= 3),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  payee VARCHAR(200) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_account_date ON transactions(account_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

**Step 2: Write initialization script with seed data**

Create `scripts/init-db.sql`:
```sql
-- Run schema
\i lib/db/schema.sql

-- Seed admin user (password: admin123)
-- Password hash generated with: bcrypt.hash('admin123', 12)
INSERT INTO users (username, password_hash) VALUES
  ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyJNv.VrVtn2');

-- Seed default categories
INSERT INTO categories (name, category_type, parent_id, depth) VALUES
  -- Income categories
  ('Salary', 'income', NULL, 1),
  ('Business Income', 'income', NULL, 1),
  ('Investments', 'income', NULL, 1),

  -- Expense categories (depth 1)
  ('Food & Dining', 'expense', NULL, 1),
  ('Transportation', 'expense', NULL, 1),
  ('Housing', 'expense', NULL, 1),
  ('Utilities', 'expense', NULL, 1),
  ('Entertainment', 'expense', NULL, 1),

  -- Food subcategories (depth 2)
  ('Groceries', 'expense', 4, 2),
  ('Restaurants', 'expense', 4, 2),

  -- Transportation subcategories (depth 2)
  ('Gas', 'expense', 5, 2),
  ('Public Transit', 'expense', 5, 2),

  -- Housing subcategories (depth 2)
  ('Rent', 'expense', 6, 2),
  ('Mortgage', 'expense', 6, 2);

-- Seed test accounts
INSERT INTO accounts (name) VALUES
  ('Checking Account'),
  ('Savings Account'),
  ('Credit Card');
```

**Step 3: Test database setup locally**

Run:
```bash
psql $POSTGRES_URL -f scripts/init-db.sql
```

Expected: Tables created, seed data inserted

**Step 4: Verify seed data**

Run:
```bash
psql $POSTGRES_URL -c "SELECT * FROM users;"
psql $POSTGRES_URL -c "SELECT * FROM accounts;"
psql $POSTGRES_URL -c "SELECT id, name, category_type, depth FROM categories;"
```

Expected: See seeded users, accounts, and categories

**Step 5: Commit**

Run:
```bash
git add scripts/ lib/db/
git commit -m "feat: add database schema and initialization script

- Create users, accounts, categories, transactions tables
- Add indexes for query performance
- Seed default admin user and sample data
- Add category hierarchy with depth validation"
```

---

## Task 3: Database Connection & Query Utilities

**Files:**
- Create: `lib/db/index.ts`
- Create: `lib/db/types.ts`

**Step 1: Write TypeScript types for database models**

Create `lib/db/types.ts`:
```typescript
export type CategoryType = 'income' | 'expense';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
}

export interface Account {
  id: number;
  name: string;
  created_at: Date;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  category_type: CategoryType;
  depth: number;
  created_at: Date;
}

export interface Transaction {
  id: number;
  account_id: number;
  date: string; // ISO date string
  payee: string;
  category_id: number | null;
  amount: string; // Decimal as string
  comment: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TransactionWithDetails extends Transaction {
  account_name: string;
  category_name: string | null;
  category_path: string | null;
}
```

**Step 2: Write database connection utility**

Create `lib/db/index.ts`:
```typescript
import { sql } from '@vercel/postgres';

export { sql };

// Helper to get a single row or null
export async function queryOne<T>(
  query: string,
  params: any[] = []
): Promise<T | null> {
  const result = await sql.query(query, params);
  return result.rows[0] || null;
}

// Helper to get multiple rows
export async function queryMany<T>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  const result = await sql.query(query, params);
  return result.rows;
}

// Helper for mutations (INSERT, UPDATE, DELETE)
export async function execute(
  query: string,
  params: any[] = []
): Promise<void> {
  await sql.query(query, params);
}

// Helper for mutations that return data (RETURNING clause)
export async function executeReturning<T>(
  query: string,
  params: any[] = []
): Promise<T> {
  const result = await sql.query(query, params);
  return result.rows[0];
}
```

**Step 3: Test database connection**

Create a test file `test-db.ts` (temporary):
```typescript
import { queryMany } from './lib/db';
import { Account } from './lib/db/types';

async function test() {
  const accounts = await queryMany<Account>(
    'SELECT * FROM accounts ORDER BY id'
  );
  console.log('Accounts:', accounts);
}

test();
```

Run: `npx tsx test-db.ts`

Expected: See accounts from seed data logged

**Step 4: Remove test file**

Run: `rm test-db.ts`

**Step 5: Commit**

Run:
```bash
git add lib/db/
git commit -m "feat: add database connection and query utilities

- Define TypeScript types for all database models
- Add query helpers for common patterns
- Support single/multiple row queries and mutations"
```

---

## Task 4: Authentication - Session Management

**Files:**
- Create: `lib/auth/session.ts`
- Create: `lib/auth/password.ts`
- Create: `lib/auth/types.ts`

**Step 1: Define session types**

Create `lib/auth/types.ts`:
```typescript
export interface SessionData {
  userId: number;
  username: string;
}
```

**Step 2: Write password hashing utilities**

Create `lib/auth/password.ts`:
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Step 3: Write session management utilities**

Create `lib/auth/session.ts`:
```typescript
import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionData } from './types';

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'ledger-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();

  if (!session.userId) {
    redirect('/login');
  }

  return {
    userId: session.userId,
    username: session.username,
  };
}

export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();

  if (!session.userId) {
    return null;
  }

  return {
    userId: session.userId,
    username: session.username,
  };
}
```

**Step 4: Commit**

Run:
```bash
git add lib/auth/
git commit -m "feat: add authentication utilities

- Implement iron-session configuration
- Add password hashing with bcrypt
- Create session helpers for auth checks"
```

---

## Task 5: Authentication - Login Page & Actions

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/layout.tsx`
- Create: `lib/actions/auth.ts`
- Create: `lib/validations/auth.ts`

**Step 1: Create Zod validation schema**

Create `lib/validations/auth.ts`:
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

**Step 2: Write login Server Action**

Create `lib/actions/auth.ts`:
```typescript
'use server';

import { redirect } from 'next/navigation';
import { queryOne } from '@/lib/db';
import { User } from '@/lib/db/types';
import { getSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/validations/auth';

export async function login(formData: FormData) {
  const result = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!result.success) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const { username, password } = result.data;

  const user = await queryOne<User>(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );

  if (!user) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  await session.save();

  redirect('/');
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect('/login');
}
```

**Step 3: Create auth layout**

Create `app/(auth)/layout.tsx`:
```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

**Step 4: Create login page**

Create `app/(auth)/login/page.tsx`:
```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { login } from '@/lib/actions/auth';
import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your credentials to access your ledger
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={login} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 5: Test login flow**

Run: `npm run dev`

Navigate to: `http://localhost:3000/login`

Test credentials: username=admin, password=admin123

Expected: Login form displays, successful login redirects to `/`

**Step 6: Commit**

Run:
```bash
git add app/ lib/
git commit -m "feat: implement login page and authentication

- Add login form with Shadcn UI components
- Create login Server Action with validation
- Add logout functionality
- Redirect authenticated users from login page"
```

---

## Task 6: Dashboard Layout & Protected Routes

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/page.tsx`
- Create: `components/dashboard/header.tsx`
- Create: `components/dashboard/nav.tsx`
- Modify: `app/layout.tsx`

**Step 1: Create root layout**

Modify `app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Financial Ledger',
  description: 'Manage and analyze your financial transactions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 2: Create dashboard header component**

Create `components/dashboard/header.tsx`:
```typescript
import { logout } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';

export async function DashboardHeader() {
  const user = await requireAuth();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financial Ledger</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user.username}
          </span>
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              Logout
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
```

**Step 3: Create dashboard navigation**

Create `components/dashboard/nav.tsx`:
```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function DashboardNav() {
  return (
    <nav className="border-b bg-muted/40">
      <div className="container mx-auto px-4 py-2">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Dashboard</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">Settings</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
```

**Step 4: Create dashboard layout**

Create `app/(dashboard)/layout.tsx`:
```typescript
import { requireAuth } from '@/lib/auth/session';
import { DashboardHeader } from '@/components/dashboard/header';
import { DashboardNav } from '@/components/dashboard/nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth(); // Protect all dashboard routes

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
```

**Step 5: Create placeholder dashboard page**

Create `app/(dashboard)/page.tsx`:
```typescript
export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
      <p className="text-muted-foreground">
        Cash flow analytics will appear here
      </p>
    </div>
  );
}
```

**Step 6: Test protected routes**

Run: `npm run dev`

Navigate to: `http://localhost:3000/`

Expected: Redirects to login if not authenticated, shows dashboard if logged in

**Step 7: Commit**

Run:
```bash
git add app/ components/
git commit -m "feat: add dashboard layout with navigation

- Create protected dashboard layout with auth check
- Add header with user info and logout button
- Add navigation between dashboard and settings
- Set up root layout with metadata"
```

---

## Task 7: Account Queries & Data Layer

**Files:**
- Create: `lib/db/accounts.ts`
- Create: `lib/db/categories.ts`

**Step 1: Write account query functions**

Create `lib/db/accounts.ts`:
```typescript
import { queryMany, queryOne } from './index';
import { Account } from './types';

export async function getAllAccounts(): Promise<Account[]> {
  return queryMany<Account>(
    'SELECT * FROM accounts ORDER BY name ASC'
  );
}

export async function getAccountById(id: number): Promise<Account | null> {
  return queryOne<Account>(
    'SELECT * FROM accounts WHERE id = $1',
    [id]
  );
}

export async function getAccountBalance(accountId: number): Promise<string> {
  const result = await queryOne<{ balance: string }>(
    `SELECT COALESCE(SUM(amount), 0)::decimal(15,2) as balance
     FROM transactions
     WHERE account_id = $1`,
    [accountId]
  );
  return result?.balance || '0.00';
}

export interface AccountWithBalance extends Account {
  balance: string;
}

export async function getAllAccountsWithBalances(): Promise<AccountWithBalance[]> {
  return queryMany<AccountWithBalance>(
    `SELECT
       a.id,
       a.name,
       a.created_at,
       COALESCE(SUM(t.amount), 0)::decimal(15,2) as balance
     FROM accounts a
     LEFT JOIN transactions t ON a.id = t.account_id
     GROUP BY a.id, a.name, a.created_at
     ORDER BY a.name ASC`
  );
}
```

**Step 2: Write category query functions**

Create `lib/db/categories.ts`:
```typescript
import { queryMany, queryOne } from './index';
import { Category } from './types';

export async function getAllCategories(): Promise<Category[]> {
  return queryMany<Category>(
    `SELECT * FROM categories ORDER BY category_type, depth, name ASC`
  );
}

export async function getCategoryById(id: number): Promise<Category | null> {
  return queryOne<Category>(
    'SELECT * FROM categories WHERE id = $1',
    [id]
  );
}

export interface CategoryWithPath extends Category {
  path: string;
}

export async function getAllCategoriesWithPaths(): Promise<CategoryWithPath[]> {
  // Recursive CTE to build full category paths
  return queryMany<CategoryWithPath>(
    `WITH RECURSIVE category_path AS (
       -- Base case: root categories
       SELECT
         id,
         name,
         parent_id,
         category_type,
         depth,
         created_at,
         name as path
       FROM categories
       WHERE parent_id IS NULL

       UNION ALL

       -- Recursive case: children
       SELECT
         c.id,
         c.name,
         c.parent_id,
         c.category_type,
         c.depth,
         c.created_at,
         cp.path || ' > ' || c.name as path
       FROM categories c
       INNER JOIN category_path cp ON c.parent_id = cp.id
     )
     SELECT * FROM category_path
     ORDER BY category_type, path ASC`
  );
}

export async function getCategoryDepth(categoryId: number | null): Promise<number> {
  if (!categoryId) return 0;

  const category = await getCategoryById(categoryId);
  return category?.depth || 0;
}
```

**Step 3: Commit**

Run:
```bash
git add lib/db/
git commit -m "feat: add account and category data layer

- Implement account queries with balance calculation
- Add category queries with recursive path building
- Support depth calculation for hierarchy validation"
```

---

## Task 8: Transaction Queries

**Files:**
- Create: `lib/db/transactions.ts`

**Step 1: Write transaction query functions**

Create `lib/db/transactions.ts`:
```typescript
import { queryMany, queryOne } from './index';
import { Transaction, TransactionWithDetails } from './types';

export async function getTransactionById(
  id: number
): Promise<Transaction | null> {
  return queryOne<Transaction>(
    'SELECT * FROM transactions WHERE id = $1',
    [id]
  );
}

export async function getTransactionsByAccount(
  accountId: number,
  options?: { limit?: number; offset?: number }
): Promise<TransactionWithDetails[]> {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  return queryMany<TransactionWithDetails>(
    `SELECT
       t.*,
       a.name as account_name,
       c.name as category_name,
       (
         WITH RECURSIVE category_path AS (
           SELECT id, name, parent_id, name as path
           FROM categories
           WHERE id = t.category_id

           UNION ALL

           SELECT c2.id, c2.name, c2.parent_id, c2.name || ' > ' || cp.path
           FROM categories c2
           INNER JOIN category_path cp ON c2.id = cp.parent_id
         )
         SELECT path FROM category_path WHERE parent_id IS NULL
       ) as category_path
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.id
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.account_id = $1
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [accountId, limit, offset]
  );
}

export async function getRecentTransactions(
  limit: number = 10
): Promise<TransactionWithDetails[]> {
  return queryMany<TransactionWithDetails>(
    `SELECT
       t.*,
       a.name as account_name,
       c.name as category_name,
       (
         WITH RECURSIVE category_path AS (
           SELECT id, name, parent_id, name as path
           FROM categories
           WHERE id = t.category_id

           UNION ALL

           SELECT c2.id, c2.name, c2.parent_id, c2.name || ' > ' || cp.path
           FROM categories c2
           INNER JOIN category_path cp ON c2.id = cp.parent_id
         )
         SELECT path FROM category_path WHERE parent_id IS NULL
       ) as category_path
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.id
     LEFT JOIN categories c ON t.category_id = c.id
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT $1`,
    [limit]
  );
}
```

**Step 2: Commit**

Run:
```bash
git add lib/db/
git commit -m "feat: add transaction query layer

- Implement transaction queries with account/category joins
- Add recursive CTE for category path in queries
- Support pagination for account transactions"
```

---

## Task 9: Analytics Queries

**Files:**
- Create: `lib/analytics/cash-flow.ts`
- Create: `lib/analytics/types.ts`

**Step 1: Define analytics types**

Create `lib/analytics/types.ts`:
```typescript
export interface MonthlyData {
  month: string; // YYYY-MM format
  income: string;
  expenses: string;
  net: string;
}

export interface CategoryBreakdown {
  category_id: number | null;
  category_name: string;
  category_path: string;
  amount: string;
  percentage: number;
}

export interface AccountSummary {
  total_balance: string;
  monthly_income: string;
  monthly_expenses: string;
  net_cash_flow: string;
}
```

**Step 2: Write cash flow analytics functions**

Create `lib/analytics/cash-flow.ts`:
```typescript
import { queryMany, queryOne } from '@/lib/db';
import { MonthlyData, CategoryBreakdown, AccountSummary } from './types';

export async function getAccountSummary(): Promise<AccountSummary> {
  const result = await queryOne<AccountSummary>(
    `SELECT
       COALESCE(SUM(t.amount), 0)::decimal(15,2) as total_balance,
       COALESCE(SUM(CASE
         WHEN c.category_type = 'income'
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
         THEN t.amount
         ELSE 0
       END), 0)::decimal(15,2) as monthly_income,
       COALESCE(ABS(SUM(CASE
         WHEN c.category_type = 'expense'
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
         THEN t.amount
         ELSE 0
       END)), 0)::decimal(15,2) as monthly_expenses,
       COALESCE(SUM(CASE
         WHEN DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
         THEN t.amount
         ELSE 0
       END), 0)::decimal(15,2) as net_cash_flow
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id`
  );

  return result || {
    total_balance: '0.00',
    monthly_income: '0.00',
    monthly_expenses: '0.00',
    net_cash_flow: '0.00',
  };
}

export async function getMonthlyCashFlow(
  months: number = 6
): Promise<MonthlyData[]> {
  return queryMany<MonthlyData>(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM') as month,
       COALESCE(SUM(CASE WHEN c.category_type = 'income' THEN t.amount ELSE 0 END), 0)::decimal(15,2) as income,
       COALESCE(ABS(SUM(CASE WHEN c.category_type = 'expense' THEN t.amount ELSE 0 END)), 0)::decimal(15,2) as expenses,
       COALESCE(SUM(t.amount), 0)::decimal(15,2) as net
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.date >= CURRENT_DATE - INTERVAL '1 month' * $1
     GROUP BY DATE_TRUNC('month', t.date)
     ORDER BY month DESC`,
    [months]
  );
}

export async function getCategoryBreakdown(
  categoryType: 'income' | 'expense',
  limit: number = 10
): Promise<CategoryBreakdown[]> {
  const rows = await queryMany<Omit<CategoryBreakdown, 'percentage'>>(
    `WITH category_totals AS (
       SELECT
         t.category_id,
         COALESCE(c.name, 'Uncategorized') as category_name,
         COALESCE(
           (
             WITH RECURSIVE category_path AS (
               SELECT id, name, parent_id, name as path
               FROM categories
               WHERE id = t.category_id

               UNION ALL

               SELECT c2.id, c2.name, c2.parent_id, c2.name || ' > ' || cp.path
               FROM categories c2
               INNER JOIN category_path cp ON c2.id = cp.parent_id
             )
             SELECT path FROM category_path WHERE parent_id IS NULL
           ),
           'Uncategorized'
         ) as category_path,
         ABS(SUM(t.amount))::decimal(15,2) as amount
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE (c.category_type = $1 OR t.category_id IS NULL)
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY t.category_id, c.name
     )
     SELECT * FROM category_totals
     WHERE amount > 0
     ORDER BY amount DESC
     LIMIT $2`,
    [categoryType, limit]
  );

  const total = rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

  return rows.map((row) => ({
    ...row,
    percentage: total > 0 ? (parseFloat(row.amount) / total) * 100 : 0,
  }));
}
```

**Step 3: Commit**

Run:
```bash
git add lib/analytics/
git commit -m "feat: add cash flow analytics queries

- Implement account summary with current month metrics
- Add monthly cash flow aggregation
- Create category breakdown with percentage calculation"
```

---

## Task 10: Transaction Server Actions

**Files:**
- Create: `lib/actions/transactions.ts`
- Create: `lib/validations/transactions.ts`

**Step 1: Create validation schemas**

Create `lib/validations/transactions.ts`:
```typescript
import { z } from 'zod';

export const transactionSchema = z.object({
  account_id: z.coerce.number().positive('Account is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  payee: z.string().min(1, 'Payee is required').max(200),
  category_id: z.coerce.number().nullable().optional(),
  amount: z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount'),
  comment: z.string().max(1000).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
```

**Step 2: Write transaction Server Actions**

Create `lib/actions/transactions.ts`:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { execute, executeReturning } from '@/lib/db';
import { Transaction } from '@/lib/db/types';
import { transactionSchema } from '@/lib/validations/transactions';

export async function createTransaction(formData: FormData) {
  await requireAuth();

  const data = {
    account_id: formData.get('account_id'),
    date: formData.get('date'),
    payee: formData.get('payee'),
    category_id: formData.get('category_id') || null,
    amount: formData.get('amount'),
    comment: formData.get('comment') || '',
  };

  const result = transactionSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { account_id, date, payee, category_id, amount, comment } = result.data;

  try {
    await executeReturning<Transaction>(
      `INSERT INTO transactions (account_id, date, payee, category_id, amount, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [account_id, date, payee, category_id, amount, comment || null]
    );

    revalidatePath('/');
    revalidatePath(`/accounts/${account_id}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to create transaction:', error);
    return {
      success: false,
      error: 'Failed to create transaction',
    };
  }
}

export async function updateTransaction(id: number, formData: FormData) {
  await requireAuth();

  const data = {
    account_id: formData.get('account_id'),
    date: formData.get('date'),
    payee: formData.get('payee'),
    category_id: formData.get('category_id') || null,
    amount: formData.get('amount'),
    comment: formData.get('comment') || '',
  };

  const result = transactionSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { account_id, date, payee, category_id, amount, comment } = result.data;

  try {
    await execute(
      `UPDATE transactions
       SET account_id = $1, date = $2, payee = $3, category_id = $4, amount = $5, comment = $6, updated_at = NOW()
       WHERE id = $7`,
      [account_id, date, payee, category_id, amount, comment || null, id]
    );

    revalidatePath('/');
    revalidatePath(`/accounts/${account_id}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to update transaction:', error);
    return {
      success: false,
      error: 'Failed to update transaction',
    };
  }
}

export async function deleteTransaction(id: number, accountId: number) {
  await requireAuth();

  try {
    await execute('DELETE FROM transactions WHERE id = $1', [id]);

    revalidatePath('/');
    revalidatePath(`/accounts/${accountId}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return {
      success: false,
      error: 'Failed to delete transaction',
    };
  }
}
```

**Step 3: Commit**

Run:
```bash
git add lib/
git commit -m "feat: add transaction Server Actions

- Implement create/update/delete transaction actions
- Add Zod validation for transaction data
- Handle errors and revalidate paths"
```

---

## Task 11: Account Server Actions

**Files:**
- Create: `lib/actions/accounts.ts`
- Create: `lib/validations/accounts.ts`

**Step 1: Create validation schema**

Create `lib/validations/accounts.ts`:
```typescript
import { z } from 'zod';

export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
});

export type AccountInput = z.infer<typeof accountSchema>;
```

**Step 2: Write account Server Actions**

Create `lib/actions/accounts.ts`:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { execute, executeReturning, queryOne } from '@/lib/db';
import { Account } from '@/lib/db/types';
import { accountSchema } from '@/lib/validations/accounts';

export async function createAccount(formData: FormData) {
  await requireAuth();

  const result = accountSchema.safeParse({
    name: formData.get('name'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name } = result.data;

  try {
    await executeReturning<Account>(
      'INSERT INTO accounts (name) VALUES ($1) RETURNING *',
      [name]
    );

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to create account:', error);
    return {
      success: false,
      error: 'Failed to create account',
    };
  }
}

export async function updateAccount(id: number, formData: FormData) {
  await requireAuth();

  const result = accountSchema.safeParse({
    name: formData.get('name'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name } = result.data;

  try {
    await execute(
      'UPDATE accounts SET name = $1 WHERE id = $2',
      [name, id]
    );

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to update account:', error);
    return {
      success: false,
      error: 'Failed to update account',
    };
  }
}

export async function deleteAccount(id: number) {
  await requireAuth();

  try {
    // Check if account has transactions
    const result = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE account_id = $1',
      [id]
    );

    if (result && result.count > 0) {
      return {
        success: false,
        error: `Cannot delete account with ${result.count} transaction(s)`,
      };
    }

    await execute('DELETE FROM accounts WHERE id = $1', [id]);

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete account:', error);
    return {
      success: false,
      error: 'Failed to delete account',
    };
  }
}
```

**Step 3: Commit**

Run:
```bash
git add lib/
git commit -m "feat: add account Server Actions

- Implement create/update/delete account actions
- Add validation for account name
- Prevent deletion of accounts with transactions"
```

---

## Task 12: Category Server Actions

**Files:**
- Create: `lib/actions/categories.ts`
- Create: `lib/validations/categories.ts`

**Step 1: Create validation schema**

Create `lib/validations/categories.ts`:
```typescript
import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  category_type: z.enum(['income', 'expense'], {
    required_error: 'Category type is required',
  }),
  parent_id: z.coerce.number().nullable().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
```

**Step 2: Write category Server Actions**

Create `lib/actions/categories.ts`:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { execute, executeReturning } from '@/lib/db';
import { getCategoryDepth } from '@/lib/db/categories';
import { Category } from '@/lib/db/types';
import { categorySchema } from '@/lib/validations/categories';

export async function createCategory(formData: FormData) {
  await requireAuth();

  const result = categorySchema.safeParse({
    name: formData.get('name'),
    category_type: formData.get('category_type'),
    parent_id: formData.get('parent_id') || null,
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name, category_type, parent_id } = result.data;

  try {
    // Calculate depth
    const parentDepth = await getCategoryDepth(parent_id || null);
    const depth = parentDepth + 1;

    if (depth > 3) {
      return {
        success: false,
        error: 'Maximum category depth is 3',
      };
    }

    await executeReturning<Category>(
      `INSERT INTO categories (name, category_type, parent_id, depth)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, category_type, parent_id, depth]
    );

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to create category:', error);
    return {
      success: false,
      error: 'Failed to create category',
    };
  }
}

export async function updateCategory(id: number, formData: FormData) {
  await requireAuth();

  const result = categorySchema.safeParse({
    name: formData.get('name'),
    category_type: formData.get('category_type'),
    parent_id: formData.get('parent_id') || null,
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name, category_type, parent_id } = result.data;

  try {
    // Calculate new depth
    const parentDepth = await getCategoryDepth(parent_id || null);
    const depth = parentDepth + 1;

    if (depth > 3) {
      return {
        success: false,
        error: 'Maximum category depth is 3',
      };
    }

    await execute(
      `UPDATE categories
       SET name = $1, category_type = $2, parent_id = $3, depth = $4
       WHERE id = $5`,
      [name, category_type, parent_id, depth, id]
    );

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to update category:', error);
    return {
      success: false,
      error: 'Failed to update category',
    };
  }
}

export async function deleteCategory(id: number) {
  await requireAuth();

  try {
    // Cascade deletion handled by database
    await execute('DELETE FROM categories WHERE id = $1', [id]);

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete category:', error);
    return {
      success: false,
      error: 'Failed to delete category',
    };
  }
}
```

**Step 3: Commit**

Run:
```bash
git add lib/
git commit -m "feat: add category Server Actions

- Implement create/update/delete category actions
- Add depth calculation and validation
- Handle parent-child relationships"
```

---

## Task 13: Dashboard Page with Analytics

**Files:**
- Modify: `app/(dashboard)/page.tsx`
- Create: `components/dashboard/summary-cards.tsx`
- Create: `components/dashboard/cash-flow-chart.tsx`
- Create: `components/dashboard/category-chart.tsx`
- Create: `components/dashboard/recent-transactions.tsx`

**Step 1: Create summary cards component**

Create `components/dashboard/summary-cards.tsx`:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAccountSummary } from '@/lib/analytics/cash-flow';

export async function SummaryCards() {
  const summary = await getAccountSummary();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${parseFloat(summary.total_balance).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ${parseFloat(summary.monthly_income).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            ${parseFloat(summary.monthly_expenses).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Cash Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              parseFloat(summary.net_cash_flow) >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            ${parseFloat(summary.net_cash_flow).toFixed(2)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create cash flow chart component**

Create `components/dashboard/cash-flow-chart.tsx`:
```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CashFlowChartProps {
  data: Array<{
    month: string;
    income: string;
    expenses: string;
    net: string;
  }>;
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const chartData = data.map((item) => ({
    month: item.month,
    Income: parseFloat(item.income),
    Expenses: parseFloat(item.expenses),
    Net: parseFloat(item.net),
  })).reverse(); // Show oldest to newest

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Income"
              stroke="#22c55e"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Expenses"
              stroke="#ef4444"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Net"
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Create category breakdown chart**

Create `components/dashboard/category-chart.tsx`:
```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CategoryChartProps {
  data: Array<{
    category_name: string;
    amount: string;
    percentage: number;
  }>;
  title: string;
  color: string;
}

export function CategoryChart({ data, title, color }: CategoryChartProps) {
  const chartData = data.map((item) => ({
    category: item.category_name,
    amount: parseFloat(item.amount),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

**Step 4: Create recent transactions component**

Create `components/dashboard/recent-transactions.tsx`:
```typescript
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getRecentTransactions } from '@/lib/db/transactions';

export async function RecentTransactions() {
  const transactions = await getRecentTransactions(10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No transactions yet
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>
                    <Link
                      href={`/accounts/${transaction.account_id}`}
                      className="hover:underline"
                    >
                      {transaction.account_name}
                    </Link>
                  </TableCell>
                  <TableCell>{transaction.payee}</TableCell>
                  <TableCell>
                    {transaction.category_path || 'Uncategorized'}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      parseFloat(transaction.amount) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    ${parseFloat(transaction.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

**Step 5: Update dashboard page**

Modify `app/(dashboard)/page.tsx`:
```typescript
import { Suspense } from 'react';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { CashFlowChart } from '@/components/dashboard/cash-flow-chart';
import { CategoryChart } from '@/components/dashboard/category-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import {
  getMonthlyCashFlow,
  getCategoryBreakdown,
} from '@/lib/analytics/cash-flow';

export default async function DashboardPage() {
  const [monthlyData, expenseBreakdown, incomeBreakdown] = await Promise.all([
    getMonthlyCashFlow(6),
    getCategoryBreakdown('expense', 5),
    getCategoryBreakdown('income', 5),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Dashboard</h2>

      <Suspense fallback={<div>Loading summary...</div>}>
        <SummaryCards />
      </Suspense>

      <CashFlowChart data={monthlyData} />

      <div className="grid gap-6 md:grid-cols-2">
        <CategoryChart
          data={expenseBreakdown}
          title="Top Expenses This Month"
          color="#ef4444"
        />
        <CategoryChart
          data={incomeBreakdown}
          title="Income Sources This Month"
          color="#22c55e"
        />
      </div>

      <Suspense fallback={<div>Loading transactions...</div>}>
        <RecentTransactions />
      </Suspense>
    </div>
  );
}
```

**Step 6: Test dashboard**

Run: `npm run dev`

Navigate to: `http://localhost:3000/`

Expected: Dashboard displays with cards, charts, and recent transactions (may be empty initially)

**Step 7: Commit**

Run:
```bash
git add app/ components/
git commit -m "feat: implement dashboard with analytics

- Add summary cards showing balances and cash flow
- Create line chart for monthly income/expenses
- Add category breakdown bar charts
- Display recent transactions table with links"
```

---

## Task 14: Account Detail Page

**Files:**
- Create: `app/(dashboard)/accounts/[id]/page.tsx`
- Create: `components/transactions/transaction-table.tsx`
- Create: `components/transactions/transaction-form.tsx`

**Step 1: Create transaction table component**

Create `components/transactions/transaction-table.tsx`:
```typescript
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TransactionWithDetails } from '@/lib/db/types';
import { deleteTransaction } from '@/lib/actions/transactions';

interface TransactionTableProps {
  transactions: TransactionWithDetails[];
  onEdit: (transaction: TransactionWithDetails) => void;
}

export function TransactionTable({
  transactions,
  onEdit,
}: TransactionTableProps) {
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDelete = async (id: number, accountId: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    setDeleting(id);
    await deleteTransaction(id, accountId);
    setDeleting(null);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Payee</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Comment</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center text-muted-foreground"
            >
              No transactions yet
            </TableCell>
          </TableRow>
        ) : (
          transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{transaction.date}</TableCell>
              <TableCell>{transaction.payee}</TableCell>
              <TableCell>
                {transaction.category_path || 'Uncategorized'}
              </TableCell>
              <TableCell
                className={`text-right font-medium ${
                  parseFloat(transaction.amount) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                ${parseFloat(transaction.amount).toFixed(2)}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {transaction.comment}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(transaction)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    handleDelete(transaction.id, transaction.account_id)
                  }
                  disabled={deleting === transaction.id}
                >
                  {deleting === transaction.id ? 'Deleting...' : 'Delete'}
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
```

**Step 2: Create transaction form component**

Create `components/transactions/transaction-form.tsx`:
```typescript
'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Account, CategoryWithPath, TransactionWithDetails } from '@/lib/db/types';
import { createTransaction, updateTransaction } from '@/lib/actions/transactions';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: CategoryWithPath[];
  transaction?: TransactionWithDetails | null;
  defaultAccountId?: number;
}

export function TransactionForm({
  open,
  onClose,
  accounts,
  categories,
  transaction,
  defaultAccountId,
}: TransactionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
    }
  }, [open]);

  const handleSubmit = async (formData: FormData) => {
    if (transaction) {
      await updateTransaction(transaction.id, formData);
    } else {
      await createTransaction(formData);
    }
    onClose();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </SheetTitle>
          <SheetDescription>
            {transaction
              ? 'Update transaction details'
              : 'Enter transaction details'}
          </SheetDescription>
        </SheetHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="account_id">Account</Label>
            <Select
              name="account_id"
              defaultValue={
                transaction?.account_id.toString() ||
                defaultAccountId?.toString()
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={transaction?.date || today}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payee">Payee</Label>
            <Input
              id="payee"
              name="payee"
              type="text"
              defaultValue={transaction?.payee}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select
              name="category_id"
              defaultValue={transaction?.category_id?.toString() || ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              defaultValue={transaction?.amount}
              placeholder="Use negative for expenses"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              name="comment"
              defaultValue={transaction?.comment || ''}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {transaction ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 3: Create account detail page**

Create `app/(dashboard)/accounts/[id]/page.tsx`:
```typescript
'use client';

import { use, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { getAccountById, getAccountBalance } from '@/lib/db/accounts';
import { getTransactionsByAccount } from '@/lib/db/transactions';
import { getAllAccounts } from '@/lib/db/accounts';
import { getAllCategoriesWithPaths } from '@/lib/db/categories';
import { TransactionWithDetails } from '@/lib/db/types';
import { notFound } from 'next/navigation';

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const accountId = parseInt(resolvedParams.id);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithDetails | null>(null);

  // Fetch data (this would normally be done server-side, but for the form we need client components)
  // In a real implementation, you'd split this into server and client components
  const [account, setAccount] = useState<any>(null);
  const [balance, setBalance] = useState<string>('0.00');
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // This is a workaround - in production, you'd structure this differently
  // with server components for data fetching and client components only for interactivity

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Account placeholder</h2>
          <p className="text-muted-foreground">Account details and transactions</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Add Transaction</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">$0.00</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={transactions}
            onEdit={(transaction) => {
              setEditingTransaction(transaction);
              setFormOpen(true);
            }}
          />
        </CardContent>
      </Card>

      <TransactionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTransaction(null);
        }}
        accounts={accounts}
        categories={categories}
        transaction={editingTransaction}
        defaultAccountId={accountId}
      />
    </div>
  );
}
```

**Step 4: Fix the account detail page to use server components properly**

Replace `app/(dashboard)/accounts/[id]/page.tsx` with a proper server/client split:

```typescript
import { notFound } from 'next/navigation';
import { getAccountById, getAccountBalance } from '@/lib/db/accounts';
import { getTransactionsByAccount } from '@/lib/db/transactions';
import { getAllAccounts } from '@/lib/db/accounts';
import { getAllCategoriesWithPaths } from '@/lib/db/categories';
import { AccountDetailClient } from './client';

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const accountId = parseInt(resolvedParams.id);

  const [account, balance, transactions, accounts, categories] =
    await Promise.all([
      getAccountById(accountId),
      getAccountBalance(accountId),
      getTransactionsByAccount(accountId),
      getAllAccounts(),
      getAllCategoriesWithPaths(),
    ]);

  if (!account) {
    notFound();
  }

  return (
    <AccountDetailClient
      account={account}
      balance={balance}
      transactions={transactions}
      accounts={accounts}
      categories={categories}
    />
  );
}
```

**Step 5: Create the client component**

Create `app/(dashboard)/accounts/[id]/client.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { Account, CategoryWithPath, TransactionWithDetails } from '@/lib/db/types';

interface AccountDetailClientProps {
  account: Account;
  balance: string;
  transactions: TransactionWithDetails[];
  accounts: Account[];
  categories: CategoryWithPath[];
}

export function AccountDetailClient({
  account,
  balance,
  transactions,
  accounts,
  categories,
}: AccountDetailClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithDetails | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{account.name}</h2>
          <p className="text-muted-foreground">
            Account details and transactions
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTransaction(null);
            setFormOpen(true);
          }}
        >
          Add Transaction
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-3xl font-bold ${
              parseFloat(balance) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            ${parseFloat(balance).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={transactions}
            onEdit={(transaction) => {
              setEditingTransaction(transaction);
              setFormOpen(true);
            }}
          />
        </CardContent>
      </Card>

      <TransactionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTransaction(null);
        }}
        accounts={accounts}
        categories={categories}
        transaction={editingTransaction}
        defaultAccountId={account.id}
      />
    </div>
  );
}
```

**Step 6: Commit**

Run:
```bash
git add app/ components/
git commit -m "feat: implement account detail page

- Create transaction table with edit/delete actions
- Add transaction form in slide-over sheet
- Display account balance and transactions
- Support both create and edit modes"
```

---

## Task 15: Settings Page

**Files:**
- Create: `app/(dashboard)/settings/page.tsx`
- Create: `app/(dashboard)/settings/client.tsx`
- Create: `components/settings/account-manager.tsx`
- Create: `components/settings/category-manager.tsx`

**Step 1: Create account manager component**

Create `components/settings/account-manager.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Account } from '@/lib/db/types';
import {
  createAccount,
  updateAccount,
  deleteAccount,
} from '@/lib/actions/accounts';

interface AccountManagerProps {
  accounts: Account[];
}

export function AccountManager({ accounts }: AccountManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleSubmit = async (formData: FormData) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, formData);
    } else {
      await createAccount(formData);
    }
    setDialogOpen(false);
    setEditingAccount(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this account?')) {
      return;
    }
    const result = await deleteAccount(id);
    if (!result.success) {
      alert(result.error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Accounts</CardTitle>
        <Button
          onClick={() => {
            setEditingAccount(null);
            setDialogOpen(true);
          }}
        >
          Add Account
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.name}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingAccount(account);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(account.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? 'Edit Account' : 'Add Account'}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? 'Update account name'
                  : 'Create a new account'}
              </DialogDescription>
            </DialogHeader>

            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingAccount?.name}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingAccount ? 'Update' : 'Create'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create category manager component**

Create `components/settings/category-manager.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Category, CategoryWithPath } from '@/lib/db/types';
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/actions/categories';

interface CategoryManagerProps {
  categories: CategoryWithPath[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithPath | null>(
    null
  );

  const handleSubmit = async (formData: FormData) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, formData);
    } else {
      await createCategory(formData);
    }
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        'Are you sure? This will also delete all child categories and unlink transactions.'
      )
    ) {
      return;
    }
    await deleteCategory(id);
  };

  // Filter valid parent options (depth < 3)
  const validParents = categories.filter((c) => c.depth < 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Categories</CardTitle>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setDialogOpen(true);
          }}
        >
          Add Category
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Depth</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <span style={{ paddingLeft: `${(category.depth - 1) * 20}px` }}>
                    {category.path}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs ${
                      category.category_type === 'income'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {category.category_type}
                  </span>
                </TableCell>
                <TableCell>{category.depth}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCategory(category);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? 'Update category details'
                  : 'Create a new category'}
              </DialogDescription>
            </DialogHeader>

            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingCategory?.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_type">Type</Label>
                <Select
                  name="category_type"
                  defaultValue={editingCategory?.category_type || 'expense'}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_id">Parent Category (Optional)</Label>
                <Select
                  name="parent_id"
                  defaultValue={editingCategory?.parent_id?.toString() || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (root category)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (root category)</SelectItem>
                    {validParents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id.toString()}>
                        {parent.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Create settings page server component**

Create `app/(dashboard)/settings/page.tsx`:
```typescript
import { getAllAccounts } from '@/lib/db/accounts';
import { getAllCategoriesWithPaths } from '@/lib/db/categories';
import { SettingsClient } from './client';

export default async function SettingsPage() {
  const [accounts, categories] = await Promise.all([
    getAllAccounts(),
    getAllCategoriesWithPaths(),
  ]);

  return <SettingsClient accounts={accounts} categories={categories} />;
}
```

**Step 4: Create settings client component**

Create `app/(dashboard)/settings/client.tsx`:
```typescript
'use client';

import { Account, CategoryWithPath } from '@/lib/db/types';
import { AccountManager } from '@/components/settings/account-manager';
import { CategoryManager } from '@/components/settings/category-manager';

interface SettingsClientProps {
  accounts: Account[];
  categories: CategoryWithPath[];
}

export function SettingsClient({ accounts, categories }: SettingsClientProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Settings</h2>

      <AccountManager accounts={accounts} />

      <CategoryManager categories={categories} />
    </div>
  );
}
```

**Step 5: Test settings page**

Run: `npm run dev`

Navigate to: `http://localhost:3000/settings`

Expected: See account and category management interfaces

**Step 6: Commit**

Run:
```bash
git add app/ components/
git commit -m "feat: implement settings page

- Add account management with create/edit/delete
- Add category management with hierarchy support
- Validate category depth on creation
- Prevent account deletion if it has transactions"
```

---

## Task 16: Error Handling & Loading States

**Files:**
- Create: `app/(dashboard)/error.tsx`
- Create: `app/(dashboard)/loading.tsx`
- Create: `app/(dashboard)/accounts/[id]/loading.tsx`

**Step 1: Create dashboard error boundary**

Create `app/(dashboard)/error.tsx`:
```typescript
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            An error occurred while loading this page.
          </p>
          <Button onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create dashboard loading state**

Create `app/(dashboard)/loading.tsx`:
```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-48 bg-slate-200 rounded animate-pulse" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-slate-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Create account detail loading state**

Create `app/(dashboard)/accounts/[id]/loading.tsx`:
```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Commit**

Run:
```bash
git add app/
git commit -m "feat: add error handling and loading states

- Create error boundary for dashboard routes
- Add skeleton loaders for async data
- Improve user experience during loading"
```

---

## Task 17: Documentation & Deployment Prep

**Files:**
- Create: `README.md`
- Create: `.env.example` (update)
- Create: `docs/DEPLOYMENT.md`

**Step 1: Create README**

Create `README.md`:
```markdown
# Financial Ledger Application

A web-based ledger application for managing, categorizing, and analyzing financial transactions across multiple accounts.

## Features

- Multi-account transaction management
- Hierarchical category organization (up to 3 levels deep)
- Cash flow analytics and visualizations
- Income vs expense tracking
- Shared access for multiple users (family finances)

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Shadcn UI, Tailwind CSS
- **Backend:** Next.js Server Components & Server Actions
- **Database:** PostgreSQL (Neon)
- **Auth:** iron-session with bcrypt
- **Charts:** Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or Neon)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your database connection string and session secret.

4. Initialize the database:
   ```bash
   psql $POSTGRES_URL -f scripts/init-db.sql
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Default Login

- **Username:** admin
- **Password:** admin123

## Project Structure

```
/app
  /(auth)         - Authentication pages
  /(dashboard)    - Protected dashboard routes
/lib
  /db             - Database queries
  /actions        - Server Actions
  /auth           - Authentication utilities
  /analytics      - Analytics calculations
  /validations    - Zod schemas
/components
  /ui             - Shadcn UI components
  /dashboard      - Dashboard components
  /transactions   - Transaction components
  /settings       - Settings components
/scripts          - Database scripts
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment instructions.

## License

MIT
```

**Step 2: Update .env.example**

Modify `.env.example`:
```
# Database
POSTGRES_URL=postgresql://user:password@localhost:5432/ledger

# Session (generate with: openssl rand -base64 32)
SESSION_SECRET=your-32-character-secret-key-here

# Environment
NODE_ENV=development
```

**Step 3: Create deployment documentation**

Create `docs/DEPLOYMENT.md`:
```markdown
# Deployment Guide

## Prerequisites

- Vercel account
- Neon PostgreSQL account

## Steps

### 1. Set up Neon Database

1. Create a new Neon project at [neon.tech](https://neon.tech)
2. Note your connection string
3. Run the initialization script:
   ```bash
   psql <connection-string> -f scripts/init-db.sql
   ```

### 2. Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables:
   - `POSTGRES_URL`: Your Neon connection string
   - `SESSION_SECRET`: Generate with `openssl rand -base64 32`
   - `NODE_ENV`: `production`

4. Deploy

### 3. Verify Deployment

1. Visit your deployed URL
2. Log in with default credentials (admin/admin123)
3. Test creating accounts, categories, and transactions

## Environment Variables

### Required

- `POSTGRES_URL`: PostgreSQL connection string (from Neon)
- `SESSION_SECRET`: 32+ character random string for session encryption

### Optional

- `NODE_ENV`: Set to `production` for production builds

## Database Management

### Creating a Backup

```bash
pg_dump $POSTGRES_URL > backup.sql
```

### Restoring from Backup

```bash
psql $POSTGRES_URL < backup.sql
```

## Security Considerations

1. Change default admin password after first login
2. Use strong SESSION_SECRET (32+ characters)
3. Enable 2FA on Vercel and Neon accounts
4. Regularly update dependencies
5. Monitor logs for suspicious activity

## Monitoring

- **Logs:** Check Vercel deployment logs for errors
- **Database:** Monitor query performance in Neon dashboard
- **Errors:** Review error boundaries and logs

## Troubleshooting

### Database Connection Errors

- Verify POSTGRES_URL is correct
- Check Neon project is active
- Ensure IP allowlist is configured (if applicable)

### Session Errors

- Verify SESSION_SECRET is set
- Check cookie settings in production

### Build Errors

- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
```

**Step 4: Commit**

Run:
```bash
git add README.md .env.example docs/
git commit -m "docs: add README and deployment documentation

- Create comprehensive README with setup instructions
- Add deployment guide for Vercel and Neon
- Document environment variables and security considerations"
```

---

## Summary

This implementation plan provides step-by-step instructions to build the financial ledger application from scratch. Each task follows TDD principles where applicable and includes:

- Explicit file paths
- Complete code examples
- Test commands with expected outputs
- Frequent, meaningful commits

The plan is organized into 17 major tasks covering:
1. Project setup
2. Database schema
3. Database utilities
4. Authentication
5. Dashboard infrastructure
6. Data layers (accounts, categories, transactions, analytics)
7. Server Actions
8. UI components
9. Pages
10. Error handling
11. Documentation

Total estimated implementation time: 8-12 hours for a skilled developer following this plan.
