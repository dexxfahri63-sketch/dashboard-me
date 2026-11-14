import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  LayoutDashboard,
  Loader2,
  Menu,
  Plus,
  Target,
  WalletCards,
  X,
} from 'lucide-react';
import { CashflowCharts } from './components/CashflowCharts';
import { DateFilterBar } from './components/DateFilterBar';
import { HiddenAdminModal } from './components/HiddenAdminModal';
import { KpiGrid } from './components/KpiGrid';
import { TransactionModal } from './components/TransactionModal';
import { TransactionsTable } from './components/TransactionsTable';
import { WalletsBudgetsPanel } from './components/WalletsBudgetsPanel';
import { WishlistTradingView } from './components/WishlistTradingView';
import {
  DEFAULT_APP_SETTINGS,
  SEED_BUDGETS,
  SEED_WALLETS,
  SEED_WISHLIST,
  createSeedTransactions,
} from './data/seedData';
import { firebaseConfig } from './firebase';
import {
  clearAllFirestoreDocs,
  deleteTransactionDoc,
  deleteWalletDoc,
  deleteWishlistDoc,
  initAndSubscribeFirestore,
  saveBudgetDoc,
  saveSettingsDoc,
  saveTransactionDoc,
  saveWalletDoc,
  saveWishlistDoc,
  seedAllToFirestore,
  testFirestoreConnection,
} from './services/firebaseService';
import type {
  ActiveTab,
  AppFinanceState,
  AppSettings,
  BudgetLimit,
  DateFilterPreset,
  DateRangeFilter,
  FirebaseConnectionState,
  Transaction,
  Wallet,
  WishlistItem,
} from './types/finance';
import {
  applyWishlistFundMutation,
  buildCashflowSeries,
  buildExpenseDonutData,
  calculateBudgetStatuses,
  calculateKpiSummary,
  calculateWalletBalances,
  filterTransactionsByDateRange,
  formatIDR,
  getDateRangeBounds,
  syncWishlistOnTransactionChange,
  toISODate,
  type WishlistFundAction,
} from './utils/financeEngine';
import { fetchAllFromGas, postGasAction } from './utils/gasApi';

const STORAGE_KEY = 'dexx_finance_state_v2';

// Clean primary navigation — GAS & Admin controls are strictly inside Hidden Admin Console
const NAV_ITEMS: { id: ActiveTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
  { id: 'wallets-budgets', label: 'Dompet & Anggaran', icon: WalletCards },
  { id: 'wishlist-trading', label: 'Wishlist & Trading', icon: Target },
];

const PRESET_LABELS: Record<DateFilterPreset, string> = {
  today: 'Hari Ini',
  week: 'Minggu Ini',
  month: 'Bulan Ini',
  year: 'Tahun Ini',
  custom: 'Periode Kustom',
};

function createInitialState(): AppFinanceState {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AppFinanceState>;
        if (
          Array.isArray(parsed.wallets) &&
          Array.isArray(parsed.transactions) &&
          Array.isArray(parsed.budgets) &&
          Array.isArray(parsed.wishlist)
        ) {
          return {
            wallets: parsed.wallets,
            transactions: parsed.transactions,
            budgets: parsed.budgets,
            wishlist: parsed.wishlist,
            gasConfig: parsed.gasConfig || {
              webAppUrl: '',
              lastSyncedAt: null,
              syncStatus: 'idle',
            },
            settings: parsed.settings || DEFAULT_APP_SETTINGS,
          };
        }
      }
    } catch {
      // Fall back to deterministic seed state
    }
  }

  return {
    wallets: SEED_WALLETS,
    transactions: createSeedTransactions(new Date()),
    budgets: SEED_BUDGETS,
    wishlist: SEED_WISHLIST,
    gasConfig: {
      webAppUrl: '',
      lastSyncedAt: null,
      syncStatus: 'idle',
    },
    settings: DEFAULT_APP_SETTINGS,
  };
}

