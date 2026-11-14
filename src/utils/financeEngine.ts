import type {
  BudgetAlertLevel,
  BudgetLimit,
  BudgetStatus,
  DateFilterPreset,
  DateRangeFilter,
  Transaction,
  Wallet,
  WalletWithBalance,
  WishlistItem,
} from '../types/finance';

export const EXPENSE_CATEGORIES = [
  'Makanan',
  'Transportasi',
  'Hiburan',
  'Tagihan & Utilitas',
  'Belanja',
  'Kesehatan',
  'Trading',
  'Lainnya',
] as const;

export const INCOME_CATEGORIES = [
  'Gaji & Bonus',
  'Freelance & Bisnis',
  'Profit Trading',
  'Dividen & Bunga',
  'Lainnya',
] as const;

export const TRANSFER_CATEGORIES = [
  'Transfer Antar Dompet',
  'Top Up E-Wallet',
  'Setor Modal Trading',
  'Tarik Tunai',
] as const;

export function formatIDR(amount: number, compact = false): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (compact) {
    if (abs >= 1_000_000_000) {
      return `${sign}Rp ${(abs / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
    }
    if (abs >= 1_000_000) {
      return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace('.', ',')} Jt`;
    }
    if (abs >= 1_000) {
      return `${sign}Rp ${(abs / 1_000).toFixed(0)} Rb`;
    }
  }
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(Math.round(abs));
  return `${sign}Rp ${formatted}`;
}

export function formatSmartIDR(
  amount: number,
  mode: 'smart' | 'full' = 'smart',
  compactThreshold = 10_000_000
): string {
  if (mode === 'full') {
    return formatIDR(amount, false);
  }
  const abs = Math.abs(amount);
  if (abs >= compactThreshold) {
    return formatIDR(amount, true);
  }
  return formatIDR(amount, false);
}

export function formatDateID(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const date = new Date(year, month, day);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDateRangeBounds(
  preset: DateFilterPreset,
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date()
): DateRangeFilter {
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  if (preset === 'today') {
    const iso = toISODate(ref);
    return { preset, startDate: iso, endDate: iso };
  }

  if (preset === 'week') {
    const dayOfWeek = ref.getDay(); // 0 = Sun, 1 = Mon
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() + diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      preset,
      startDate: toISODate(monday),
      endDate: toISODate(sunday),
    };
  }

  if (preset === 'month') {
    const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    return {
      preset,
      startDate: toISODate(first),
      endDate: toISODate(last),
    };
  }

  if (preset === 'year') {
    const first = new Date(ref.getFullYear(), 0, 1);
    const last = new Date(ref.getFullYear(), 11, 31);
    return {
      preset,
      startDate: toISODate(first),
      endDate: toISODate(last),
    };
  }

  // custom
  const fallback = toISODate(ref);
  const start = customStart || fallback;
  const end = customEnd || start;
  return start <= end
    ? { preset: 'custom', startDate: start, endDate: end }
    : { preset: 'custom', startDate: end, endDate: start };
}

export function filterTransactionsByDateRange(
  transactions: Transaction[],
  range: DateRangeFilter
): Transaction[] {
  return transactions.filter(
    (tx) => tx.date >= range.startDate && tx.date <= range.endDate
  );
}

export function calculateWalletBalances(
  wallets: Wallet[],
  transactions: Transaction[]
): WalletWithBalance[] {
  const map = new Map<string, { inflow: number; outflow: number }>();
  for (const w of wallets) {
    map.set(w.id, { inflow: 0, outflow: 0 });
  }

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      const entry = map.get(tx.walletId);
      if (entry) entry.inflow += amount;
    } else if (tx.type === 'expense') {
      const entry = map.get(tx.walletId);
      if (entry) entry.outflow += amount;
    } else if (tx.type === 'transfer') {
      const fromEntry = map.get(tx.walletId);
      if (fromEntry) fromEntry.outflow += amount;
      if (tx.toWalletId) {
        const toEntry = map.get(tx.toWalletId);
        if (toEntry) toEntry.inflow += amount;
      }
    }
  }

  return wallets.map((w) => {
    const stats = map.get(w.id) || { inflow: 0, outflow: 0 };
    return {
      ...w,
      inflow: stats.inflow,
      outflow: stats.outflow,
      currentBalance: w.initialBalance + stats.inflow - stats.outflow,
    };
  });
}

export interface KpiSummary {
  totalBalance: number;
  cloudBalance: number; // Bank + E-Wallet + Trading (non-physical cash)
  cashBalance: number;
  tradingBalance: number;
  tradingProfitInRange: number;
  periodIncome: number;
  periodExpense: number;
  periodNetCashflow: number;
  savingsRatePct: number;
  wishlistAllocated: number;
  wishlistTargetTotal: number;
  wishlistProgressPct: number;
}

