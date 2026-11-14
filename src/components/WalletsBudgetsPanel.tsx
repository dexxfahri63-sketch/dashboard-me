import { useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Landmark,
  Pencil,
  Plus,
  ShieldAlert,
  Smartphone,
  TrendingUp,
} from 'lucide-react';
import type {
  BudgetLimit,
  BudgetStatus,
  NumberDisplayMode,
  Wallet,
  WalletType,
  WalletWithBalance,
} from '../types/finance';
import {
  EXPENSE_CATEGORIES,
  formatIDR,
  formatSmartIDR,
} from '../utils/financeEngine';

interface WalletsBudgetsPanelProps {
  wallets: WalletWithBalance[];
  budgets: BudgetStatus[];
  budgetLimits: BudgetLimit[];
  monthLabel: string;
  numberMode: NumberDisplayMode;
  onSaveWallet: (wallet: Wallet) => void;
  onDeleteWallet: (walletId: string) => void;
  onSaveBudget: (budget: BudgetLimit) => void;
  compact?: boolean;
}

const WALLET_TYPE_LABEL: Record<WalletType, string> = {
  bank: 'Rekening Bank',
  ewallet: 'E-Wallet',
  cash: 'Kas Tunai',
  trading: 'Sekuritas / Trading',
};

function WalletIcon({ type }: { type: WalletType }) {
  switch (type) {
    case 'bank':
      return <Landmark className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />;
    case 'ewallet':
      return <Smartphone className="h-4 w-4 text-indigo-400 shrink-0" aria-hidden="true" />;
    case 'cash':
      return <Banknote className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />;
    case 'trading':
      return <TrendingUp className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />;
  }
}

