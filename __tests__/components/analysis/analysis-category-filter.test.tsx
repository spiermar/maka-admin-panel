import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisCategoryFilter } from '@/components/analysis/analysis-category-filter';
import type { CategoryWithPath } from '@/lib/db/types';

const categories: CategoryWithPath[] = [
  {
    id: 1,
    name: 'Revenue',
    parent_id: null,
    category_type: 'income',
    depth: 1,
    created_at: new Date('2026-01-01'),
    path: 'Revenue',
  },
  {
    id: 2,
    name: 'Salary',
    parent_id: 1,
    category_type: 'income',
    depth: 2,
    created_at: new Date('2026-01-01'),
    path: 'Revenue > Salary',
  },
  {
    id: 3,
    name: 'Bonus',
    parent_id: 1,
    category_type: 'income',
    depth: 2,
    created_at: new Date('2026-01-01'),
    path: 'Revenue > Bonus',
  },
  {
    id: 4,
    name: 'Housing',
    parent_id: null,
    category_type: 'expense',
    depth: 1,
    created_at: new Date('2026-01-01'),
    path: 'Housing',
  },
  {
    id: 5,
    name: 'Rent',
    parent_id: 4,
    category_type: 'expense',
    depth: 2,
    created_at: new Date('2026-01-01'),
    path: 'Housing > Rent',
  },
];

const labels = {
  title: 'Categories',
  income: 'Income',
  expense: 'Expenses',
  uncategorizedIncome: 'Uncategorized income',
  uncategorizedExpense: 'Uncategorized expense',
};

describe('AnalysisCategoryFilter', () => {
  it('selects a parent and all descendants together', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AnalysisCategoryFilter
        categories={categories}
        selectedCategoryIds={[]}
        includeUncategorizedIncome
        includeUncategorizedExpense
        labels={labels}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('checkbox', { name: 'Revenue' }));

    expect(onChange).toHaveBeenCalledWith({
      selectedCategoryIds: [1, 2, 3],
      includeUncategorizedIncome: true,
      includeUncategorizedExpense: true,
    });
  });

  it('lets a child override parent state after the parent toggles descendants', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    function ControlledFilter() {
      const [selectedCategoryIds, setSelectedCategoryIds] = useState([1, 2, 3]);

      return (
        <AnalysisCategoryFilter
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          includeUncategorizedIncome
          includeUncategorizedExpense
          labels={labels}
          onChange={(next) => {
            setSelectedCategoryIds(next.selectedCategoryIds);
            onChange(next);
          }}
        />
      );
    }

    render(<ControlledFilter />);

    await user.click(screen.getByRole('checkbox', { name: 'Bonus' }));

    expect(onChange).toHaveBeenCalledWith({
      selectedCategoryIds: [1, 2],
      includeUncategorizedIncome: true,
      includeUncategorizedExpense: true,
    });
    expect(screen.getByRole('checkbox', { name: 'Revenue' })).toHaveProperty(
      'indeterminate',
      true
    );
  });

  it('toggles uncategorized income and expense independently', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AnalysisCategoryFilter
        categories={categories}
        selectedCategoryIds={[1, 2, 3, 4, 5]}
        includeUncategorizedIncome
        includeUncategorizedExpense={false}
        labels={labels}
        onChange={onChange}
      />
    );

    await user.click(
      screen.getByRole('checkbox', { name: 'Uncategorized income' })
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Uncategorized expense' })
    );

    expect(onChange).toHaveBeenNthCalledWith(1, {
      selectedCategoryIds: [1, 2, 3, 4, 5],
      includeUncategorizedIncome: false,
      includeUncategorizedExpense: false,
    });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      selectedCategoryIds: [1, 2, 3, 4, 5],
      includeUncategorizedIncome: true,
      includeUncategorizedExpense: true,
    });
  });
});
