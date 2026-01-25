import { vi } from 'vitest';

// Database mock
export const mockQueryResult = (rows: any[] = []) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

export const createDbMock = () => ({
  query: vi.fn(),
});

// Session mock
export const createSessionMock = (data: any = {}) => ({
  userId: data.userId,
  username: data.username,
  save: vi.fn(),
  destroy: vi.fn(),
});

// Mock user data
export const mockUser = {
  id: 1,
  username: 'testuser',
  password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqXy.LqIhq', // hash of 'password123'
  created_at: new Date('2024-01-01'),
};

// Mock transaction data
export const mockTransaction = {
  id: 1,
  account_id: 1,
  date: '2024-01-15',
  payee: 'Test Payee',
  category_id: 1,
  amount: '100.00',
  comment: 'Test transaction',
  created_at: new Date('2024-01-15'),
  updated_at: new Date('2024-01-15'),
};

// Mock transaction with details
export const mockTransactionWithDetails = {
  ...mockTransaction,
  account_name: 'Test Account',
  category_name: 'Groceries',
  category_path: 'Food > Groceries',
};

// Mock account data
export const mockAccount = {
  id: 1,
  name: 'Test Account',
  created_at: new Date('2024-01-01'),
};

// Mock category data
export const mockCategory = {
  id: 1,
  name: 'Groceries',
  parent_id: null,
  category_type: 'expense' as const,
  depth: 1,
  created_at: new Date('2024-01-01'),
};

// Mock analytics data
export const mockMonthlyData = [
  {
    month: '2024-01',
    income: '5000.00',
    expenses: '3000.00',
    net: '2000.00',
  },
  {
    month: '2023-12',
    income: '4800.00',
    expenses: '3200.00',
    net: '1600.00',
  },
];

export const mockCategoryBreakdown = [
  {
    category_id: 1,
    category_name: 'Groceries',
    category_path: 'Food > Groceries',
    amount: '500.00',
    percentage: 0,
  },
  {
    category_id: 2,
    category_name: 'Utilities',
    category_path: 'Bills > Utilities',
    amount: '300.00',
    percentage: 0,
  },
];

export const mockAccountSummary = {
  total_balance: '10000.00',
  monthly_income: '5000.00',
  monthly_expenses: '3000.00',
  net_cash_flow: '2000.00',
};
