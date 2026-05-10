import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { TransactionsClient } from '@/app/(dashboard)/transactions/client';
import enMessages from '@/messages/en.json';
import { Account, CategoryWithPath, TransactionWithDetails } from '@/lib/db/types';
import { TransactionFilters } from '@/lib/transactions/filters';

vi.mock('@/components/ofx-import-dialog', () => ({
  OfxImportDialog: ({ accountId }: { accountId: number }) => (
    <div data-testid="ofx-import-dialog">Import account {accountId}</div>
  ),
}));

vi.mock('@/components/transactions/transaction-form', () => ({
  TransactionForm: () => <div data-testid="transaction-form" />,
}));

vi.mock('@/components/transactions/transaction-table', () => ({
  TransactionTable: ({ transactions }: { transactions: TransactionWithDetails[] }) => (
    <div data-testid="transaction-table">
      {transactions.map((transaction) => (
        <span key={transaction.id}>
          {transaction.account_name} {transaction.category_path}
        </span>
      ))}
    </div>
  ),
}));

describe('TransactionsClient', () => {
  const accounts: Account[] = [
    { id: 1, name: 'Checking Account', created_at: new Date('2026-01-01') },
    { id: 2, name: 'Savings Account', created_at: new Date('2026-01-01') },
  ];

  const categories: CategoryWithPath[] = [
    {
      id: 7,
      name: 'Rent',
      parent_id: null,
      category_type: 'expense',
      depth: 1,
      created_at: new Date('2026-01-01'),
      path: 'Rent',
    },
  ];

  const transactions: TransactionWithDetails[] = [
    {
      id: 1,
      account_id: 1,
      date: '2026-05-01',
      payee: 'Property Manager',
      category_id: 7,
      amount: '-1200.00',
      comment: 'May rent',
      created_at: new Date('2026-05-01'),
      updated_at: new Date('2026-05-01'),
      ofx_fitid: null,
      ofx_memo: null,
      ofx_refnum: null,
      account_name: 'Checking Account',
      category_name: 'Rent',
      category_path: 'Rent',
    },
  ];

  function renderClient(filters: TransactionFilters) {
    return render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TransactionsClient
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          filters={filters}
          lang="en"
        />
      </NextIntlClientProvider>
    );
  }

  it('renders URL-provided filter values as initial control state', () => {
    renderClient({
      accountId: 1,
      categoryId: 7,
      from: '2026-05-01',
      to: '2026-05-31',
      q: 'rent',
    });

    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
    const filtersCard = screen.getByRole('heading', { name: 'Filters' }).closest('div')
      ?.parentElement;
    expect(filtersCard).not.toBeNull();
    const filterSelects = within(filtersCard as HTMLElement).getAllByRole('combobox');
    expect(filterSelects[0]).toHaveTextContent('Checking Account');
    expect(filterSelects[1]).toHaveTextContent('Rent');
    expect(screen.getByDisplayValue('2026-05-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-05-31')).toBeInTheDocument();
    expect(screen.getByDisplayValue('rent')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-table')).toHaveTextContent('Checking Account');
    expect(screen.getByTestId('transaction-table')).toHaveTextContent('Rent');
  });

  it('clears visible date and search values when filters are cleared on rerender', () => {
    const { rerender } = renderClient({
      from: '2026-05-01',
      to: '2026-05-31',
      q: 'rent',
    });

    rerender(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TransactionsClient
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          filters={{}}
          lang="en"
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByLabelText('From')).toHaveValue('');
    expect(screen.getByLabelText('To')).toHaveValue('');
    expect(screen.getByLabelText('Search')).toHaveValue('');
  });

  it('updates the selected import account when the account filter changes on rerender', () => {
    const { rerender } = renderClient({ accountId: 1 });

    rerender(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TransactionsClient
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          filters={{ accountId: 2 }}
          lang="en"
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('ofx-import-dialog')).toHaveTextContent(
      'Import account 2'
    );
  });
});
