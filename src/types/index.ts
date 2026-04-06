export type TransactionType = 'Income' | 'Expense';
export type PaymentMethod = 'Card' | 'Cash';

export interface Transaction {
  _id: string;
  _rev?: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  month: string;
  year: number;
}

export interface MonthSummary {
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  transactionCount: number;
}

export interface SyncStatus {
  syncing: boolean;
  lastSync: Date | null;
  error: string | null;
  connected: boolean;
}

export interface NewTransaction {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
}
