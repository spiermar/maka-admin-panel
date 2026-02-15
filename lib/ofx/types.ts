export interface OfxTransaction {
  fitid: string;
  refnum: string;
  memo: string;
  payee: string | null;
  cleanedMemo: string;
  date: string; // YYYY-MM-DD
  amount: number; // positive = credit, negative = debit
  type: 'CREDIT' | 'DEBIT';
}

export interface OfxAccount {
  bankId: string;
  accountId: string;
  type: string;
}

export interface OfxDateRange {
  start: string;
  end: string;
}

export interface ParsedOfxImport {
  account: OfxAccount;
  dateRange: OfxDateRange;
  transactions: OfxTransaction[];
}