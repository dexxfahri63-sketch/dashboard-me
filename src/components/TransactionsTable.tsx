import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { Transaction, TransactionType, Wallet } from '../types/finance';
import { formatDateID, formatIDR } from '../utils/financeEngine';

interface TransactionsTableProps {
  transactions: Transaction[];
  wallets: Wallet[];
  onEdit: (tx: Transaction) => void;
  onDelete: (txId: string) => void;
  onCreateNew: () => void;
  limitRows?: number;
  onViewAll?: () => void;
}

const TYPE_LABEL: Record<TransactionType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  transfer: 'Transfer',
};

export function TransactionsTable({
  transactions,
  wallets,
  onEdit,
  onDelete,
  onCreateNew,
  limitRows,
  onViewAll,
}: TransactionsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [walletFilter, setWalletFilter] = useState<string>('all');

  const walletMap = useMemo(() => {
    const map = new Map<string, Wallet>();
    for (const w of wallets) map.set(w.id, w);
    return map;
  }, [wallets]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (
          walletFilter !== 'all' &&
          tx.walletId !== walletFilter &&
          tx.toWalletId !== walletFilter
        ) {
          return false;
        }
        if (q) {
          const wName = walletMap.get(tx.walletId)?.name.toLowerCase() || '';
          const match =
            tx.description.toLowerCase().includes(q) ||
            tx.category.toLowerCase().includes(q) ||
            wName.includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [transactions, typeFilter, walletFilter, searchQuery, walletMap]);

  const displayed = limitRows ? filtered.slice(0, limitRows) : filtered;

  return (
    <section
      aria-label="Riwayat Transaksi"
      className="rounded-xl border border-slate-800/80 bg-[#0F1623] p-5"
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100">
            Riwayat Transaksi
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Menampilkan {displayed.length} dari {filtered.length} entri pada periode aktif
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Cari transaksi"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari keterangan atau kategori..."
              className="w-52 rounded-lg border border-slate-700 bg-[#090D16] py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter jenis transaksi"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}
            className="rounded-lg border border-slate-700 bg-[#090D16] px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">Semua Jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
            <option value="transfer">Transfer</option>
          </select>

          <select
            aria-label="Filter dompet"
            value={walletFilter}
            onChange={(e) => setWalletFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-[#090D16] px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">Semua Dompet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {onViewAll && filtered.length > (limitRows || 0) && (
            <button
              type="button"
              onClick={onViewAll}
              className="rounded-lg border border-slate-700 bg-[#090D16] px-3 py-1.5 text-xs font-medium text-emerald-400 hover:border-emerald-500/50 transition-colors whitespace-nowrap shrink-0"
            >
              Lihat Semua
            </button>
          )}
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-[#090D16]/60 py-12 text-center">
          <p className="text-sm font-medium text-slate-300">
            Belum ada transaksi yang cocok dengan filter ini
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Ubah periode tanggal atau catat transaksi baru untuk memulai.
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Catat Transaksi Pertama</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800/80 text-[11px] font-medium text-slate-400">
                <th className="py-2.5 pr-4">Tanggal</th>
                <th className="py-2.5 pr-4">Keterangan & Kategori</th>
                <th className="py-2.5 pr-4">Dompet</th>
                <th className="py-2.5 pr-4">Jenis</th>
                <th className="py-2.5 pr-4 text-right">Nominal</th>
                <th className="py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {displayed.map((tx) => {
                const sourceWallet = walletMap.get(tx.walletId)?.name || 'Dompet';
                const destWallet = tx.toWalletId
                  ? walletMap.get(tx.toWalletId)?.name || 'Dompet'
                  : null;

                const amountClass =
                  tx.type === 'income'
                    ? 'text-emerald-400'
                    : tx.type === 'expense'
                    ? 'text-rose-400'
                    : 'text-indigo-300';
                const prefix =
                  tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';

                return (
                  <tr
                    key={tx.id}
                    data-testid={`tx-row-${tx.id}`}
                    className="h-11 transition-colors hover:bg-slate-800/35"
                  >
                    <td className="py-2.5 pr-4 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                      {formatDateID(tx.date)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-slate-100">
                        {tx.description || tx.category}
                      </div>
                      <div className="text-[11px] text-slate-400">{tx.category}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">
                      {destWallet ? `${sourceWallet} → ${destWallet}` : sourceWallet}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          tx.type === 'income'
                            ? 'text-emerald-400'
                            : tx.type === 'expense'
                            ? 'text-rose-400'
                            : 'text-indigo-400'
                        }`}
                      >
                        {TYPE_LABEL[tx.type]}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 pr-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${amountClass}`}
                    >
                      {prefix}
                      {formatIDR(tx.amount)}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(tx)}
                          aria-label={`Edit transaksi ${tx.description || tx.category}`}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(tx.id)}
                          aria-label={`Hapus transaksi ${tx.description || tx.category}`}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