export function calculateKpiSummary(
  walletsWithBalance: WalletWithBalance[],
  filteredTransactions: Transaction[],
  wishlist: WishlistItem[]
): KpiSummary {
  const totalBalance = walletsWithBalance.reduce(
    (sum, w) => sum + w.currentBalance,
    0
  );
  const cashBalance = walletsWithBalance
    .filter((w) => w.type === 'cash')
    .reduce((sum, w) => sum + w.currentBalance, 0);
  const tradingBalance = walletsWithBalance
    .filter((w) => w.type === 'trading')
    .reduce((sum, w) => sum + w.currentBalance, 0);
  const cloudBalance = totalBalance - cashBalance;

  let periodIncome = 0;
  let periodExpense = 0;
  let tradingIncome = 0;
  let tradingExpense = 0;

  for (const tx of filteredTransactions) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      periodIncome += amt;
      if (tx.category.toLowerCase().includes('trading') || tx.category === 'Dividen & Bunga') {
        tradingIncome += amt;
      }
    } else if (tx.type === 'expense') {
      periodExpense += amt;
      if (tx.category === 'Trading') {
        tradingExpense += amt;
      }
    }
  }

  const periodNetCashflow = periodIncome - periodExpense;
  const savingsRatePct =
    periodIncome > 0
      ? Math.max(-100, Math.round(((periodIncome - periodExpense) / periodIncome) * 100))
      : 0;

  const wishlistAllocated = wishlist.reduce((sum, item) => sum + item.currentAmount, 0);
  const wishlistTargetTotal = wishlist.reduce((sum, item) => sum + item.targetAmount, 0);
  const wishlistProgressPct =
    wishlistTargetTotal > 0
      ? Math.min(100, Math.round((wishlistAllocated / wishlistTargetTotal) * 100))
      : 0;

  return {
    totalBalance,
    cloudBalance,
    cashBalance,
    tradingBalance,
    tradingProfitInRange: tradingIncome - tradingExpense,
    periodIncome,
    periodExpense,
    periodNetCashflow,
    savingsRatePct,
    wishlistAllocated,
    wishlistTargetTotal,
    wishlistProgressPct,
  };
}

export function calculateBudgetStatuses(
  budgets: BudgetLimit[],
  transactions: Transaction[],
  targetMonthPrefix: string // e.g. '2026-11'
): BudgetStatus[] {
  const spentByCategory = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type === 'expense' && tx.date.startsWith(targetMonthPrefix)) {
      const prev = spentByCategory.get(tx.category) || 0;
      spentByCategory.set(tx.category, prev + (Number(tx.amount) || 0));
    }
  }

  return budgets.map((b) => {
    const spentAmount = spentByCategory.get(b.category) || 0;
    const percentage =
      b.limitAmount > 0 ? Math.round((spentAmount / b.limitAmount) * 100) : 0;
    const remainingAmount = b.limitAmount - spentAmount;

    let level: BudgetAlertLevel = 'safe';
    let label = 'Aman';
    if (percentage > 90) {
      level = 'danger';
      label = percentage >= 100 ? 'Over-Budget' : 'Kritis (>90%)';
    } else if (percentage >= 70) {
      level = 'warning';
      label = 'Waspada';
    }

    return {
      id: b.id,
      category: b.category,
      limitAmount: b.limitAmount,
      spentAmount,
      remainingAmount,
      percentage,
      level,
      label,
    };
  });
}

export interface CashflowSeries {
  labels: string[];
  income: number[];
  expense: number[];
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function buildCashflowSeries(
  filteredTransactions: Transaction[],
  range: DateRangeFilter
): CashflowSeries {
  const start = new Date(`${range.startDate}T00:00:00`);
  const end = new Date(`${range.endDate}T00:00:00`);
  const diffDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  // Use monthly aggregation for year or custom range > 45 days
  if (range.preset === 'year' || diffDays > 45) {
    const monthBuckets = new Map<string, { label: string; income: number; expense: number }>();

    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const limitDate = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= limitDate) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const label = `${SHORT_MONTHS[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`;
      monthBuckets.set(key, { label, income: 0, expense: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const tx of filteredTransactions) {
      const key = tx.date.slice(0, 7);
      const bucket = monthBuckets.get(key);
      if (!bucket) continue;
      if (tx.type === 'income') bucket.income += tx.amount;
      if (tx.type === 'expense') bucket.expense += tx.amount;
    }

    const entries = Array.from(monthBuckets.values());
    return {
      labels: entries.map((e) => e.label),
      income: entries.map((e) => e.income),
      expense: entries.map((e) => e.expense),
    };
  }

  // Daily aggregation for Today / Week / Month / Short Custom
  const dayBuckets = new Map<string, { label: string; income: number; expense: number }>();
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = toISODate(cursor);
    const label = `${String(cursor.getDate()).padStart(2, '0')} ${SHORT_MONTHS[cursor.getMonth()]}`;
    dayBuckets.set(key, { label, income: 0, expense: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const tx of filteredTransactions) {
    const bucket = dayBuckets.get(tx.date);
    if (!bucket) continue;
    if (tx.type === 'income') bucket.income += tx.amount;
    if (tx.type === 'expense') bucket.expense += tx.amount;
  }

  const entries = Array.from(dayBuckets.values());
  return {
    labels: entries.map((e) => e.label),
    income: entries.map((e) => e.income),
    expense: entries.map((e) => e.expense),
  };
}

export interface ExpenseSlice {
  category: string;
  amount: number;
  percentage: number;
}

export function buildExpenseDonutData(
  filteredTransactions: Transaction[]
): ExpenseSlice[] {
  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const tx of filteredTransactions) {
    if (tx.type !== 'expense') continue;
    const prev = totals.get(tx.category) || 0;
    totals.set(tx.category, prev + tx.amount);
    grandTotal += tx.amount;
  }

  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
    }));
}
