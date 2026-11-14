import { ArrowDownRight, ArrowUpRight, Layers, Target, Wallet } from 'lucide-react';
import type { NumberDisplayMode } from '../types/finance';
import { formatIDR, formatSmartIDR, type KpiSummary } from '../utils/financeEngine';

interface KpiGridProps {
  kpi: KpiSummary;
  walletCount: number;
  periodLabel: string;
  numberMode: NumberDisplayMode;
}

export function KpiGrid({
  kpi,
  walletCount,
  periodLabel,
  numberMode,
}: KpiGridProps) {
  const netPositive = kpi.periodNetCashflow >= 0;

  return (
    <section
      aria-label="Ringkasan Metrik Keuangan"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* 1. Total Saldo Keseluruhan */}
      <article className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0F1623] p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            Total Saldo Keseluruhan
          </span>
          <Wallet className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
        </div>
        <div className="mt-3">
          <p
            data-testid="kpi-total-balance"
            title={formatIDR(kpi.totalBalance)}
            className="font-mono text-xl font-bold tracking-tight text-slate-50 tabular-nums sm:text-2xl"
          >
            {formatSmartIDR(kpi.totalBalance, numberMode, 100_000_000)}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/70 pt-3 text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
          <span>{walletCount} Dompet Aktif</span>
          <span className="font-mono text-slate-300">
            Kas {formatIDR(kpi.cashBalance, true)}
          </span>
        </div>
      </article>

      {/* 2. Arus Kas Periode Ini */}
      <article className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0F1623] p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            Arus Kas · {periodLabel}
          </span>
          {netPositive ? (
            <ArrowUpRight className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-rose-400 shrink-0" aria-hidden="true" />
          )}
        </div>
        <div className="mt-3">
          <p
            data-testid="kpi-net-cashflow"
            title={formatIDR(kpi.periodNetCashflow)}
            className={`font-mono text-xl font-bold tracking-tight tabular-nums sm:text-2xl ${
              netPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netPositive && kpi.periodNetCashflow > 0 ? '+' : ''}
            {formatSmartIDR(kpi.periodNetCashflow, numberMode, 50_000_000)}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/70 pt-3 text-[11px] font-mono tabular-nums whitespace-nowrap">
          <span className="text-emerald-400">
            +{formatIDR(kpi.periodIncome, true)}
          </span>
          <span className="text-slate-600" aria-hidden="true">
            /
          </span>
          <span className="text-rose-400">
            -{formatIDR(kpi.periodExpense, true)}
          </span>
        </div>
      </article>

      {/* 3. Akumulasi Aset & Cloud Balance */}
      <article className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0F1623] p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            Akumulasi Aset (Cloud Balance)
          </span>
          <Layers className="h-4 w-4 text-indigo-400 shrink-0" aria-hidden="true" />
        </div>
        <div className="mt-3">
          <p
            data-testid="kpi-cloud-balance"
            title={formatIDR(kpi.cloudBalance)}
            className="font-mono text-xl font-bold tracking-tight text-slate-50 tabular-nums sm:text-2xl"
          >
            {formatSmartIDR(kpi.cloudBalance, numberMode, 100_000_000)}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/70 pt-3 text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
          <span>Bank, E-Wallet &amp; RDN</span>
          <span className="text-indigo-300 font-mono">
            Tabungan {kpi.savingsRatePct}%
          </span>
        </div>
      </article>

      {/* 4. Alokasi Target Wishlist & Status Trading */}
      <article className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0F1623] p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            Wishlist &amp; Portofolio Trading
          </span>
          <Target className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
        </div>
        <div className="mt-3">
          <p
            data-testid="kpi-wishlist-trading"
            title={formatIDR(kpi.wishlistAllocated)}
            className="font-mono text-xl font-bold tracking-tight text-slate-50 tabular-nums sm:text-2xl"
          >
            {formatSmartIDR(kpi.wishlistAllocated, numberMode, 100_000_000)}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/70 pt-3 text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
          <span>
            Target {kpi.wishlistProgressPct}% ({formatIDR(kpi.wishlistTargetTotal, true)})
          </span>
          <span className="font-mono text-emerald-400">
            RDN {formatIDR(kpi.tradingBalance, true)}
          </span>
        </div>
      </article>
    </section>
  );
}
