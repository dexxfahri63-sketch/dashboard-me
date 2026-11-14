import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCashflowSeries,
  buildExpenseDonutData,
  calculateBudgetStatuses,
  calculateKpiSummary,
  calculateWalletBalances,
  filterTransactionsByDateRange,
  formatSmartIDR,
  getDateRangeBounds,
} from './financeEngine';
import type { BudgetLimit, Transaction, Wallet, WishlistItem } from '../types/finance';

const SAMPLE_WALLETS: Wallet[] = [
  { id: 'w1', name: 'BCA Utama', type: 'bank', initialBalance: 10000000 },
  { id: 'w2', name: 'E-Wallet', type: 'ewallet', initialBalance: 1000000 },
  { id: 'w3', name: 'Kas Tunai', type: 'cash', initialBalance: 500000 },
  { id: 'w4', name: 'Akun Trading', type: 'trading', initialBalance: 5000000 },
];

const SAMPLE_TXS: Transaction[] = [
  {
    id: 't1',
    date: '2026-11-13',
    type: 'income',
    category: 'Gaji & Bonus',
    description: 'Gaji',
    amount: 5000000,
    walletId: 'w1',
    createdAt: '2026-11-13T08:00:00Z',
  },
  {
    id: 't2',
    date: '2026-11-13',
    type: 'expense',
    category: 'Makanan',
    description: 'Makan Siang',
    amount: 750000,
    walletId: 'w2',
    createdAt: '2026-11-13T12:00:00Z',
  },
  {
    id: 't3',
    date: '2026-11-10',
    type: 'transfer',
    category: 'Transfer Antar Dompet',
    description: 'Top Up E-Wallet',
    amount: 1500000,
    walletId: 'w1',
    toWalletId: 'w2',
    createdAt: '2026-11-10T09:00:00Z',
  },
  {
    id: 't4',
    date: '2026-11-05',
    type: 'expense',
    category: 'Hiburan',
    description: 'Konser',
    amount: 1100000,
    walletId: 'w1',
    createdAt: '2026-11-05T19:00:00Z',
  },
  {
    id: 't5',
    date: '2026-10-20',
    type: 'expense',
    category: 'Makanan',
    description: 'Bulan Lalu',
    amount: 2000000,
    walletId: 'w3',
    createdAt: '2026-10-20T12:00:00Z',
  },
];

test('calculateWalletBalances handles income, expense, and transfers accurately', () => {
  const balances = calculateWalletBalances(SAMPLE_WALLETS, SAMPLE_TXS);
  const w1 = balances.find((w) => w.id === 'w1')!;
  const w2 = balances.find((w) => w.id === 'w2')!;
  const w3 = balances.find((w) => w.id === 'w3')!;
  const w4 = balances.find((w) => w.id === 'w4')!;

  // BCA: 10M + 5M (income) - 1.5M (transfer out) - 1.1M (expense) = 12.4M
  assert.equal(w1.currentBalance, 12400000);
  // E-Wallet: 1M + 1.5M (transfer in) - 0.75M (expense) = 1.75M
  assert.equal(w2.currentBalance, 1750000);
  // Kas Tunai: 0.5M - 2M = -1.5M
  assert.equal(w3.currentBalance, -1500000);
  // Trading: untouched 5M
  assert.equal(w4.currentBalance, 5000000);
});

