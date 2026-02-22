'use client';

import { ExpenseReportWithDetails } from '@/lib/db/types';
import Link from 'next/link';

interface Props {
  reports: ExpenseReportWithDetails[];
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ExpenseReportsList({ reports }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Expense Reports</h1>
        <Link
          href="/expense-reports/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          New Report
        </Link>
      </div>

      <div className="border rounded-md">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No expense reports yet
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="border-b">
                  <td className="p-3">
                    <Link href={`/expense-reports/${report.id}`} className="hover:underline">
                      {report.title}
                    </Link>
                  </td>
                  <td className="p-3">{report.username}</td>
                  <td className="p-3">${parseFloat(report.total_amount).toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[report.status]}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="p-3">{formatDate(new Date(report.created_at))}</td>
                  <td className="p-3">
                    <Link href={`/expense-reports/${report.id}`} className="text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}