import { useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Flame,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AppSettings,
  BudgetLimit,
  FirebaseConnectionState,
  GasConfig,
  Transaction,
  Wallet,
  WishlistItem,
} from '../types/finance';
import { formatIDR } from '../utils/financeEngine';
import { GasSetupView } from './GasSetupView';

interface HiddenAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  firebaseState: FirebaseConnectionState;
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: BudgetLimit[];
  wishlist: WishlistItem[];
  gasConfig: GasConfig;
  onUpdateSettings: (next: AppSettings) => void;
  onSeedDemoData: () => Promise<void>;
  onSimulateOverBudget: () => Promise<void>;
  onClearAllData: () => Promise<void>;
  onTestFirebase: () => Promise<void>;
  onDeleteTransaction: (id: string) => void;
  onDeleteWallet: (id: string) => void;
  onDeleteWishlist: (id: string) => void;
  onOpenNewTxModal: () => void;
  onUpdateGasUrl: (url: string) => void;
  onPullFromGas: () => Promise<void>;
  onPushAllToGas: () => Promise<void>;
  onResetSeed: () => void;
}

type AdminTab = 'data-manager' | 'demo-tools' | 'firebase-config' | 'gas-hidden';

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /dexx_wallets/{walletId} { allow read, write: if true; }
    match /dexx_transactions/{txId} { allow read, write: if true; }
    match /dexx_budgets/{budgetId} { allow read, write: if true; }
    match /dexx_wishlist/{wishlistId} { allow read, write: if true; }
    match /dexx_settings/{settingId} { allow read, write: if true; }
  }
}`;

export function HiddenAdminModal({
  isOpen,
  onClose,
  settings,
  firebaseState,
  wallets,
  transactions,
  budgets,
  wishlist,
  gasConfig,
  onUpdateSettings,
  onSeedDemoData,
  onSimulateOverBudget,
  onClearAllData,
  onTestFirebase,
  onDeleteTransaction,
  onDeleteWallet,
  onDeleteWishlist,
  onOpenNewTxModal,
  onUpdateGasUrl,
  onPullFromGas,
  onPushAllToGas,
  onResetSeed,
}: HiddenAdminModalProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('demo-tools');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);

  const [draftWorkspace, setDraftWorkspace] = useState(settings.workspaceName);
  const [draftOwner, setDraftOwner] = useState(settings.ownerLabel);
  const [draftPin, setDraftPin] = useState(settings.adminPin);
  const [draftNumberMode, setDraftNumberMode] = useState(settings.numberMode);

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === settings.adminPin) {
      setUnlocked(true);
      setPinError('');
      setDraftWorkspace(settings.workspaceName);
      setDraftOwner(settings.ownerLabel);
      setDraftPin(settings.adminPin);
      setDraftNumberMode(settings.numberMode);
    } else {
      setPinError('PIN salah. Periksa kembali PIN Admin Anda.');
    }
  };

  const handleClose = () => {
    setPinInput('');
    setPinError('');
    onClose();
  };

  const runBusy = async (label: string, fn: () => Promise<void>) => {
    setBusyAction(label);
    try {
      await fn();
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      workspaceName: draftWorkspace.trim() || 'DEXX FINANCE',
      ownerLabel: draftOwner.trim() || 'Personal Wealth',
      adminPin: draftPin.trim() || '1234',
      numberMode: draftNumberMode,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hidden-admin-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
    >
      {!unlocked ? (
        <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-[#0F1623] p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h2
                id="hidden-admin-title"
                className="font-display text-base font-semibold text-slate-100"
              >
                Admin Console Access
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Tutup akses admin"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleUnlock} className="mt-4 space-y-4">
            <p className="text-xs text-slate-400">
              Masukkan PIN untuk membuka kontrol demo klien, manajemen Firestore langsung, dan konfigurasi aplikasi.
            </p>
            <label className="block text-xs font-medium text-slate-300">
              PIN Admin (Default: 1234)
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                required
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2.5 text-center font-mono text-base tracking-[0.35em] text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </label>
            {pinError && (
              <p role="alert" className="text-xs text-rose-400">
                {pinError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Buka Console</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0F1623] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <div>
                <h2
                  id="hidden-admin-title"
                  className="font-display text-base font-semibold text-slate-100"
                >
                  Hidden Admin Console · {settings.workspaceName}
                </h2>
                <p className="text-xs text-slate-400">
                  Kontrol presentasi klien, mutasi live, Firebase &amp; integrasi lanjutan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUnlocked(false)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                Kunci
              </button>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Tutup panel admin"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Admin Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-slate-800/80 bg-[#0B101B] px-6 py-2.5">
            {(
              [
                { id: 'demo-tools', label: 'Demo & Pitching', icon: Sparkles },
                { id: 'data-manager', label: 'Live Data Manager', icon: Database },
                { id: 'firebase-config', label: 'Firebase & Aplikasi', icon: Settings2 },
                { id: 'gas-hidden', label: 'Integrasi GAS', icon: Flame },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = activeAdminTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveAdminTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeAdminTab === 'demo-tools' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-800 bg-[#090D16] p-3.5">
                    <span className="text-[11px] text-slate-400">Dompet</span>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-100">
                      {wallets.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-[#090D16] p-3.5">
                    <span className="text-[11px] text-slate-400">Transaksi</span>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-100">
                      {transactions.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-[#090D16] p-3.5">
                    <span className="text-[11px] text-slate-400">Kategori Budget</span>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-100">
                      {budgets.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-[#090D16] p-3.5">
                    <span className="text-[11px] text-slate-400">Wishlist</span>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-100">
                      {wishlist.length}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#090D16] p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        Seed Dummy Data
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Isi ulang seluruh dompet, transaksi multi-bulan, anggaran, dan target wishlist untuk demo klien.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => runBusy('seed', onSeedDemoData)}
                      className="mt-4 w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busyAction === 'seed' ? 'Mengisi Data...' : 'Seed Dummy Data'}
                    </button>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#090D16] p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        Simulasi Over-Budget
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Tambahkan transaksi pengeluaran besar instan untuk mendemonstrasikan alert merah &amp; kuning.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => runBusy('spike', onSimulateOverBudget)}
                      className="mt-4 w-full rounded-lg border border-amber-500/40 bg-amber-500/15 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 disabled:opacity-50"
                    >
                      {busyAction === 'spike' ? 'Memproses...' : 'Picu Alert Over-Budget'}
                    </button>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#090D16] p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        Reset / Kosongkan Data
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Hapus seluruh transaksi, anggaran, dan wishlist agar klien dapat melihat onboarding kosong.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => runBusy('clear', onClearAllData)}
                      className="mt-4 w-full rounded-lg border border-rose-500/40 bg-rose-500/15 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-50"
                    >
                      {busyAction === 'clear' ? 'Menghapus...' : 'Kosongkan Semua Data'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeAdminTab === 'data-manager' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Manajemen Data Live
                    </h3>
                    <p className="text-xs text-slate-400">
                      Hapus entri atau tambahkan transaksi baru langsung ke Firestore/state aktif.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onOpenNewTxModal();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tambah Transaksi</span>
                  </button>
                </div>

                {/* Wallets Quick List */}
                <div className="rounded-lg border border-slate-800 bg-[#090D16] p-4">
                  <h4 className="mb-2 text-xs font-semibold text-slate-300">
                    Daftar Dompet ({wallets.length})
                  </h4>
                  <div className="divide-y divide-slate-800/70">
                    {wallets.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between py-2 text-xs"
                      >
                        <div>
                          <span className="font-medium text-slate-100">{w.name}</span>
                          <span className="ml-2 text-slate-500">({w.type})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-300">
                            Awal: {formatIDR(w.initialBalance)}
                          </span>
                          {wallets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeleteWallet(w.id)}
                              aria-label={`Hapus dompet admin ${w.name}`}
                              className="rounded p-1 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Transactions Quick Delete */}
                <div className="rounded-lg border border-slate-800 bg-[#090D16] p-4">
                  <h4 className="mb-2 text-xs font-semibold text-slate-300">
                    10 Transaksi Terbaru ({transactions.length} total)
                  </h4>
                  <div className="divide-y divide-slate-800/70">
                    {transactions.slice(0, 10).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-slate-500 mr-2">
                            {tx.date}
                          </span>
                          <span className="text-slate-200 truncate">
                            {tx.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-slate-200">
                            {formatIDR(tx.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            aria-label={`Hapus transaksi admin ${tx.description}`}
                            className="rounded p-1 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wishlist Quick Delete */}
                <div className="rounded-lg border border-slate-800 bg-[#090D16] p-4">
                  <h4 className="mb-2 text-xs font-semibold text-slate-300">
                    Target Wishlist ({wishlist.length})
                  </h4>
                  <div className="divide-y divide-slate-800/70">
                    {wishlist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 text-xs"
                      >
                        <span className="text-slate-200">{item.title}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-400">
                            {formatIDR(item.currentAmount)} / {formatIDR(item.targetAmount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteWishlist(item.id)}
                            aria-label={`Hapus wishlist admin ${item.title}`}
                            className="rounded p-1 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeAdminTab === 'firebase-config' && (
              <div className="space-y-5">
                {/* Firebase Status Card */}
                <div className="rounded-xl border border-slate-800 bg-[#090D16] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        Status Firebase Firestore &amp; Storage
                      </h3>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        Project ID: {firebaseState.projectId} · Status:{' '}
                        <span
                          className={
                            firebaseState.status === 'connected'
                              ? 'text-emerald-400'
                              : firebaseState.status === 'connecting'
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }
                        >
                          {firebaseState.status === 'connected'
                            ? 'Firestore Terhubung (Real-Time)'
                            : firebaseState.status === 'connecting'
                            ? 'Menghubungkan...'
                            : 'Mode Cache Lokal (Fallback Aktif)'}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => runBusy('test-fb', onTestFirebase)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0F1623] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Hubungkan &amp; Uji Koneksi</span>
                    </button>
                  </div>
                  {firebaseState.errorDetail && (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-[11px] text-amber-300">
                      Catatan Firestore: {firebaseState.errorDetail}
                    </p>
                  )}

                  {firebaseState.status !== 'connected' && (
                    <div className="space-y-2.5 rounded-lg border border-slate-800 bg-[#070B12] p-3.5 text-xs text-slate-300">
                      <p>
                        Pastikan <strong>Cloud Firestore</strong> di proyek{' '}
                        <span className="font-mono text-emerald-300">
                          {firebaseState.projectId}
                        </span>{' '}
                        sudah diaktifkan dan <strong>Firestore Security Rules</strong> mengizinkan koleksi DEXX FINANCE (tempel di{' '}
                        <strong>Firebase Console → Firestore Database → Rules → Publish</strong>, lalu klik{' '}
                        <strong>Hubungkan &amp; Uji Koneksi</strong>):
                      </p>
                      <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-[#090D16] p-3 font-mono text-[11px] text-emerald-300">
                        {FIRESTORE_RULES_SNIPPET}
                      </pre>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
                            setCopiedRules(true);
                            setTimeout(() => setCopiedRules(false), 2000);
                          } catch {
                            // Ignore clipboard errors in restricted frames
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#0F1623] px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:border-emerald-500/50"
                      >
                        {copiedRules ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                            <span>Rules Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" aria-hidden="true" />
                            <span>Salin Rules Firestore</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* App Config Form */}
                <form
                  onSubmit={handleSaveSettings}
                  className="rounded-xl border border-slate-800 bg-[#090D16] p-4 space-y-4"
                >
                  <h3 className="text-sm font-semibold text-slate-100">
                    Konfigurasi Dasar Aplikasi
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block text-xs text-slate-400">
                      Nama Brand / Workspace
                      <input
                        type="text"
                        value={draftWorkspace}
                        onChange={(e) => setDraftWorkspace(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </label>
                    <label className="block text-xs text-slate-400">
                      Label Pemilik / Klien
                      <input
                        type="text"
                        value={draftOwner}
                        onChange={(e) => setDraftOwner(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </label>
                    <label className="block text-xs text-slate-400">
                      Format Angka Keuangan
                      <select
                        value={draftNumberMode}
                        onChange={(e) =>
                          setDraftNumberMode(e.target.value as 'smart' | 'full')
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="smart">
                          Smart Format (Contoh: Rp 146,7 Jt / Rp 185.000)
                        </option>
                        <option value="full">
                          Penuh Standar Indonesia (Contoh: Rp 146.740.000)
                        </option>
                      </select>
                    </label>
                    <label className="block text-xs text-slate-400">
                      PIN Hidden Admin
                      <input
                        type="text"
                        value={draftPin}
                        onChange={(e) => setDraftPin(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0F1623] px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Simpan Konfigurasi
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeAdminTab === 'gas-hidden' && (
              <GasSetupView
                gasConfig={gasConfig}
                onUpdateUrl={onUpdateGasUrl}
                onPullFromGas={onPullFromGas}
                onPushAllToGas={onPushAllToGas}
                onResetSeed={onResetSeed}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
