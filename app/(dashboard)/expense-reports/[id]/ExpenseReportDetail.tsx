'use client';

import { useActionState } from 'react';
import { useState } from 'react';
import { 
  submitExpenseReport, 
  approveExpenseReport, 
  rejectExpenseReport, 
  markReimbursed,
  addExpense,
  deleteExpense
} from '@/lib/actions/expense-reports';
import { ExpenseReportWithDetails, ExpenseWithDetails, TransactionWithDetails } from '@/lib/db/types';

interface Props {
  report: ExpenseReportWithDetails;
  expenses: ExpenseWithDetails[];
  transactions: TransactionWithDetails[];
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const initialState = { success: false, error: '' };

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ExpenseReportDetail({ report, expenses: initialExpenses, transactions }: Props) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [, submitAction, submitPending] = useActionState(
    async () => await submitExpenseReport(report.id),
    initialState
  );
  
  const [, approveAction, approvePending] = useActionState(
    async () => await approveExpenseReport(report.id),
    initialState
  );
  
  const [, rejectAction, rejectPending] = useActionState(
    async () => await rejectExpenseReport(report.id),
    initialState
  );
  
  const [, reimburseAction, reimbursePending] = useActionState(
    async () => await markReimbursed(report.id),
    initialState
  );

  const handleDeleteExpense = async (expenseId: number) => {
    if (!confirm('Delete this expense?')) return;
    const result = await deleteExpense(expenseId, report.id);
    if (result.success) {
      setExpenses(expenses.filter(e => e.id !== expenseId));
    }
  };

  const handleAddExpense = async (formData: FormData) => {
    const result = await addExpense(report.id, formData);
    if (result.success) {
      setShowAddForm(false);
      window.location.reload();
    }
  };

  const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{report.title}</h1>
            <span className={`px-2 py-1 rounded-full text-xs ${statusColors[report.status]}`}>
              {report.status}
            </span>
          </div>
          {report.description && (
            <p className="text-muted-foreground mt-1">{report.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Submitted by {report.username} • Created {formatDate(new Date(report.created_at))}
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
      </div>

      <div className="flex gap-3">
        {report.status === 'draft' && (
          <>
            <form action={submitAction}>
              <button 
                type="submit" 
                disabled={submitPending || expenses.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitPending ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </form>
          </>
        )}
        
        {report.status === 'submitted' && (
          <>
            <form action={approveAction}>
              <button 
                type="submit" 
                disabled={approvePending}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {approvePending ? 'Approving...' : 'Approve'}
              </button>
            </form>
            <form action={rejectAction}>
              <button 
                type="submit" 
                disabled={rejectPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {rejectPending ? 'Rejecting...' : 'Reject'}
              </button>
            </form>
          </>
        )}
        
        {report.status === 'approved' && !report.reimbursed_at && (
          <form action={reimburseAction}>
            <button 
              type="submit" 
              disabled={reimbursePending}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              {reimbursePending ? 'Marking...' : 'Mark as Reimbursed'}
            </button>
          </form>
        )}
        
        {report.reimbursed_at && (
          <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-md">
            Reimbursed {formatDate(new Date(report.reimbursed_at))}
          </span>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Expenses ({expenses.length})</h2>
          {report.status === 'draft' && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1 text-sm border rounded-md hover:bg-muted"
            >
              {showAddForm ? 'Cancel' : '+ Add Expense'}
            </button>
          )}
        </div>

        {showAddForm && (
          <AddExpenseForm 
            onSubmit={handleAddExpense} 
            onCancel={() => setShowAddForm(false)}
            transactions={transactions}
          />
        )}

        {expenses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No expenses yet. Add expenses to this report.
          </p>
        ) : (
          <div className="border rounded-md">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Payee</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Memo</th>
                  <th className="text-right p-3">Amount</th>
                  {report.status === 'draft' && <th className="text-right p-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b">
                    <td className="p-3">{formatDate(new Date(expense.date))}</td>
                    <td className="p-3">{expense.payee}</td>
                    <td className="p-3">{expense.category_path || 'Uncategorized'}</td>
                    <td className="p-3">{expense.memo || '-'}</td>
                    <td className="p-3 text-right">${parseFloat(expense.amount).toFixed(2)}</td>
                    {report.status === 'draft' && (
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="font-bold bg-muted/30">
                  <td colSpan={4} className="p-3 text-right">Total:</td>
                  <td className="p-3 text-right">${totalAmount.toFixed(2)}</td>
                  {report.status === 'draft' && <td />}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AddExpenseForm({ 
  onSubmit, 
  onCancel, 
  transactions 
}: { 
  onSubmit: (fd: FormData) => void; 
  onCancel: () => void;
  transactions: TransactionWithDetails[];
}) {
  const [pending, setPending] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    await onSubmit(formData);
    setPending(false);
  };

  const handleTransactionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const txId = e.target.value;
    setSelectedTransaction(txId);
    
    if (txId) {
      const tx = transactions.find(t => t.id.toString() === txId);
      if (tx) {
        const payeeInput = document.querySelector('input[name="payee"]') as HTMLInputElement;
        const amountInput = document.querySelector('input[name="amount"]') as HTMLInputElement;
        const dateInput = document.querySelector('input[name="date"]') as HTMLInputElement;
        
        if (payeeInput) payeeInput.value = tx.payee;
        if (amountInput) amountInput.value = tx.amount;
        if (dateInput) dateInput.value = tx.date;
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border p-4 rounded-md space-y-4 bg-muted/20">
      {transactions.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">Link from Transaction (optional)</label>
          <select 
            value={selectedTransaction}
            onChange={handleTransactionChange}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Select a transaction to import</option>
            {transactions.map((tx) => (
              <option key={tx.id} value={tx.id.toString()}>
                {tx.date} - {tx.payee} - ${parseFloat(tx.amount).toFixed(2)} ({tx.account_name})
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Payee</label>
          <input name="payee" required className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <input name="amount" type="number" step="0.01" required className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input name="date" type="date" required className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select name="category_id" className="w-full px-3 py-2 border rounded-md">
            <option value="none">Select category</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Memo</label>
        <input name="memo" className="w-full px-3 py-2 border rounded-md" />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
          {pending ? 'Adding...' : 'Add Expense'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-md">Cancel</button>
      </div>
    </form>
  );
}