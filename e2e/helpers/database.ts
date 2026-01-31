import { sql } from '@vercel/postgres';

export async function cleanupTestDatabase() {
  console.log('🧹 Cleaning test database...');

  try {
    // Delete all transactions (depends on accounts and categories)
    await sql`DELETE FROM transactions`;

    console.log('✅ Cleaned transactions');
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

    // Seed default categories
    const categoryResult = await sql`
      INSERT INTO categories (name, category_type, parent_id, depth) VALUES
        ('Salary', 'income', NULL, 1),
        ('Business Income', 'income', NULL, 1),
        ('Investments', 'income', NULL, 1),
        ('Food & Dining', 'expense', NULL, 1),
        ('Transportation', 'expense', NULL, 1),
        ('Housing', 'expense', NULL, 1),
        ('Utilities', 'expense', NULL, 1),
        ('Entertainment', 'expense', NULL, 1),
        ('Groceries', 'expense', (SELECT id FROM categories WHERE name = 'Food & Dining'), 2),
        ('Restaurants', 'expense', (SELECT id FROM categories WHERE name = 'Food & Dining'), 2),
        ('Gas', 'expense', (SELECT id FROM categories WHERE name = 'Transportation'), 2),
        ('Public Transit', 'expense', (SELECT id FROM categories WHERE name = 'Transportation'), 2),
        ('Rent', 'expense', (SELECT id FROM categories WHERE name = 'Housing'), 2),
        ('Mortgage', 'expense', (SELECT id FROM categories WHERE name = 'Housing'), 2)
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
