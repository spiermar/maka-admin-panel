'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { CategoryWithPath } from '@/lib/db/types';

interface AnalysisCategoryFilterLabels {
  title: string;
  income: string;
  expense: string;
  uncategorizedIncome: string;
  uncategorizedExpense: string;
}

interface AnalysisCategoryFilterValue {
  selectedCategoryIds: number[];
  includeUncategorizedIncome: boolean;
  includeUncategorizedExpense: boolean;
}

interface AnalysisCategoryFilterProps extends AnalysisCategoryFilterValue {
  categories: CategoryWithPath[];
  labels: AnalysisCategoryFilterLabels;
  onChange: (next: AnalysisCategoryFilterValue) => void;
}

interface CategoryCheckboxProps {
  category: CategoryWithPath;
  checked: boolean;
  indeterminate: boolean;
  onToggle: () => void;
}

function sortedIds(ids: Iterable<number>) {
  return [...ids].sort((a, b) => a - b);
}

function CategoryCheckbox({
  category,
  checked,
  indeterminate,
  onToggle,
}: CategoryCheckboxProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      className="flex items-center gap-2 text-sm"
      style={{ paddingLeft: `${Math.max(category.depth - 1, 0) * 1.25}rem` }}
    >
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={checked}
        aria-checked={indeterminate ? 'mixed' : checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-input"
      />
      <span>{category.name}</span>
    </label>
  );
}

export function AnalysisCategoryFilter({
  categories,
  selectedCategoryIds,
  includeUncategorizedIncome,
  includeUncategorizedExpense,
  labels,
  onChange,
}: AnalysisCategoryFilterProps) {
  const selectedSet = useMemo(
    () => new Set(selectedCategoryIds),
    [selectedCategoryIds]
  );
  const childrenByParent = useMemo(() => {
    const children = new Map<number | null, CategoryWithPath[]>();

    for (const category of categories) {
      const siblings = children.get(category.parent_id) ?? [];
      siblings.push(category);
      children.set(category.parent_id, siblings);
    }

    return children;
  }, [categories]);

  const categoryIdsBySubtree = useMemo(() => {
    const idsBySubtree = new Map<number, number[]>();

    const collectIds = (category: CategoryWithPath): number[] => {
      const childIds = (childrenByParent.get(category.id) ?? []).flatMap(
        collectIds
      );
      const subtreeIds = sortedIds([category.id, ...childIds]);
      idsBySubtree.set(category.id, subtreeIds);
      return subtreeIds;
    };

    for (const category of categories) {
      collectIds(category);
    }

    return idsBySubtree;
  }, [categories, childrenByParent]);

  const emitChange = (nextSelectedCategoryIds: Iterable<number>) => {
    onChange({
      selectedCategoryIds: sortedIds(nextSelectedCategoryIds),
      includeUncategorizedIncome,
      includeUncategorizedExpense,
    });
  };

  const toggleCategory = (category: CategoryWithPath) => {
    const subtreeIds = categoryIdsBySubtree.get(category.id) ?? [category.id];
    const nextSelected = new Set(selectedSet);
    const subtreeSelected = subtreeIds.every((id) => selectedSet.has(id));

    for (const id of subtreeIds) {
      if (subtreeSelected) {
        nextSelected.delete(id);
      } else {
        nextSelected.add(id);
      }
    }

    emitChange(nextSelected);
  };

  const renderGroup = (
    categoryType: CategoryWithPath['category_type'],
    label: string
  ) => {
    const groupCategories = categories
      .filter((category) => category.category_type === categoryType)
      .sort((a, b) => a.path.localeCompare(b.path) || a.id - b.id);

    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{label}</legend>
        <div className="space-y-2">
          {groupCategories.map((category) => {
            const subtreeIds = categoryIdsBySubtree.get(category.id) ?? [
              category.id,
            ];
            const selectedCount = subtreeIds.filter((id) =>
              selectedSet.has(id)
            ).length;

            return (
              <CategoryCheckbox
                key={category.id}
                category={category}
                checked={selectedCount === subtreeIds.length}
                indeterminate={
                  selectedCount > 0 && selectedCount < subtreeIds.length
                }
                onToggle={() => toggleCategory(category)}
              />
            );
          })}
        </div>
      </fieldset>
    );
  };

  return (
    <section className="space-y-4" aria-labelledby="analysis-category-filter">
      <h3 id="analysis-category-filter" className="text-base font-semibold">
        {labels.title}
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        {renderGroup('income', labels.income)}
        {renderGroup('expense', labels.expense)}
      </div>

      <div className="grid gap-3 border-t pt-4 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeUncategorizedIncome}
            onChange={() =>
              onChange({
                selectedCategoryIds: sortedIds(selectedCategoryIds),
                includeUncategorizedIncome: !includeUncategorizedIncome,
                includeUncategorizedExpense,
              })
            }
            className="h-4 w-4 rounded border-input"
          />
          <span>{labels.uncategorizedIncome}</span>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeUncategorizedExpense}
            onChange={() =>
              onChange({
                selectedCategoryIds: sortedIds(selectedCategoryIds),
                includeUncategorizedIncome,
                includeUncategorizedExpense: !includeUncategorizedExpense,
              })
            }
            className="h-4 w-4 rounded border-input"
          />
          <span>{labels.uncategorizedExpense}</span>
        </label>
      </div>
    </section>
  );
}
