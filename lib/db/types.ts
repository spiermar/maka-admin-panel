export type CategoryType = 'income' | 'expense';
export type UnitStatus = 'Occupied' | 'Vacant' | 'Unavailable';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  session_version?: number;
  created_at: Date;
}

export interface Account {
  id: number;
  name: string;
  created_at: Date;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  category_type: CategoryType;
  depth: number;
  created_at: Date;
}

export interface Transaction {
  id: number;
  account_id: number;
  date: string; // ISO date string
  payee: string;
  category_id: number | null;
  amount: string; // Decimal as string
  comment: string | null;
  created_at: Date;
  updated_at: Date;
  ofx_fitid: string | null;
  ofx_memo: string | null;
  ofx_refnum: string | null;
}

export interface TransactionWithDetails extends Transaction {
  account_name: string;
  category_name: string | null;
  category_path: string | null;
}

export interface CategoryWithPath extends Category {
  path: string;
}

export type ExpenseReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface ExpenseReport {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: ExpenseReportStatus;
  submitted_at: Date | null;
  approved_at: Date | null;
  approved_by: number | null;
  reimbursed_at: Date | null;
  total_amount: string;
  created_at: Date;
  updated_at: Date;
}

export interface ExpenseReportWithDetails extends ExpenseReport {
  username: string;
  approved_by_username: string | null;
}

export interface Expense {
  id: number;
  expense_report_id: number;
  transaction_id: number | null;
  payee: string;
  amount: string;
  date: string;
  category_id: number | null;
  memo: string | null;
  created_at: Date;
}

export interface ExpenseWithDetails extends Expense {
  category_name: string | null;
  category_path: string | null;
  transaction_date: string | null;
}

export interface Property {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Unit {
  id: number;
  property_id: number;
  unit_number: string;
  building_label: string | null;
  unit_type: string;
  bedrooms: string;
  bathrooms: string;
  status: UnitStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UnitOccupancyStatus {
  id: number;
  unit_id: number;
  status: UnitStatus;
  effective_date: string;
  unavailable_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Tenant {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}

export type LeaseStatus = 'Draft' | 'Pending' | 'Active' | 'Expired' | 'Terminated';

export interface Lease {
  id: number;
  tenant_id: number;
  unit_id: number;
  status: LeaseStatus;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  monthly_rent: number;
  security_deposit: number;
  lease_type: string | null;
  pets_allowed: boolean | null;
  parking_spot: string | null;
  utilities_included: boolean | null;
  previous_lease_id: number | null;
  created_at: Date;
  updated_at: Date;
}
