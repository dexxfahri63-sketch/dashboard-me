import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type {
  Transaction,
  TransactionType,
  WalletWithBalance,
  WishlistItem,
} from '../types/finance';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSFER_CATEGORIES,
  formatIDR,
  toISODate,
} from '../utils/financeEngine';

interface TransactionModalProps {
  isOpen: boolean;
  editingTransaction: Transaction | null;
  wallets: WalletWithBalance[];
  wishlist?: WishlistItem[];
  onClose: () => void;
  onSave: (tx: Transaction) => void;
}

export function TransactionModal({
  isOpen,
  editingTransaction,
  wallets,
  wishlist = [],
  onClose,
  onSave,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(toISODate(new Date()));
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(wallets[1]?.id || wallets[0]?.id || '');
  const [linkedWishlistId, setLinkedWishlistId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setCategory(editingTransaction.category);
      setAmount(String(editingTransaction.amount));
      setWalletId(editingTransaction.walletId);
      setToWalletId(
        editingTransaction.toWalletId ||
          wallets.find((w) => w.id !== editingTransaction.walletId)?.id ||
          ''
      );
      setLinkedWishlistId(editingTransaction.wishlistId || '');
      setDescription(editingTransaction.description);
    } else {
      setType('expense');
      setDate(toISODate(new Date()));
      setCategory(EXPENSE_CATEGORIES[0]);
      setAmount('');
      const firstId = wallets[0]?.id || '';
      const secondId = wallets.find((w) => w.id !== firstId)?.id || firstId;
      setWalletId(firstId);
      setToWalletId(secondId);
      setLinkedWishlistId('');
      setDescription('');
    }
  }, [isOpen, editingTransaction, wallets]);

  if (!isOpen) return null;

  const categories =
    type === 'income'
      ? INCOME_CATEGORIES
      : type === 'transfer'
      ? TRANSFER_CATEGORIES
      : EXPENSE_CATEGORIES;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextList =
      nextType === 'income'
        ? INCOME_CATEGORIES
        : nextType === 'transfer'
        ? TRANSFER_CATEGORIES
        : EXPENSE_CATEGORIES;
    if (!nextList.includes(category as never)) {
      setCategory(nextList[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Nominal transaksi harus lebih besar dari Rp 0.');
      return;
    }
    if (!walletId) {
      setError('Silakan pilih dompet asal.');
      return;
    }
    if (type === 'transfer') {
      if (!toWalletId) {
        setError('Silakan pilih dompet tujuan transfer.');
        return;
      }
      if (walletId === toWalletId) {
        setError('Dompet asal dan dompet tujuan tidak boleh sama.');
        return;
      }
    }

    const isWishlistLinked =
      type !== 'transfer' &&
      (category === 'Tabungan Wishlist' ||
        category === 'Penarikan Wishlist' ||
        Boolean(linkedWishlistId)) &&
      Boolean(linkedWishlistId);

    onSave({
      id: editingTransaction?.id || `tx-${Date.now()}`,
      date,
      type,
      category,
      description: description.trim() || category,
      amount: numericAmount,
      walletId,
      toWalletId: type === 'transfer' ? toWalletId : undefined,
      wishlistId: isWishlistLinked ? linkedWishlistId : undefined,
      wishlistAction: isWishlistLinked
        ? type === 'expense'
          ? 'deposit'
          : 'withdraw'
        : undefined,
      createdAt: editingTransaction?.createdAt || new Date().toISOString(),
    });
    onClose();
  };

  const selectedSourceWallet = wallets.find((w) => w.id === walletId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#0F1623] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <h2 id="tx-modal-title" className="font-display text-lg font-semibold text-slate-100">
            {editingTransaction ? 'Edit Transaksi' : 'Catat Transaksi Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal transaksi"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Type segmented switch */}
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-800 bg-[#090D16] p-1">
            {(
              [
                { id: 'expense', label: 'Pengeluaran' },
                { id: 'income', label: 'Pemasukan' },
                { id: 'transfer', label: 'Transfer' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleTypeChange(opt.id)}
                className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                  type === opt.id
                    ? opt.id === 'income'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : opt.id === 'expense'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-300">
              Tanggal
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-slate-300">
              Nominal (Rp)
              <input
                type="number"
                required
                min={1}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-300">
              {type === 'transfer' ? 'Dari Dompet' : 'Pilih Akun / Dompet'}
              <select
                required
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatIDR(w.currentBalance, true)})
                  </option>
                ))}
              </select>
              {selectedSourceWallet && (
                <span className="mt-1 block font-mono text-[11px] text-slate-400">
                  Saldo saat ini: {formatIDR(selectedSourceWallet.currentBalance)}
                </span>
              )}
            </label>

            {type === 'transfer' ? (
              <label className="block text-xs font-medium text-slate-300">
                Ke Dompet Tujuan
                <select
                  required
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatIDR(w.currentBalance, true)})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block text-xs font-medium text-slate-300">
                Kategori
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {type === 'transfer' && (
            <label className="block text-xs font-medium text-slate-300">
              Kategori Transfer
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                {TRANSFER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
          )}

          {(category === 'Tabungan Wishlist' ||
            category === 'Penarikan Wishlist' ||
            linkedWishlistId) &&
            type !== 'transfer' &&
            wishlist.length > 0 && (
              <label className="block text-xs font-medium text-slate-300">
                Sinkronkan ke Target Wishlist
                <select
                  value={linkedWishlistId}
                  onChange={(e) => setLinkedWishlistId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Tidak dihubungkan ke target wishlist</option>
                  {wishlist.map((wl) => (
                    <option key={wl.id} value={wl.id}>
                      {wl.title} ({formatIDR(wl.currentAmount, true)} /{' '}
                      {formatIDR(wl.targetAmount, true)})
                    </option>
                  ))}
                </select>
              </label>
            )}

          <label className="block text-xs font-medium text-slate-300">
            Keterangan
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Makan siang tim, setor RDN, atau beli bahan dapur"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>

          {error && (
            <p role="alert" className="text-xs font-medium text-rose-400">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              {editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
