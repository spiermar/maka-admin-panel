import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionsClient } from '@/app/(dashboard)/transactions/client';
import enMessages from '@/messages/en.json';
import { Account, CategoryWithPath, TransactionWithDetails } from '@/lib/db/types';
import { TransactionFilters } from '@/lib/transactions/filters';
import { ImportResult } from '@/lib/actions/ofx-import';

vi.mock('@/components/ofx-import-dialog', () => ({
  OfxImportDialog: ({
    accountId,
    open,
    onOpenChange,
    onImportComplete,
  }: {
    accountId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportComplete: (result: ImportResult) => void;
  }) =>
    open ? (
      <div data-testid="ofx-import-dialog">
        Import account {accountId}
        <button type="button" onClick={() => onOpenChange(false)}>
          Close import
        </button>
        <button
          type="button"
          onClick={() => onImportComplete({ imported: 1, skipped: 0, errors: [] })}
        >
          Complete import
        </button>
      </div>
    ) : null,
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
  let routerPush: ReturnType<typeof vi.fn>;

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

  beforeEach(() => {
    Element.prototype.hasPointerCapture ??= vi.fn(() => false);
    Element.prototype.setPointerCapture ??= vi.fn();
    Element.prototype.releasePointerCapture ??= vi.fn();
    Element.prototype.scrollIntoView ??= vi.fn();
    routerPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: routerPush,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as ReturnType<typeof useSearchParams>
    );
  });

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

  function getFiltersCard() {
    const filtersCard = screen.getByRole('heading', { name: 'Filters' }).closest('div')
      ?.parentElement;
    expect(filtersCard).not.toBeNull();
    return filtersCard as HTMLElement;
  }

  async function selectOption(trigger: HTMLElement, name: string) {
    const user = userEvent.setup();
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name }));
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
    const filterSelects = within(getFiltersCard()).getAllByRole('combobox');
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

  it('updates the selected import account when the account filter changes on rerender', async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole('button', { name: 'Import OFX' }));
    expect(screen.getByTestId('ofx-import-dialog')).toHaveTextContent(
      'Import account 2'
    );
  });

  it('builds URL updates from draft filters and preserves lang', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('lang=pt-BR') as ReturnType<typeof useSearchParams>
    );
    const user = userEvent.setup();
    renderClient({
      categoryId: 7,
      from: '2026-05-01',
      to: '2026-05-31',
      q: 'rent',
    });

    await user.clear(screen.getByLabelText('Search'));
    await user.type(screen.getByLabelText('Search'), 'manager');
    const accountSelect = within(getFiltersCard()).getByRole('combobox', {
      name: 'Account',
    });

    await selectOption(accountSelect, 'Savings Account');

    const pushedUrl = routerPush.mock.calls.at(-1)?.[0] as string;
    const pushedParams = new URLSearchParams(pushedUrl.split('?')[1]);
    expect(pushedParams.get('lang')).toBe('pt-BR');
    expect(pushedParams.get('accountId')).toBe('2');
    expect(pushedParams.get('categoryId')).toBe('7');
    expect(pushedParams.get('from')).toBe('2026-05-01');
    expect(pushedParams.get('to')).toBe('2026-05-31');
    expect(pushedParams.get('q')).toBe('manager');
  });

  it('requires choosing an import account again after closing a manual import flow', async () => {
    const user = userEvent.setup();
    renderClient({});

    await user.click(screen.getByRole('button', { name: 'Import OFX' }));
    await selectOption(
      screen.getAllByRole('combobox').at(-1) as HTMLElement,
      'Savings Account'
    );
    expect(screen.getByTestId('ofx-import-dialog')).toHaveTextContent(
      'Import account 2'
    );

    await user.click(screen.getByRole('button', { name: 'Close import' }));
    await user.click(screen.getByRole('button', { name: 'Import OFX' }));

    expect(screen.queryByTestId('ofx-import-dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Choose an account to import OFX transactions',
      })
    ).toBeInTheDocument();
  });

  it('requires choosing an import account again after completing a manual import flow', async () => {
    const user = userEvent.setup();
    renderClient({});

    await user.click(screen.getByRole('button', { name: 'Import OFX' }));
    await selectOption(
      screen.getAllByRole('combobox').at(-1) as HTMLElement,
      'Savings Account'
    );
    expect(screen.getByTestId('ofx-import-dialog')).toHaveTextContent(
      'Import account 2'
    );

    await user.click(screen.getByRole('button', { name: 'Complete import' }));
    await user.click(screen.getByRole('button', { name: 'Import OFX' }));

    expect(screen.queryByTestId('ofx-import-dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Choose an account to import OFX transactions',
      })
    ).toBeInTheDocument();
  });
});
