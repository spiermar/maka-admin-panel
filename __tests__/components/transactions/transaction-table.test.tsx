import { render, screen } from '@testing-library/react';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { TransactionWithDetails } from '@/lib/db/types';

describe('TransactionTable', () => {
  const mockTransactions: TransactionWithDetails[] = [
    {
      id: 1,
      account_id: 1,
      date: '2024-01-15',
      payee: 'Test Payee',
      category_id: 1,
      amount: '100.00',
      comment: 'Test comment',
      created_at: new Date('2024-01-15T10:00:00Z'),
      updated_at: new Date('2024-01-15T10:00:00Z'),
      account_name: 'Test Account',
      category_name: 'Test Category',
      category_path: 'Test Category',
    },
  ];

  const mockOnEdit = vi.fn();

  it('renders transaction date as formatted string', () => {
    render(
      <TransactionTable
        transactions={mockTransactions}
        onEdit={mockOnEdit}
      />
    );

    // Date should be rendered as a formatted string, not [object Date]
    const dateCell = screen.getByText(/Jan 15, 2024/i);
    expect(dateCell).toBeInTheDocument();
  });

  it('handles date as Date object', () => {
    const testDate = new Date('2024-01-15T12:00:00'); // Use noon to avoid timezone issues
    const transactionsWithDateObject = [
      {
        ...mockTransactions[0],
        date: testDate as any, // Simulating what PostgreSQL driver returns
      },
    ];

    render(
      <TransactionTable
        transactions={transactionsWithDateObject}
        onEdit={mockOnEdit}
      />
    );

    // Should still render properly even with Date object
    const expectedDate = testDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('renders empty state when no transactions', () => {
    render(
      <TransactionTable transactions={[]} onEdit={mockOnEdit} />
    );

    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });
});
