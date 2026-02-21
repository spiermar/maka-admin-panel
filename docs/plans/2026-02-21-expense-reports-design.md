# Expense Reports Feature Design

> **Feature:** Submit expense reports for reimbursement  
> **Date:** 2026-02-21

---

## Overview

Allow users to create expense reports, add expenses (linked to transactions or manual entry), submit for approval, and approve/reject reports. This feature supports employee reimbursement workflows.

---

## User Stories

1. **Create Report** — User creates a new expense report with a title and optional description
2. **Add Expenses** — User adds expenses to a draft report (from existing transactions or manually)
3. **Submit Report** — User submits a draft report for approval
4. **Approve/Reject** — Any user can approve or reject a submitted report
5. **Track Reimbursement** — Mark approved reports as reimbursed

---

## Data Model

### Expense Report
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | Primary key |
| user_id | INTEGER | FK to users — report owner |
| title | VARCHAR(200) | Required |
| description | TEXT | Optional |
| status | ENUM | draft, submitted, approved, rejected |
| submitted_at | TIMESTAMP | When submitted |
| approved_at | TIMESTAMP | When approved |
| approved_by | INTEGER | FK to users — approver |
| reimbursed_at | TIMESTAMP | When marked reimbursed |
| total_amount | DECIMAL(15,2) | Computed sum of expenses |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Expense (Line Item)
| Field | Type | Notes |
|-------|------|-------|
| id | SERIAL | Primary key |
| expense_report_id | INTEGER | FK to expense_reports |
| transaction_id | INTEGER | FK to transactions (optional) |
| payee | VARCHAR(200) | Required |
| amount | DECIMAL(15,2) | Required, positive |
| date | DATE | Required |
| category_id | INTEGER | FK to categories (optional) |
| memo | TEXT | Optional |
| created_at | TIMESTAMP | |

---

## Architecture

### Server Actions (`lib/actions/expense-reports.ts`)
- `createExpenseReport(formData)` — Create new draft report
- `updateExpenseReport(id, formData)` — Update title/description
- `submitExpenseReport(id)` — Transition draft → submitted
- `approveExpenseReport(id)` — Transition submitted → approved
- `rejectExpenseReport(id)` — Transition submitted → rejected
- `markReimbursed(id)` — Set reimbursed_at timestamp
- `addExpense(reportId, formData)` — Add expense line item
- `updateExpense(expenseId, reportId, formData)` — Update expense
- `deleteExpense(expenseId, reportId)` — Remove expense

### Database Queries (`lib/db/expense-reports.ts`)
- `getExpenseReports()` — All reports
- `getExpenseReportsByUser(userId)` — User's reports
- `getExpenseReportById(id)` — Single report with details
- `getExpensesByReport(reportId)` — Line items for a report
- `createExpenseReport()`, `updateExpenseReport()`, etc.
- `addExpense()`, `updateExpense()`, `deleteExpense()`
- `updateExpenseReportTotal(id)` — Recompute total_amount

### Pages
- `/expense-reports` — List all reports
- `/expense-reports/new` — Create new report
- `/expense-reports/[id]` — View/edit report detail

---

## User Flow

```
[Draft] → [Submit] → [Submitted] → [Approve] → [Approved]
                      ↘ [Reject]   → [Rejected]
                      
[Approved] → [Mark Reimbursed] → [Reimbursed]
```

**Draft:** Add/edit expenses, update title/description  
**Submitted:** Read-only for owner, actions available for approvers  
**Approved/Rejected:** Final states, can mark reimbursed if approved

---

## Link to Transactions

When adding an expense, users can:
1. **Manual entry** — Enter payee, amount, date, category, memo
2. **Link to transaction** — Select from existing transactions

When linking to a transaction, pre-fill:
- payee ← transaction.payee
- amount ← ABS(transaction.amount) (always positive for expenses)
- date ← transaction.date
- category_id ← transaction.category_id
- memo ← transaction.comment

---

## Permissions

- **View:** All users can see all reports (per requirements)
- **Create:** Any authenticated user
- **Edit expenses:** Only when report status is "draft"
- **Submit:** Only report owner, when status is "draft" and has ≥1 expense
- **Approve/Reject:** Any user (no role hierarchy)
- **Mark Reimbursed:** Any user, when status is "approved"

---

## UI/UX

### List Page (`/expense-reports`)
- Table with: Title, User, Amount, Status, Created, Actions
- Status badges with colors (draft=gray, submitted=blue, approved=green, rejected=red)
- "New Report" button

### Detail Page (`/expense-reports/[id]`)
- Header: Title, status badge, submitter info, total amount
- Action buttons based on status and user
- Expenses table: Date, Payee, Category, Memo, Amount, Actions (if draft)
- "Add Expense" button (if draft)
- Link to transaction selector (if adding expense)

### Create Page (`/expense-reports/new`)
- Title input (required)
- Description textarea (optional)
- Create button → redirects to detail page

---

## Error Handling

- Server actions return `{ success: false, errors: {...} }` for validation errors
- Form validation: required fields, amount > 0, date valid
- Graceful handling if transaction linking fails
- Confirm before delete actions

---

## Testing Strategy

- Unit tests for Zod validation schemas
- Unit tests for server action error cases
- E2E tests for happy path: create report → add expense → submit → approve → reimburse

---

## Out of Scope (YAGNI)

- Receipt uploads
- Multi-level approval workflows
- Revision requests
- Notifications
- Duplicate expense detection
- Date range filtering on list page
- Export to CSV/PDF