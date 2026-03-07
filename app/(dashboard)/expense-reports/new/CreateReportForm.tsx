'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createExpenseReport } from '@/lib/actions/expense-reports';
import { useRouter } from 'next/navigation';

interface Props {
  locale: string;
}

const initialState = { success: false, error: '', errors: {} as Record<string, string[]> };

type ExpenseReportResult = 
  | { success: true; reportId: number }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export default function CreateReportForm({ locale }: Props) {
  const t = useTranslations('expenseReports');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (prevState: typeof initialState, formData: FormData) => {
      const result = await createExpenseReport(formData) as ExpenseReportResult;
      if (result.success && 'reportId' in result && result.reportId) {
        router.push(`/expense-reports/${result.reportId}?lang=${locale}`);
        return prevState;
      }
      if (!result.success) {
        return {
          success: false,
          error: result.error || tCommon('error'),
          errors: result.errors || {},
        };
      }
      return prevState;
    },
    initialState
  );

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('newExpenseReport')}</h1>
      
      {state.error && (
        <div className="bg-red-50 text-red-800 p-3 rounded-md mb-4">{state.error}</div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('titleLabel')}</label>
          <input
            name="title"
            type="text"
            required
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., January 2025 Expenses"
          />
          {state.errors?.title && (
            <p className="text-red-500 text-sm mt-1">{state.errors.title[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('descriptionOptional')}</label>
          <textarea
            name="description"
            rows={3}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Add any notes..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? t('creating') : t('createReport')}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-md hover:bg-muted"
          >
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}