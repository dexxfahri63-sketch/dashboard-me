export type WalletType = 'bank' | 'ewallet' | 'cash' | 'trading';

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  initialBalance: number;
  accountNumber?: string;
  institution?: string;
}

export interface WalletWithBalance extends Wallet {
  currentBalance: number;
  inflow: number;
  outflow: number;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  walletId: string;
  toWalletId?: string;
  createdAt: string;
}

export interface BudgetLimit {
  id: string;
  category: string;
  limitAmount: number;
}

export type BudgetAlertLevel = 'safe' | 'warning' | 'danger';

export interface BudgetStatus {
  id: string;
  category: string;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  level: BudgetAlertLevel;
  label: string;
}

export interface WishlistItem {
  id: string;
  title: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  walletId: string;
  imageUrl?: string;
  notes?: string;
}

export type DateFilterPreset = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRangeFilter {
  preset: DateFilterPreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface GasConfig {
  webAppUrl: string;
  lastSyncedAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'connected' | 'error';
  lastError?: string;
}

export type NumberDisplayMode = 'smart' | 'full';

export interface AppSettings {
  workspaceName: string;
  ownerLabel: string;
  adminPin: string;
  numberMode: NumberDisplayMode;
}

export interface FirebaseConnectionState {
  status: 'connecting' | 'connected' | 'local-fallback';
  projectId: string;
  lastSyncAt: string | null;
  errorDetail?: string;
}

export type ActiveTab =
  | 'overview'
  | 'transactions'
  | 'wallets-budgets'
  | 'wishlist-trading';

export interface AppFinanceState {
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: BudgetLimit[];
  wishlist: WishlistItem[];
  gasConfig: GasConfig;
  settings: AppSettings;
}
