import dotenv from 'dotenv';
import { resolve } from 'path';
import { queryOne, execute } from '@/lib/db';

// Load .env.local file
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const testTransactionsRaw = [
  {
    account_name: 'Checking Account',
    date: '2024-01-15',
    payee: 'Monthly Salary',
    category_name: 'Salary',
    amount: 5000.00,
    comment: 'January salary deposit',
  },
  {
    account_name: 'Checking Account',
    date: '2024-01-16',
    payee: 'Whole Foods Market',
    category_name: 'Groceries',
    amount: -127.45,
    comment: 'Weekly groceries',
  },
  {
    account_name: 'Credit Card',
    date: '2024-01-17',
    payee: 'Shell Gas Station',
    category_name: 'Gas',
    amount: -55.20,
    comment: 'Fuel for car',
  },
  {
    account_name: 'Checking Account',
    date: '2024-01-18',
    payee: 'Landlord LLC',
    category_name: 'Rent',
    amount: -1500.00,
    comment: 'January rent payment',
  },
  {
    account_name: 'Credit Card',
    date: '2024-01-19',
    payee: 'Netflix',
    category_name: 'Entertainment',
    amount: -15.99,
    comment: 'Monthly subscription',
  },
  {
    account_name: 'Savings Account',
    date: '2024-01-20',
    payee: 'Investment Returns',
    category_name: 'Investments',
    amount: 250.00,
    comment: 'Quarterly dividend payment',
  },
  {
    account_name: 'Credit Card',
    date: '2024-01-21',
    payee: 'Chipotle Mexican Grill',
    category_name: 'Restaurants',
    amount: -23.75,
    comment: 'Lunch with colleagues',
  },
  {
    account_name: 'Checking Account',
    date: '2024-01-22',
    payee: 'Metro Transit',
    category_name: 'Public Transit',
    amount: -87.50,
    comment: 'Monthly transit pass',
  },
  {
    account_name: 'Checking Account',
    date: '2024-01-23',
    payee: 'Electric Company',
    category_name: 'Utilities',
    amount: -125.30,
    comment: 'January electricity bill',
  },
  {
    account_name: 'Savings Account',
    date: '2024-01-24',
    payee: 'Freelance Project',
    category_name: 'Business Income',
    amount: 800.00,
    comment: 'Website design project payment',
  },
];

async function seedTransactions() {
  console.log('Starting to seed test transactions...');

  for (let i = 0; i < testTransactionsRaw.length; i++) {
    const raw = testTransactionsRaw[i];

    const accountResult = await queryOne<{ id: number }>(
      `SELECT id FROM accounts WHERE name = $1 LIMIT 1`,
      [raw.account_name]
    );

    if (!accountResult) {
      throw new Error(`Account '${raw.account_name}' not found in database`);
    }

    const categoryResult = await queryOne<{ id: number }>(
      `SELECT id FROM categories WHERE name = $1 LIMIT 1`,
      [raw.category_name]
    );

    if (!categoryResult) {
      throw new Error(`Category '${raw.category_name}' not found in database`);
    }

    await execute(
      `INSERT INTO transactions (account_id, date, payee, category_id, amount, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        accountResult.id,
        raw.date,
        raw.payee,
        categoryResult.id,
        raw.amount,
        raw.comment || null,
      ]
    );

    console.log(`✓ Added transaction ${i + 1}/10: ${raw.payee} ($${raw.amount})`);
  }

  console.log('\n✨ Successfully seeded 10 test transactions!');
  process.exit(0);
}

seedTransactions().catch((error) => {
  console.error('Error seeding transactions:', error);
  process.exit(1);
});
