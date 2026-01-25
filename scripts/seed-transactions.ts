import dotenv from 'dotenv';
import { resolve } from 'path';
import { execute } from '@/lib/db';

// Load .env.local file
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

interface TestTransaction {
  account_id: number;
  date: string;
  payee: string;
  category_id: number | null;
  amount: number;
  comment?: string;
}

const testTransactions: TestTransaction[] = [
  {
    account_id: 1, // Checking Account
    date: '2024-01-15',
    payee: 'Monthly Salary',
    category_id: 1, // Salary
    amount: 5000.00,
    comment: 'January salary deposit',
  },
  {
    account_id: 1, // Checking Account
    date: '2024-01-16',
    payee: 'Whole Foods Market',
    category_id: 9, // Groceries
    amount: -127.45,
    comment: 'Weekly groceries',
  },
  {
    account_id: 3, // Credit Card
    date: '2024-01-17',
    payee: 'Shell Gas Station',
    category_id: 11, // Gas
    amount: -55.20,
    comment: 'Fuel for car',
  },
  {
    account_id: 1, // Checking Account
    date: '2024-01-18',
    payee: 'Landlord LLC',
    category_id: 13, // Rent
    amount: -1500.00,
    comment: 'January rent payment',
  },
  {
    account_id: 3, // Credit Card
    date: '2024-01-19',
    payee: 'Netflix',
    category_id: 8, // Entertainment
    amount: -15.99,
    comment: 'Monthly subscription',
  },
  {
    account_id: 2, // Savings Account
    date: '2024-01-20',
    payee: 'Investment Returns',
    category_id: 3, // Investments
    amount: 250.00,
    comment: 'Quarterly dividend payment',
  },
  {
    account_id: 3, // Credit Card
    date: '2024-01-21',
    payee: 'Chipotle Mexican Grill',
    category_id: 10, // Restaurants
    amount: -23.75,
    comment: 'Lunch with colleagues',
  },
  {
    account_id: 1, // Checking Account
    date: '2024-01-22',
    payee: 'Metro Transit',
    category_id: 12, // Public Transit
    amount: -87.50,
    comment: 'Monthly transit pass',
  },
  {
    account_id: 1, // Checking Account
    date: '2024-01-23',
    payee: 'Electric Company',
    category_id: 7, // Utilities
    amount: -125.30,
    comment: 'January electricity bill',
  },
  {
    account_id: 2, // Savings Account
    date: '2024-01-24',
    payee: 'Freelance Project',
    category_id: 2, // Business Income
    amount: 800.00,
    comment: 'Website design project payment',
  },
];

async function seedTransactions() {
  console.log('Starting to seed test transactions...');

  for (let i = 0; i < testTransactions.length; i++) {
    const transaction = testTransactions[i];

    await execute(
      `INSERT INTO transactions (account_id, date, payee, category_id, amount, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        transaction.account_id,
        transaction.date,
        transaction.payee,
        transaction.category_id,
        transaction.amount,
        transaction.comment || null,
      ]
    );

    console.log(`✓ Added transaction ${i + 1}/10: ${transaction.payee} ($${transaction.amount})`);
  }

  console.log('\n✨ Successfully seeded 10 test transactions!');
  process.exit(0);
}

seedTransactions().catch((error) => {
  console.error('Error seeding transactions:', error);
  process.exit(1);
});