test('getDateRangeBounds and filterTransactionsByDateRange resolve presets correctly', () => {
  const ref = new Date(2026, 10, 13); // 2026-11-13 (Friday)

  const today = getDateRangeBounds('today', undefined, undefined, ref);
  assert.deepEqual(today, { preset: 'today', startDate: '2026-11-13', endDate: '2026-11-13' });
  assert.equal(filterTransactionsByDateRange(SAMPLE_TXS, today).length, 2);

  const week = getDateRangeBounds('week', undefined, undefined, ref);
  // Monday Nov 9 to Sunday Nov 15
  assert.deepEqual(week, { preset: 'week', startDate: '2026-11-09', endDate: '2026-11-15' });
  assert.equal(filterTransactionsByDateRange(SAMPLE_TXS, week).length, 3);

  const month = getDateRangeBounds('month', undefined, undefined, ref);
  assert.deepEqual(month, { preset: 'month', startDate: '2026-11-01', endDate: '2026-11-30' });
  assert.equal(filterTransactionsByDateRange(SAMPLE_TXS, month).length, 4);

  const custom = getDateRangeBounds('custom', '2026-11-12', '2026-11-01', ref);
  // Automatically normalizes reversed dates
  assert.deepEqual(custom, { preset: 'custom', startDate: '2026-11-01', endDate: '2026-11-12' });
  assert.equal(filterTransactionsByDateRange(SAMPLE_TXS, custom).length, 2);
});

test('calculateBudgetStatuses triggers safe (<70%), warning (70-90%), and danger (>90%) alerts', () => {
  const budgets: BudgetLimit[] = [
    { id: 'b1', category: 'Makanan', limitAmount: 1000000 }, // spent 750k => 75% warning
    { id: 'b2', category: 'Hiburan', limitAmount: 1000000 }, // spent 1.1M => 110% danger
    { id: 'b3', category: 'Transportasi', limitAmount: 500000 }, // spent 0 => 0% safe
  ];

  const statuses = calculateBudgetStatuses(budgets, SAMPLE_TXS, '2026-11');
  const makanan = statuses.find((s) => s.category === 'Makanan')!;
  const hiburan = statuses.find((s) => s.category === 'Hiburan')!;
  const transport = statuses.find((s) => s.category === 'Transportasi')!;

  assert.equal(makanan.percentage, 75);
  assert.equal(makanan.level, 'warning');
  assert.equal(hiburan.percentage, 110);
  assert.equal(hiburan.level, 'danger');
  assert.equal(hiburan.label, 'Over-Budget');
  assert.equal(transport.percentage, 0);
  assert.equal(transport.level, 'safe');
});

test('calculateKpiSummary, cashflow series, and expense donut compute expected totals', () => {
  const balances = calculateWalletBalances(SAMPLE_WALLETS, SAMPLE_TXS);
  const monthRange = getDateRangeBounds('month', undefined, undefined, new Date(2026, 10, 13));
  const filtered = filterTransactionsByDateRange(SAMPLE_TXS, monthRange);
  const wishlist: WishlistItem[] = [
    {
      id: 'wl1',
      title: 'Kereta',
      category: 'Otomotif',
      targetAmount: 100000000,
      currentAmount: 50000000,
      targetDate: '2027-06-01',
      walletId: 'w1',
    },
  ];

  const kpi = calculateKpiSummary(balances, filtered, wishlist);
  assert.equal(kpi.totalBalance, 17650000);
  assert.equal(kpi.periodIncome, 5000000);
  assert.equal(kpi.periodExpense, 1850000);
  assert.equal(kpi.periodNetCashflow, 3150000);
  assert.equal(kpi.wishlistProgressPct, 50);

  const series = buildCashflowSeries(filtered, monthRange);
  assert.equal(series.labels.length, 30);

  const donut = buildExpenseDonutData(filtered);
  assert.equal(donut[0].category, 'Hiburan');
  assert.equal(donut[0].amount, 1100000);
  assert.equal(donut[1].category, 'Makanan');
  assert.equal(donut[1].amount, 750000);
});

test('formatSmartIDR scales large amounts cleanly in smart mode and preserves full IDR in full mode', () => {
  assert.equal(formatSmartIDR(146740000, 'smart'), 'Rp 146,7 Jt');
  assert.equal(formatSmartIDR(42700000, 'smart'), 'Rp 42,7 Jt');
  assert.equal(formatSmartIDR(1250000000, 'smart'), 'Rp 1,25 M');
  assert.equal(formatSmartIDR(185000, 'smart'), 'Rp 185.000');
  assert.equal(formatSmartIDR(146740000, 'full'), 'Rp 146.740.000');
});
