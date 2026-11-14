import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Plus, Trash2, TrendingUp } from 'lucide-react';
import type {
  NumberDisplayMode,
  Transaction,
  WalletWithBalance,
  WishlistItem,
} from '../types/finance';
import { uploadWishlistImage } from '../services/firebaseService';
import { formatDateID, formatIDR, formatSmartIDR } from '../utils/financeEngine';
import { resolveWishlistImage } from '../utils/wishlistImages';

interface WishlistTradingViewProps {
  wishlist: WishlistItem[];
  wallets: WalletWithBalance[];
  transactions: Transaction[];
  numberMode: NumberDisplayMode;
  onSaveWishlist: (item: WishlistItem) => void;
  onDeleteWishlist: (id: string) => void;
  compact?: boolean;
}

export function WishlistTradingView({
  wishlist,
  wallets,
  transactions,
  numberMode,
  onSaveWishlist,
  onDeleteWishlist,
  compact = false,
}: WishlistTradingViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Otomotif');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('2027-06-30');
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [newImageUrl, setNewImageUrl] = useState<string | undefined>(undefined);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const [addingFundId, setAddingFundId] = useState<string | null>(null);
  const [fundIncrement, setFundIncrement] = useState('');
  const newFormFileRef = useRef<HTMLInputElement | null>(null);

  const tradingWallets = wallets.filter((w) => w.type === 'trading');
  const tradingBalance = tradingWallets.reduce((sum, w) => sum + w.currentBalance, 0);
  const tradingTxs = transactions.filter(
    (t) =>
      tradingWallets.some((w) => w.id === t.walletId || w.id === t.toWalletId) ||
      t.category.toLowerCase().includes('trading')
  );
  const tradingProfit = tradingTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleNewFormImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId('new-form');
    try {
      const { url } = await uploadWishlistImage(file, `wish-${Date.now()}`);
      setNewImageUrl(url);
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  const handleExistingImageSelect = async (
    item: WishlistItem,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(item.id);
    try {
      const { url } = await uploadWishlistImage(file, item.id);
      setBrokenImages((prev) => ({ ...prev, [item.id]: false }));
      onSaveWishlist({
        ...item,
        imageUrl: url,
      });
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(targetAmount);
    const current = Number(currentAmount || 0);
    if (!title.trim() || Number.isNaN(target) || target <= 0) return;

    onSaveWishlist({
      id: `wish-${Date.now()}`,
      title: title.trim(),
      category: category.trim() || 'Umum',
      targetAmount: target,
      currentAmount: Math.max(0, current),
      targetDate,
      walletId: walletId || wallets[0]?.id || '',
      imageUrl: newImageUrl,
    });

    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setNewImageUrl(undefined);
    setShowAddForm(false);
  };

  const handleAddFund = (item: WishlistItem) => {
    const delta = Number(fundIncrement);
    if (Number.isNaN(delta) || delta <= 0) return;
    onSaveWishlist({
      ...item,
      currentAmount: Math.min(item.targetAmount, item.currentAmount + delta),
    });
    setAddingFundId(null);
    setFundIncrement('');
  };

  return (
    <section
      aria-label="Target Wishlist dan Status Trading"
      className="grid grid-cols-1 gap-4 xl:grid-cols-12"
    >
      {/* Wishlist Targets */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0F1623] p-5 xl:col-span-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Target &amp; Wishlist Tabungan
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Pelacakan progres dana impian dengan galeri foto target tersinkron
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#090D16] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-emerald-500/50 hover:text-emerald-300 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tambah Target</span>
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleCreateGoal}
            className="mb-5 rounded-lg border border-slate-700/80 bg-[#090D16] p-4 space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-xs text-slate-400">
                Nama Target / Barang
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Kereta / Motor Listrik"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block text-xs text-slate-400">
                Kategori
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block text-xs text-slate-400">
                Target Nominal (Rp)
                <input
                  type="number"
                  required
                  min={1}
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="120000000"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block text-xs text-slate-400">
                Dana Terkumpul Awal (Rp)
                <input
                  type="number"
                  min={0}
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block text-xs text-slate-400">
                Estimasi Target Tercapai
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block text-xs text-slate-400">
                Dompet Penyimpanan
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
              <div className="flex items-center gap-3">
                <input
                  ref={newFormFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleNewFormImageSelect}
                  className="sr-only"
                  aria-label="Pilih foto target wishlist baru"
                />
                <button
                  type="button"
                  onClick={() => newFormFileRef.current?.click()}
                  disabled={uploadingId === 'new-form'}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-[#0F1623] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 transition-colors"
                >
                  {uploadingId === 'new-form' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  )}
                  <span>{newImageUrl ? 'Ganti Foto Target' : 'Unggah Foto Target'}</span>
                </button>
                {newImageUrl && (
                  <img
                    src={newImageUrl}
                    alt="Pratinjau foto target baru"
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 rounded-md border border-slate-700 object-cover"
                  />
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Simpan Target
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-800/70">
          {wishlist.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              Belum ada target wishlist yang dicatat.
            </p>
          ) : (
            wishlist.map((item) => {
              const pct =
                item.targetAmount > 0
                  ? Math.min(100, Math.round((item.currentAmount / item.targetAmount) * 100))
                  : 0;
              const walletName =
                wallets.find((w) => w.id === item.walletId)?.name || 'Dompet Utama';
              const remaining = Math.max(0, item.targetAmount - item.currentAmount);
              const resolvedSrc = resolveWishlistImage(item.id, item.imageUrl);
              const isUploading = uploadingId === item.id;
              const isBroken = brokenImages[item.id];

              return (
                <div
                  key={item.id}
                  data-testid={`wishlist-item-${item.id}`}
                  className="flex flex-col gap-3.5 py-4 first:pt-1 last:pb-1 sm:flex-row sm:items-start"
                >
                  {/* Thumbnail Photo + Upload Trigger */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-[#090D16]">
                    {resolvedSrc && !isBroken ? (
                      <img
                        src={resolvedSrc}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-500">
                        <ImagePlus className="h-5 w-5" aria-hidden="true" />
                      </div>
                    )}
                    <label
                      className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center gap-1 bg-black/70 py-1 text-[10px] font-medium text-slate-200 transition-colors hover:bg-emerald-600/90 hover:text-white"
                      title={`Unggah foto baru untuk ${item.title}`}
                    >
                      {isUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <ImagePlus className="h-3 w-3" aria-hidden="true" />
                      )}
                      <span>{isUploading ? '...' : 'Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        aria-label={`Unggah foto untuk ${item.title}`}
                        onChange={(e) => handleExistingImageSelect(item, e)}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {/* Progress & Details */}
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-100 truncate">
                          {item.title}
                        </h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                          <span>{item.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{walletName}</span>
                          {item.targetDate && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">
                                Target {formatDateID(item.targetDate)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                          {pct}%
                        </span>
                        {addingFundId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              placeholder="500000"
                              aria-label={`Nominal tambahan tabungan untuk ${item.title}`}
                              value={fundIncrement}
                              onChange={(e) => setFundIncrement(e.target.value)}
                              className="w-28 rounded border border-emerald-500 bg-[#090D16] px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleAddFund(item)}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                            >
                              Tambah
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddingFundId(null)}
                              className="px-1.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAddingFundId(item.id);
                              setFundIncrement('1000000');
                            }}
                            className="rounded-md border border-slate-700 bg-[#090D16] px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors whitespace-nowrap"
                          >
                            + Setor Tabungan
                          </button>
                        )}
                        {!compact && (
                          <button
                            type="button"
                            onClick={() => onDeleteWishlist(item.id)}
                            aria-label={`Hapus target ${item.title}`}
                            className="rounded p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progres ${item.title}`}
                    >
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums text-slate-400">
                      <span title={`${formatIDR(item.currentAmount)} / ${formatIDR(item.targetAmount)}`}>
                        Terkumpul{' '}
                        <strong className="text-slate-100">
                          {formatSmartIDR(item.currentAmount, numberMode, 50_000_000)}
                        </strong>{' '}
                        dari {formatSmartIDR(item.targetAmount, numberMode, 50_000_000)}
                      </span>
                      <span title={formatIDR(remaining)}>
                        Kurang {formatSmartIDR(remaining, numberMode, 50_000_000)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Trading Account Status Panel */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0F1623] p-5 xl:col-span-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Status Akun Trading
            </h2>
            <TrendingUp className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Ekuitas RDN, profit terealisasi &amp; aktivitas sekuritas
          </p>

          <div className="mt-5 space-y-4 border-t border-slate-800/70 pt-4">
            <div>
              <span className="text-xs text-slate-400">Saldo Akun Trading / RDN</span>
              <p
                title={formatIDR(tradingBalance)}
                className="mt-1 font-mono text-2xl font-bold text-slate-50 tabular-nums"
              >
                {formatSmartIDR(tradingBalance, numberMode, 100_000_000)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-800/70 pt-4">
              <div>
                <span className="text-[11px] text-slate-400">Realisasi Profit</span>
                <p
                  title={formatIDR(tradingProfit)}
                  className="mt-1 font-mono text-sm font-semibold text-emerald-400 tabular-nums"
                >
                  +{formatSmartIDR(tradingProfit, numberMode, 25_000_000)}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Aktivitas RDN</span>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-200 tabular-nums">
                  {tradingTxs.length} transaksi
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-800/70 pt-4">
          <h3 className="text-xs font-medium text-slate-300">Mutasi Trading Terakhir</h3>
          <div className="mt-2 divide-y divide-slate-800/60">
            {tradingTxs.slice(0, 3).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-2 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate text-slate-200">{tx.description}</p>
                  <p className="font-mono text-[11px] text-slate-500">
                    {formatDateID(tx.date)}
                  </p>
                </div>
                <span
                  title={formatIDR(tx.amount)}
                  className={`font-mono font-semibold tabular-nums shrink-0 ${
                    tx.type === 'income'
                      ? 'text-emerald-400'
                      : tx.type === 'expense'
                      ? 'text-rose-400'
                      : 'text-indigo-300'
                  }`}
                >
                  {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                  {formatIDR(tx.amount, true)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