export function WalletsBudgetsPanel({
  wallets,
  budgets,
  budgetLimits,
  monthLabel,
  numberMode,
  onSaveWallet,
  onDeleteWallet,
  onSaveBudget,
  compact = false,
}: WalletsBudgetsPanelProps) {
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<WalletType>('bank');
  const [walletInstitution, setWalletInstitution] = useState('');
  const [walletInitialBalance, setWalletInitialBalance] = useState('');

  const [editingBudgetCategory, setEditingBudgetCategory] = useState<string | null>(null);
  const [budgetInputValue, setBudgetInputValue] = useState('');
  const [newBudgetCategory, setNewBudgetCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [newBudgetLimit, setNewBudgetLimit] = useState('');
  const [showAddBudget, setShowAddBudget] = useState(false);

  const openNewWallet = () => {
    setEditingWalletId(null);
    setWalletName('');
    setWalletType('bank');
    setWalletInstitution('');
    setWalletInitialBalance('0');
    setShowWalletForm(true);
  };

  const openEditWallet = (w: WalletWithBalance) => {
    setEditingWalletId(w.id);
    setWalletName(w.name);
    setWalletType(w.type);
    setWalletInstitution(w.institution || '');
    setWalletInitialBalance(String(w.initialBalance));
    setShowWalletForm(true);
  };

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;
    const balanceNum = Number(walletInitialBalance);
    if (Number.isNaN(balanceNum)) return;

    onSaveWallet({
      id: editingWalletId || `w-${Date.now()}`,
      name: walletName.trim(),
      type: walletType,
      initialBalance: balanceNum,
      institution: walletInstitution.trim() || WALLET_TYPE_LABEL[walletType],
    });
    setShowWalletForm(false);
  };

  const startEditBudget = (b: BudgetStatus) => {
    setEditingBudgetCategory(b.category);
    setBudgetInputValue(String(b.limitAmount));
  };

  const commitEditBudget = (b: BudgetStatus) => {
    const val = Number(budgetInputValue);
    if (!Number.isNaN(val) && val > 0) {
      onSaveBudget({
        id: b.id,
        category: b.category,
        limitAmount: val,
      });
    }
    setEditingBudgetCategory(null);
  };

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limitVal = Number(newBudgetLimit);
    if (Number.isNaN(limitVal) || limitVal <= 0) return;
    const existing = budgetLimits.find((b) => b.category === newBudgetCategory);
    onSaveBudget({
      id: existing ? existing.id : `b-${Date.now()}`,
      category: newBudgetCategory,
      limitAmount: limitVal,
    });
    setShowAddBudget(false);
    setNewBudgetLimit('');
  };

  return (
    <section
      aria-label="Multi-Dompet dan Anggaran Bulanan"
      className="grid grid-cols-1 gap-4 xl:grid-cols-12"
    >
      {/* Multi-Wallet Panel */}
      <div className="flex flex-col rounded-xl border border-slate-800/80 bg-[#0F1623] p-5 xl:col-span-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Multi-Akun & Dompet
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Saldo terhitung dinamis berdasarkan seluruh mutasi transaksi
            </p>
          </div>
          <button
            type="button"
            onClick={openNewWallet}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#090D16] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-emerald-500/50 hover:text-emerald-300 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tambah Dompet</span>
          </button>
        </div>

        {showWalletForm && (
          <form
            onSubmit={handleWalletSubmit}
            className="mb-4 rounded-lg border border-slate-700/80 bg-[#090D16] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                {editingWalletId ? 'Ubah Dompet' : 'Dompet Baru'}
              </span>
              <button
                type="button"
                onClick={() => setShowWalletForm(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Batal
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs text-slate-400">
                Nama Dompet
                <input
                  type="text"
                  required
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="Contoh: Mandiri Payroll"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block text-xs text-slate-400">
                Jenis Akun
                <select
                  value={walletType}
                  onChange={(e) => setWalletType(e.target.value as WalletType)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="bank">Rekening Bank</option>
                  <option value="ewallet">E-Wallet</option>
                  <option value="cash">Kas Tunai</option>
                  <option value="trading">Akun Trading / Sekuritas</option>
                </select>
              </label>
              <label className="block text-xs text-slate-400">
                Institusi / Catatan
                <input
                  type="text"
                  value={walletInstitution}
                  onChange={(e) => setWalletInstitution(e.target.value)}
                  placeholder="BCA / GoPay / Stockbit"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block text-xs text-slate-400">
                Saldo Awal (Rp)
                <input
                  type="number"
                  required
                  value={walletInitialBalance}
                  onChange={(e) => setWalletInitialBalance(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              {editingWalletId && wallets.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteWallet(editingWalletId);
                    setShowWalletForm(false);
                  }}
                  className="mr-auto text-xs font-medium text-rose-400 hover:text-rose-300"
                >
                  Hapus Dompet
                </button>
              )}
              <button
                type="submit"
                className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                Simpan Dompet
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-800/70">
          {wallets.map((w) => (
            <div
              key={w.id}
              data-testid={`wallet-row-${w.id}`}
              className="flex items-center justify-between gap-4 py-3.5 first:pt-1 last:pb-1"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#090D16] shrink-0">
                  <WalletIcon type={w.type} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-100">
                      {w.name}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="truncate">{w.institution || WALLET_TYPE_LABEL[w.type]}</span>
                    {w.accountNumber && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-500">{w.accountNumber}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p
                    title={formatIDR(w.currentBalance)}
                    className="font-mono text-sm font-semibold text-slate-50 tabular-nums"
                  >
                    {formatSmartIDR(w.currentBalance, numberMode, 100_000_000)}
                  </p>
                  {!compact && (
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
                      +{formatIDR(w.inflow, true)} / -{formatIDR(w.outflow, true)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openEditWallet(w)}
                  aria-label={`Edit dompet ${w.name}`}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Budgeting Limits & Visual Alerts Panel */}
      <div className="flex flex-col rounded-xl border border-slate-800/80 bg-[#0F1623] p-5 xl:col-span-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Anggaran Bulanan · {monthLabel}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Indikator batas: Aman &lt;70% · Waspada 70–90% · Over-Budget &gt;90%
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddBudget((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#090D16] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-emerald-500/50 hover:text-emerald-300 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Atur Batas</span>
          </button>
        </div>

        {showAddBudget && (
          <form
            onSubmit={handleAddBudget}
            className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-700/80 bg-[#090D16] p-3"
          >
            <label className="flex-1 min-w-[140px] text-xs text-slate-400">
              Kategori
              <select
                value={newBudgetCategory}
                onChange={(e) => setNewBudgetCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-2.5 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 min-w-[140px] text-xs text-slate-400">
              Batas Maksimal (Rp)
              <input
                type="number"
                required
                min={1}
                value={newBudgetLimit}
                onChange={(e) => setNewBudgetLimit(e.target.value)}
                placeholder="3000000"
                className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              Simpan
            </button>
          </form>
        )}

        <div className="space-y-4">
          {budgets.map((b) => {
            const barWidth = Math.min(100, b.percentage);
            const barColor =
              b.level === 'danger'
                ? 'bg-rose-500'
                : b.level === 'warning'
                ? 'bg-amber-500'
                : 'bg-emerald-500';
            const textColor =
              b.level === 'danger'
                ? 'text-rose-400'
                : b.level === 'warning'
                ? 'text-amber-400'
                : 'text-emerald-400';

            return (
              <div key={b.id} data-testid={`budget-item-${b.category}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {b.level === 'danger' ? (
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden="true" />
                    ) : b.level === 'warning' ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    )}
                    <span className="font-medium text-slate-200 truncate">
                      {b.category}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className={`font-medium whitespace-nowrap ${textColor}`}>
                      {b.label} ({b.percentage}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                    <span className="text-slate-100">
                      {formatIDR(b.spentAmount, compact)}
                    </span>
                    <span className="text-slate-500">/</span>
                    {editingBudgetCategory === b.category ? (
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          aria-label={`Ubah batas anggaran ${b.category}`}
                          value={budgetInputValue}
                          onChange={(e) => setBudgetInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEditBudget(b);
                            if (e.key === 'Escape') setEditingBudgetCategory(null);
                          }}
                          className="w-24 rounded border border-emerald-500 bg-[#090D16] px-1.5 py-0.5 text-xs text-slate-100 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => commitEditBudget(b)}
                          className="text-[11px] font-sans font-medium text-emerald-400 hover:text-emerald-300"
                        >
                          OK
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditBudget(b)}
                        aria-label={`Ubah batas ${b.category}`}
                        className="text-slate-400 hover:text-slate-200 underline decoration-slate-700 underline-offset-2"
                      >
                        {formatIDR(b.limitAmount, compact)}
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-slate-800/90"
                  role="progressbar"
                  aria-valuenow={b.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Penggunaan anggaran ${b.category}`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