export default function App() {
  const [state, setState] = useState<AppFinanceState>(createInitialState);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [firebaseState, setFirebaseState] = useState<FirebaseConnectionState>({
    status: 'connecting',
    projectId: firebaseConfig.projectId,
    lastSyncAt: null,
  });
  const [reconnectTick, setReconnectTick] = useState(0);

  const [dateRange, setDateRange] = useState<DateRangeFilter>(() =>
    getDateRangeBounds('month', undefined, undefined, new Date())
  );

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'err' } | null>(
    null
  );

  // Secret 3-click logo counter
  const logoClickRef = useRef<{ count: number; lastTs: number }>({
    count: 0,
    lastTs: 0,
  });

  const handleSecretLogoClick = () => {
    const now = Date.now();
    if (now - logoClickRef.current.lastTs > 1500) {
      logoClickRef.current = { count: 1, lastTs: now };
    } else {
      logoClickRef.current = {
        count: logoClickRef.current.count + 1,
        lastTs: now,
      };
    }
    if (logoClickRef.current.count >= 3) {
      logoClickRef.current = { count: 0, lastTs: 0 };
      setAdminModalOpen(true);
    }
  };

  // Secret keyboard shortcut: Ctrl+Shift+D or Alt+Shift+A
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrlShiftD = e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd';
      const isAltShiftA = e.altKey && e.shiftKey && e.key.toLowerCase() === 'a';
      if (isCtrlShiftD || isAltShiftA) {
        e.preventDefault();
        setAdminModalOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Persist local mirror cache
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  // Bootstrap & real-time Firestore subscription
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    const bootFirestore = async () => {
      const seedPayload = {
        wallets: SEED_WALLETS,
        transactions: createSeedTransactions(new Date()),
        budgets: SEED_BUDGETS,
        wishlist: SEED_WISHLIST,
        settings: DEFAULT_APP_SETTINGS,
      };

      const unsub = await initAndSubscribeFirestore(seedPayload, {
        onWallets: (wallets) => {
          if (active) setState((prev) => ({ ...prev, wallets }));
        },
        onTransactions: (transactions) => {
          if (active) setState((prev) => ({ ...prev, transactions }));
        },
        onBudgets: (budgets) => {
          if (active) setState((prev) => ({ ...prev, budgets }));
        },
        onWishlist: (wishlist) => {
          if (active) setState((prev) => ({ ...prev, wishlist }));
        },
        onSettings: (settings) => {
          if (active) setState((prev) => ({ ...prev, settings }));
        },
        onConnectionChange: (conn) => {
          if (active) {
            setFirebaseState(conn);
            setIsInitialLoading(false);
          }
        },
      });

      if (active) {
        unsubscribe = unsub;
        setIsInitialLoading(false);
      } else {
        unsub();
      }
    };

    bootFirestore();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [reconnectTick]);

  const showNotice = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    setNotice({ text, tone });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  const runFirestoreSafe = useCallback(
    async (op: () => Promise<void>) => {
      try {
        await op();
        setFirebaseState((prev) => ({
          ...prev,
          status: 'connected',
          lastSyncAt: new Date().toISOString(),
          errorDetail: undefined,
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setFirebaseState((prev) => ({
          ...prev,
          status: 'local-fallback',
          errorDetail: msg,
        }));
      }
    },
    []
  );

  // Optional hidden GAS mirror helper
  const syncMutationToGas = useCallback(
    async (action: string, payload: unknown) => {
      const url = state.gasConfig.webAppUrl;
      if (!url) return;
      try {
        await postGasAction(url, action, payload);
      } catch {
        // Optional GAS mirror errors handled in Hidden Admin
      }
    },
    [state.gasConfig.webAppUrl]
  );

  // Derived calculations
  const walletsWithBalance = useMemo(
    () => calculateWalletBalances(state.wallets, state.transactions),
    [state.wallets, state.transactions]
  );

  const filteredTransactions = useMemo(
    () => filterTransactionsByDateRange(state.transactions, dateRange),
    [state.transactions, dateRange]
  );

  const kpi = useMemo(
    () =>
      calculateKpiSummary(
        walletsWithBalance,
        filteredTransactions,
        state.wishlist
      ),
    [walletsWithBalance, filteredTransactions, state.wishlist]
  );

  const cashflowSeries = useMemo(
    () => buildCashflowSeries(filteredTransactions, dateRange),
    [filteredTransactions, dateRange]
  );

  const expenseSlices = useMemo(
    () => buildExpenseDonutData(filteredTransactions),
    [filteredTransactions]
  );

  const activeMonthPrefix = useMemo(
    () => dateRange.endDate.slice(0, 7),
    [dateRange.endDate]
  );

  const activeMonthLabel = useMemo(() => {
    const [y, m] = activeMonthPrefix.split('-').map(Number);
    if (!y || !m) return 'Bulan Aktif';
    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(y, m - 1, 1));
  }, [activeMonthPrefix]);

  const budgetStatuses = useMemo(
    () =>
      calculateBudgetStatuses(state.budgets, state.transactions, activeMonthPrefix),
    [state.budgets, state.transactions, activeMonthPrefix]
  );

  // Date range handlers
  const handlePresetChange = (preset: DateFilterPreset) => {
    if (preset === 'custom') {
      setDateRange((prev) =>
        getDateRangeBounds('custom', prev.startDate, prev.endDate, new Date())
      );
    } else {
      setDateRange(getDateRangeBounds(preset, undefined, undefined, new Date()));
    }
  };

  const handleCustomDateChange = (startDate: string, endDate: string) => {
    setDateRange(getDateRangeBounds('custom', startDate, endDate, new Date()));
  };

  // CRUD handlers (Optimistic UI + Async Firestore)
  const handleSaveTransaction = (tx: Transaction) => {
    const prevTx = state.transactions.find((item) => item.id === tx.id) || null;
    const { changedItems } = syncWishlistOnTransactionChange(
      state.wishlist,
      prevTx,
      tx
    );

    setState((prev) => {
      const exists = prev.transactions.some((item) => item.id === tx.id);
      const nextTransactions = exists
        ? prev.transactions.map((item) => (item.id === tx.id ? tx : item))
        : [tx, ...prev.transactions];
      const { nextWishlist } = syncWishlistOnTransactionChange(
        prev.wishlist,
        prevTx,
        tx
      );
      return {
        ...prev,
        transactions: nextTransactions,
        wishlist: nextWishlist,
      };
    });

    runFirestoreSafe(async () => {
      await saveTransactionDoc(tx);
      for (const wl of changedItems) {
        await saveWishlistDoc(wl);
      }
    });
    syncMutationToGas('upsertTransaction', tx);
    for (const wl of changedItems) {
      syncMutationToGas('upsertWishlist', wl);
    }
    showNotice(
      changedItems.length > 0
        ? 'Transaksi disimpan & target wishlist disinkronkan.'
        : 'Transaksi berhasil disimpan.'
    );
  };

  const handleDeleteTransaction = (txId: string) => {
    const prevTx = state.transactions.find((t) => t.id === txId) || null;
    const { changedItems } = syncWishlistOnTransactionChange(
      state.wishlist,
      prevTx,
      null
    );

    setState((prev) => {
      const { nextWishlist } = syncWishlistOnTransactionChange(
        prev.wishlist,
        prevTx,
        null
      );
      return {
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== txId),
        wishlist: nextWishlist,
      };
    });

    runFirestoreSafe(async () => {
      await deleteTransactionDoc(txId);
      for (const wl of changedItems) {
        await saveWishlistDoc(wl);
      }
    });
    syncMutationToGas('deleteTransaction', { id: txId });
    for (const wl of changedItems) {
      syncMutationToGas('upsertWishlist', wl);
    }
    showNotice(
      changedItems.length > 0
        ? 'Transaksi dihapus & saldo wishlist disinkronkan kembali.'
        : 'Transaksi dihapus.'
    );
  };

  const handleSaveWallet = (wallet: Wallet) => {
    setState((prev) => {
      const exists = prev.wallets.some((w) => w.id === wallet.id);
      const nextWallets = exists
        ? prev.wallets.map((w) => (w.id === wallet.id ? wallet : w))
        : [...prev.wallets, wallet];
      return { ...prev, wallets: nextWallets };
    });
    runFirestoreSafe(() => saveWalletDoc(wallet));
    syncMutationToGas('upsertWallet', wallet);
    showNotice(`Dompet "${wallet.name}" diperbarui.`);
  };

  const handleDeleteWallet = (walletId: string) => {
    setState((prev) => ({
      ...prev,
      wallets: prev.wallets.filter((w) => w.id !== walletId),
    }));
    runFirestoreSafe(() => deleteWalletDoc(walletId));
    syncMutationToGas('deleteWallet', { id: walletId });
    showNotice('Dompet dihapus.');
  };

  const handleSaveBudget = (budget: BudgetLimit) => {
    setState((prev) => {
      const exists = prev.budgets.some((b) => b.category === budget.category);
      const nextBudgets = exists
        ? prev.budgets.map((b) => (b.category === budget.category ? budget : b))
        : [...prev.budgets, budget];
      return { ...prev, budgets: nextBudgets };
    });
    runFirestoreSafe(() => saveBudgetDoc(budget));
    syncMutationToGas('upsertBudget', budget);
    showNotice(`Batas anggaran ${budget.category} disimpan.`);
  };

  const handleSaveWishlist = (item: WishlistItem) => {
    setState((prev) => {
      const exists = prev.wishlist.some((w) => w.id === item.id);
      const nextWishlist = exists
        ? prev.wishlist.map((w) => (w.id === item.id ? item : w))
        : [...prev.wishlist, item];
      return { ...prev, wishlist: nextWishlist };
    });
    runFirestoreSafe(() => saveWishlistDoc(item));
    syncMutationToGas('upsertWishlist', item);
    showNotice(`Target "${item.title}" diperbarui.`);
  };

  const handleAdjustWishlistFund = (
    item: WishlistItem,
    amount: number,
    action: WishlistFundAction,
    walletId: string,
    syncWithWallet: boolean
  ) => {
    const { updatedItem, appliedDelta, syncedTransaction } =
      applyWishlistFundMutation({
        item,
        rawAmount: amount,
        action,
        walletId,
        syncWithWallet,
      });

    if (appliedDelta <= 0) {
      showNotice(
        action === 'deposit'
          ? `Target "${item.title}" sudah mencapai batas dana.`
          : `Saldo terkumpul "${item.title}" sudah Rp 0.`,
        'err'
      );
      return;
    }

    setState((prev) => ({
      ...prev,
      wishlist: prev.wishlist.map((w) => (w.id === item.id ? updatedItem : w)),
      transactions: syncedTransaction
        ? [syncedTransaction, ...prev.transactions]
        : prev.transactions,
    }));

    runFirestoreSafe(async () => {
      await saveWishlistDoc(updatedItem);
      if (syncedTransaction) {
        await saveTransactionDoc(syncedTransaction);
      }
    });

    syncMutationToGas('upsertWishlist', updatedItem);
    if (syncedTransaction) {
      syncMutationToGas('upsertTransaction', syncedTransaction);
    }

    const walletName =
      state.wallets.find((w) => w.id === walletId)?.name || 'Dompet';
    if (action === 'deposit') {
      showNotice(
        syncedTransaction
          ? `Tabungan "${item.title}" ditambah ${formatIDR(appliedDelta)} & disinkronkan dari ${walletName}.`
          : `Tabungan "${item.title}" ditambah ${formatIDR(appliedDelta)}.`
      );
    } else {
      showNotice(
        syncedTransaction
          ? `Tabungan "${item.title}" dikurangi ${formatIDR(appliedDelta)} & dikembalikan ke ${walletName}.`
          : `Tabungan "${item.title}" dikurangi ${formatIDR(appliedDelta)}.`
      );
    }
  };

  const handleDeleteWishlist = (id: string) => {
    setState((prev) => ({
      ...prev,
      wishlist: prev.wishlist.filter((w) => w.id !== id),
    }));
    runFirestoreSafe(() => deleteWishlistDoc(id));
    syncMutationToGas('deleteWishlist', { id });
    showNotice('Target wishlist dihapus.');
  };

  const handleUpdateSettings = (nextSettings: AppSettings) => {
    setState((prev) => ({ ...prev, settings: nextSettings }));
    runFirestoreSafe(() => saveSettingsDoc(nextSettings));
    showNotice('Konfigurasi aplikasi disimpan.');
  };

  const handleToggleNumberMode = () => {
    const nextMode = state.settings.numberMode === 'smart' ? 'full' : 'smart';
    handleUpdateSettings({ ...state.settings, numberMode: nextMode });
  };

  // Hidden Admin Demo & Pitching Tools
  const handleSeedDemoData = async () => {
    const seedPayload = {
      wallets: SEED_WALLETS,
      transactions: createSeedTransactions(new Date()),
      budgets: SEED_BUDGETS,
      wishlist: SEED_WISHLIST,
      settings: state.settings,
    };
    setState((prev) => ({ ...prev, ...seedPayload }));
    await runFirestoreSafe(() => seedAllToFirestore(seedPayload));
    showNotice('Dummy data klien berhasil dimuat.');
  };

  const handleSimulateOverBudget = async () => {
    const spikeTx: Transaction = {
      id: `tx-demo-${Date.now()}`,
      date: toISODate(new Date()),
      type: 'expense',
      category: 'Makanan',
      description: 'Simulasi Jamuan Klien (Over-Budget Demo)',
      amount: 1750000,
      walletId: state.wallets[0]?.id || 'w-bca',
      createdAt: new Date().toISOString(),
    };
    handleSaveTransaction(spikeTx);
  };

  const handleClearAllData = async () => {
    const fallbackWallet: Wallet = state.wallets[0] || {
      id: 'w-main',
      name: 'Rekening Utama',
      type: 'bank',
      initialBalance: 0,
    };
    setState((prev) => ({
      ...prev,
      wallets: [fallbackWallet],
      transactions: [],
      budgets: [],
      wishlist: [],
    }));
    await runFirestoreSafe(async () => {
      await clearAllFirestoreDocs();
      await saveWalletDoc(fallbackWallet);
    });
    showNotice('Seluruh data dikosongkan untuk demo.');
  };

  const handleTestFirebase = async () => {
    setFirebaseState((prev) => ({
      ...prev,
      status: 'connecting',
    }));
    const res = await testFirestoreConnection();
    if (res.ok) {
      setFirebaseState({
        status: 'connected',
        projectId: firebaseConfig.projectId,
        lastSyncAt: new Date().toISOString(),
        errorDetail: undefined,
      });
      setReconnectTick((n) => n + 1);
      showNotice('Koneksi Firebase Firestore aktif & tersinkron!');
    } else {
      setFirebaseState({
        status: 'local-fallback',
        projectId: firebaseConfig.projectId,
        lastSyncAt: null,
        errorDetail: res.error,
      });
      showNotice('Firestore masih memblokir akses atau belum siap.', 'err');
    }
  };

  // Hidden GAS handlers
  const handleUpdateGasUrl = (url: string) => {
    setState((prev) => ({
      ...prev,
      gasConfig: {
        ...prev.gasConfig,
        webAppUrl: url,
        syncStatus: url ? 'connected' : 'idle',
        lastError: undefined,
      },
    }));
    showNotice(url ? 'URL Google Apps Script disimpan.' : 'URL GAS dikosongkan.');
  };

  const handlePullFromGas = async () => {
    if (!state.gasConfig.webAppUrl) return;
    setState((prev) => ({
      ...prev,
      gasConfig: { ...prev.gasConfig, syncStatus: 'syncing', lastError: undefined },
    }));
    try {
      const data = await fetchAllFromGas(state.gasConfig.webAppUrl);
      setState((prev) => ({
        ...prev,
        wallets: data.wallets.length > 0 ? data.wallets : prev.wallets,
        transactions: data.transactions,
        budgets: data.budgets.length > 0 ? data.budgets : prev.budgets,
        wishlist: data.wishlist,
        gasConfig: {
          ...prev.gasConfig,
          syncStatus: 'connected',
          lastSyncedAt: new Date().toISOString(),
        },
      }));
      showNotice('Data ditarik dari Google Sheets.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menarik data GAS';
      setState((prev) => ({
        ...prev,
        gasConfig: { ...prev.gasConfig, syncStatus: 'error', lastError: msg },
      }));
      showNotice(msg, 'err');
    }
  };

  const handlePushAllToGas = async () => {
    if (!state.gasConfig.webAppUrl) return;
    setState((prev) => ({
      ...prev,
      gasConfig: { ...prev.gasConfig, syncStatus: 'syncing', lastError: undefined },
    }));
    try {
      await postGasAction(state.gasConfig.webAppUrl, 'syncAll', {
        wallets: state.wallets,
        transactions: state.transactions,
        budgets: state.budgets,
        wishlist: state.wishlist,
      });
      setState((prev) => ({
        ...prev,
        gasConfig: {
          ...prev.gasConfig,
          syncStatus: 'connected',
          lastSyncedAt: new Date().toISOString(),
        },
      }));
      showNotice('Seluruh data dikirim ke Google Sheets.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim data ke GAS';
      setState((prev) => ({
        ...prev,
        gasConfig: { ...prev.gasConfig, syncStatus: 'error', lastError: msg },
      }));
      showNotice(msg, 'err');
    }
  };

  const activeNavTitle =
    NAV_ITEMS.find((item) => item.id === activeTab)?.label || 'Ringkasan';
  const periodLabel = PRESET_LABELS[dateRange.preset];

  return (
    <div className="flex min-h-screen bg-[#090D16] text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800/80 bg-[#0B101B] lg:flex">
        <div className="flex h-16 items-center border-b border-slate-800/80 px-6">
          <button
            type="button"
            onClick={handleSecretLogoClick}
            className="font-display text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap text-left select-none focus:outline-none"
          >
            {state.settings.workspaceName}
          </button>
        </div>

        <nav aria-label="Navigasi Utama" className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors duration-100 whitespace-nowrap ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800/80 px-6 py-4">
          <p className="text-xs font-medium text-slate-300">
            {state.settings.ownerLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {firebaseState.status === 'connected'
              ? 'Tersinkron ke Firebase Cloud'
              : 'Mode Penyimpanan Lokal'}
          </p>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-64 flex-col border-r border-slate-800 bg-[#0B101B]">
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
              <button
                type="button"
                onClick={handleSecretLogoClick}
                className="font-display text-base font-bold text-slate-50 whitespace-nowrap select-none"
              >
                {state.settings.workspaceName}
              </button>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Tutup menu navigasi"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Navigasi Mobile" className="flex-1 space-y-1 p-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract: Single Row, Breadcrumb Left + 1 Primary Action Right */}
        <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-800/80 bg-[#0B101B]/90 px-4 sm:gap-8 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Buka menu navigasi"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 lg:hidden shrink-0"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                onClick={handleSecretLogoClick}
                className="font-display font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 lg:hidden select-none"
              >
                {state.settings.workspaceName}
              </button>
              <span className="hidden text-slate-600 sm:inline lg:hidden" aria-hidden="true">
                /
              </span>
              <h1 className="hidden font-display text-base font-semibold text-slate-100 truncate sm:block">
                {activeNavTitle}
              </h1>
              {isInitialLoading && (
                <Loader2
                  className="h-4 w-4 animate-spin text-emerald-400 shrink-0"
                  aria-label="Memuat data Firebase"
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setTxModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:gap-2 sm:px-4"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Catat Transaksi</span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-6 p-4 sm:p-6">
          {notice && (
            <div
              role="status"
              className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${
                notice.tone === 'err'
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              {notice.text}
            </div>
          )}

          {activeTab !== 'wishlist-trading' && (
            <DateFilterBar
              dateRange={dateRange}
              onPresetChange={handlePresetChange}
              onCustomChange={handleCustomDateChange}
              filteredCount={filteredTransactions.length}
              numberMode={state.settings.numberMode}
              onToggleNumberMode={handleToggleNumberMode}
            />
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <KpiGrid
                kpi={kpi}
                walletCount={walletsWithBalance.length}
                periodLabel={periodLabel}
                numberMode={state.settings.numberMode}
              />

              <CashflowCharts
                cashflowSeries={cashflowSeries}
                expenseSlices={expenseSlices}
                periodLabel={periodLabel}
              />

              <WalletsBudgetsPanel
                wallets={walletsWithBalance}
                budgets={budgetStatuses}
                budgetLimits={state.budgets}
                monthLabel={activeMonthLabel}
                numberMode={state.settings.numberMode}
                onSaveWallet={handleSaveWallet}
                onDeleteWallet={handleDeleteWallet}
                onSaveBudget={handleSaveBudget}
                compact
              />

              <WishlistTradingView
                wishlist={state.wishlist}
                wallets={walletsWithBalance}
                transactions={filteredTransactions}
                numberMode={state.settings.numberMode}
                onSaveWishlist={handleSaveWishlist}
                onAdjustWishlistFund={handleAdjustWishlistFund}
                onDeleteWishlist={handleDeleteWishlist}
                compact
              />

              <TransactionsTable
                transactions={filteredTransactions}
                wallets={state.wallets}
                onEdit={(tx) => {
                  setEditingTx(tx);
                  setTxModalOpen(true);
                }}
                onDelete={handleDeleteTransaction}
                onCreateNew={() => {
                  setEditingTx(null);
                  setTxModalOpen(true);
                }}
                limitRows={8}
                onViewAll={() => setActiveTab('transactions')}
              />
            </div>
          )}

          {activeTab === 'transactions' && (
            <TransactionsTable
              transactions={filteredTransactions}
              wallets={state.wallets}
              onEdit={(tx) => {
                setEditingTx(tx);
                setTxModalOpen(true);
              }}
              onDelete={handleDeleteTransaction}
              onCreateNew={() => {
                setEditingTx(null);
                setTxModalOpen(true);
              }}
            />
          )}

          {activeTab === 'wallets-budgets' && (
            <WalletsBudgetsPanel
              wallets={walletsWithBalance}
              budgets={budgetStatuses}
              budgetLimits={state.budgets}
              monthLabel={activeMonthLabel}
              numberMode={state.settings.numberMode}
              onSaveWallet={handleSaveWallet}
              onDeleteWallet={handleDeleteWallet}
              onSaveBudget={handleSaveBudget}
            />
          )}

          {activeTab === 'wishlist-trading' && (
            <WishlistTradingView
              wishlist={state.wishlist}
              wallets={walletsWithBalance}
              transactions={state.transactions}
              numberMode={state.settings.numberMode}
              onSaveWishlist={handleSaveWishlist}
              onAdjustWishlistFund={handleAdjustWishlistFund}
              onDeleteWishlist={handleDeleteWishlist}
            />
          )}
        </main>
      </div>

      <TransactionModal
        isOpen={txModalOpen}
        editingTransaction={editingTx}
        wallets={walletsWithBalance}
        wishlist={state.wishlist}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
      />

      <HiddenAdminModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        settings={state.settings}
        firebaseState={firebaseState}
        wallets={state.wallets}
        transactions={state.transactions}
        budgets={state.budgets}
        wishlist={state.wishlist}
        gasConfig={state.gasConfig}
        onUpdateSettings={handleUpdateSettings}
        onSeedDemoData={handleSeedDemoData}
        onSimulateOverBudget={handleSimulateOverBudget}
        onClearAllData={handleClearAllData}
        onTestFirebase={handleTestFirebase}
        onDeleteTransaction={handleDeleteTransaction}
        onDeleteWallet={handleDeleteWallet}
        onDeleteWishlist={handleDeleteWishlist}
        onOpenNewTxModal={() => {
          setEditingTx(null);
          setTxModalOpen(true);
        }}
        onUpdateGasUrl={handleUpdateGasUrl}
        onPullFromGas={handlePullFromGas}
        onPushAllToGas={handlePushAllToGas}
        onResetSeed={() => {
          handleSeedDemoData();
        }}
      />
    </div>
  );
}
