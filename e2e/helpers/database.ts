import { sql } from '@vercel/postgres';

export async function cleanupTestDatabase() {
  console.log('🧹 Cleaning test database...');

  try {
    // Delete all transactions (depends on accounts and categories)
    await sql`DELETE FROM transactions`;

    // Delete all accounts
    await sql`DELETE FROM accounts`;

    // Delete all categories
    await sql`DELETE FROM categories`;

    console.log('✅ Cleaned all test data');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  }
}

export async function seedTestDatabase() {
  console.log('🌱 Seeding test database...');

  try {
    // Seed admin user (password: admin123)
    await sql`
      INSERT INTO users (username, password_hash)
      VALUES ('admin', '$2b$12$33IAwrMlVq40YQ3xN.sf4.BvKPHmM8Dx/.XLCryjf/ONDw7cDOfGq')
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `;
    console.log('✅ Seeded admin user');

    // Seed default categories - using same approach as init-db.sql
    await sql`
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
        -- Food subcategories (depth 2) - NULL parent_id initially
        ('Groceries', 'expense', NULL, 2),
        ('Restaurants', 'expense', NULL, 2),
        -- Transportation subcategories (depth 2) - NULL parent_id initially
        ('Gas', 'expense', NULL, 2),
        ('Public Transit', 'expense', NULL, 2),
        -- Housing subcategories (depth 2) - NULL parent_id initially
        ('Rent', 'expense', NULL, 2),
        ('Mortgage', 'expense', NULL, 2)
      ON CONFLICT DO NOTHING
    `;
    console.log('✅ Seeded categories');

    // Seed test accounts (ID 1 must be 'Checking Account' for input-validation tests)
    await sql`
      INSERT INTO accounts (name) VALUES
        ('Checking Account'),
        ('Savings Account'),
        ('Credit Card')
      ON CONFLICT DO NOTHING
    `;
    console.log('✅ Seeded accounts');

    console.log('✨ Database seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

export async function resetTestDatabase() {
  await cleanupTestDatabase();
  await seedTestDatabase();
}

const accountCache = new Map<string, number>();

export async function getAccountIdByName(accountName: string): Promise<number> {
  if (accountCache.has(accountName)) {
    return accountCache.get(accountName)!;
  }

  const result = await sql`
    SELECT id FROM accounts WHERE name = ${accountName} LIMIT 1
  `;

  if (result.rows.length === 0) {
    throw new Error(`Account '${accountName}' not found in database`);
  }

  const accountId = Number(result.rows[0].id);
  accountCache.set(accountName, accountId);
  return accountId;
}
