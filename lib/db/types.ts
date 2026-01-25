export type CategoryType = 'income' | 'expense';

export interface User {
  id: number;
  username: string;
  password_hash: string;
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
}

export interface TransactionWithDetails extends Transaction {
  account_name: string;
  category_name: string | null;
  category_path: string | null;
}
