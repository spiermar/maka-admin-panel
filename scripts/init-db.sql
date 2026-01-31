-- Run schema
\i lib/db/schema.sql

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
