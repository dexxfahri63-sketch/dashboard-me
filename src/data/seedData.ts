import type {
  AppSettings,
  BudgetLimit,
  Transaction,
  Wallet,
  WishlistItem,
} from '../types/finance';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  workspaceName: 'DEXX FINANCE',
  ownerLabel: 'Personal Wealth',
  adminPin: '1234',
  numberMode: 'smart',
};

export const SEED_WALLETS: Wallet[] = [
  {
    id: 'w-bca',
    name: 'BCA Utama',
    type: 'bank',
    initialBalance: 42000000,
    institution: 'Bank Central Asia',
    accountNumber: '8821',
  },
  {
    id: 'w-ewallet',
    name: 'GoPay & OVO',
    type: 'ewallet',
    initialBalance: 9500000,
    institution: 'Dompet Digital',
    accountNumber: '0812',
  },
  {
    id: 'w-cash',
    name: 'Kas Tunai',
    type: 'cash',
    initialBalance: 2250000,
    institution: 'Brankas & Dompet',
  },
  {
    id: 'w-trading',
    name: 'Akun Trading',
    type: 'trading',
    initialBalance: 35000000,
    institution: 'Stockbit & Bibit',
    accountNumber: 'RDN-409',
  },
];

export const SEED_BUDGETS: BudgetLimit[] = [
  { id: 'b-makanan', category: 'Makanan', limitAmount: 3500000 },
  { id: 'b-transport', category: 'Transportasi', limitAmount: 1800000 },
  { id: 'b-hiburan', category: 'Hiburan', limitAmount: 1200000 },
  { id: 'b-tagihan', category: 'Tagihan & Utilitas', limitAmount: 2500000 },
  { id: 'b-trading', category: 'Trading', limitAmount: 5000000 },
  { id: 'b-belanja', category: 'Belanja', limitAmount: 2000000 },
];

export const SEED_WISHLIST: WishlistItem[] = [
  {
    id: 'wish-kereta',
    title: 'Kereta (Kendaraan Impian)',
    category: 'Otomotif',
    targetAmount: 120000000,
    currentAmount: 74500000,
    targetDate: '2027-06-30',
    walletId: 'w-bca',
    notes: 'Alokasi tabungan rutin bulanan + sebagian profit trading.',
  },
  {
    id: 'wish-darurat',
    title: 'Dana Darurat 6 Bulan',
    category: 'Proteksi',
    targetAmount: 60000000,
    currentAmount: 51000000,
    targetDate: '2027-01-31',
    walletId: 'w-bca',
    notes: 'Buffer likuid di rekening BCA Utama & Reksadana Pasar Uang.',
  },
  {
    id: 'wish-workstation',
    title: 'MacBook Pro M4 Workstation',
    category: 'Produktivitas',
    targetAmount: 32000000,
    currentAmount: 22400000,
    targetDate: '2027-03-15',
    walletId: 'w-trading',
    notes: 'Target upgrade perangkat kerja Q1 tahun depan.',
  },
];

export function createSeedTransactions(referenceDate: Date = new Date()): Transaction[] {
  const y = referenceDate.getFullYear();
  const m = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const todayDay = referenceDate.getDate();

  const fmt = (year: number, monthNum: number, dayNum: number) => {
    const safeDay = Math.max(1, Math.min(28, dayNum));
    return `${year}-${String(monthNum).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  };

  const currentMonth = referenceDate.getMonth() + 1;
  const prevMonth1 = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear1 = currentMonth === 1 ? y - 1 : y;
  const prevMonth2 = prevMonth1 === 1 ? 12 : prevMonth1 - 1;
  const prevYear2 = prevMonth1 === 1 ? prevYear1 - 1 : prevYear1;
  const prevMonth3 = prevMonth2 === 1 ? 12 : prevMonth2 - 1;
  const prevYear3 = prevMonth2 === 1 ? prevYear2 - 1 : prevYear2;

  const todayISO = `${y}-${m}-${String(todayDay).padStart(2, '0')}`;
  const dMinus1 = new Date(referenceDate);
  dMinus1.setDate(todayDay - 1);
  const yesterdayISO = `${dMinus1.getFullYear()}-${String(dMinus1.getMonth() + 1).padStart(2, '0')}-${String(dMinus1.getDate()).padStart(2, '0')}`;

  const dMinus2 = new Date(referenceDate);
  dMinus2.setDate(todayDay - 2);
  const twoDaysAgoISO = `${dMinus2.getFullYear()}-${String(dMinus2.getMonth() + 1).padStart(2, '0')}-${String(dMinus2.getDate()).padStart(2, '0')}`;

  const dMinus4 = new Date(referenceDate);
  dMinus4.setDate(todayDay - 4);
  const fourDaysAgoISO = `${dMinus4.getFullYear()}-${String(dMinus4.getMonth() + 1).padStart(2, '0')}-${String(dMinus4.getDate()).padStart(2, '0')}`;

  return [
    {
      id: 'tx-101',
      date: todayISO,
      type: 'expense',
      category: 'Makanan',
      description: 'Makan siang tim & kopi specialty',
      amount: 185000,
      walletId: 'w-ewallet',
      createdAt: `${todayISO}T12:30:00Z`,
    },
    {
      id: 'tx-102',
      date: todayISO,
      type: 'income',
      category: 'Profit Trading',
      description: 'Realisasi profit swing BBCA & TLKM',
      amount: 2450000,
      walletId: 'w-trading',
      createdAt: `${todayISO}T10:15:00Z`,
    },
    {
      id: 'tx-103',
      date: yesterdayISO,
      type: 'expense',
      category: 'Transportasi',
      description: 'Isi BBM Pertamax & tol dalam kota',
      amount: 320000,
      walletId: 'w-ewallet',
      createdAt: `${yesterdayISO}T18:40:00Z`,
    },
    {
      id: 'tx-104',
      date: yesterdayISO,
      type: 'expense',
      category: 'Hiburan',
      description: 'Langganan streaming, konser akustik & bioskop',
      amount: 1350000,
      walletId: 'w-bca',
      createdAt: `${yesterdayISO}T20:00:00Z`,
    },
    {
      id: 'tx-105',
      date: twoDaysAgoISO,
      type: 'transfer',
      category: 'Top Up E-Wallet',
      description: 'Top up saldo operasional GoPay & OVO',
      amount: 2000000,
      walletId: 'w-bca',
      toWalletId: 'w-ewallet',
      createdAt: `${twoDaysAgoISO}T09:10:00Z`,
    },
    {
      id: 'tx-106',
      date: fourDaysAgoISO,
      type: 'expense',
      category: 'Makanan',
      description: 'Belanja bahan makanan segar & dapur mingguan',
      amount: 1480000,
      walletId: 'w-bca',
      createdAt: `${fourDaysAgoISO}T16:20:00Z`,
    },
    {
      id: 'tx-107',
      date: fmt(y, currentMonth, 1),
      type: 'income',
      category: 'Gaji & Bonus',
      description: 'Gaji bulanan Senior Engineering',
      amount: 24500000,
      walletId: 'w-bca',
      createdAt: `${fmt(y, currentMonth, 1)}T08:00:00Z`,
    },
    {
      id: 'tx-108',
      date: fmt(y, currentMonth, 2),
      type: 'expense',
      category: 'Tagihan & Utilitas',
      description: 'Listrik PLN, Fiber Internet & Air',
      amount: 1650000,
      walletId: 'w-bca',
      createdAt: `${fmt(y, currentMonth, 2)}T11:00:00Z`,
    },
    {
      id: 'tx-109',
      date: fmt(y, currentMonth, 3),
      type: 'transfer',
      category: 'Setor Modal Trading',
      description: 'Alokasi modal rutin portofolio RDN',
      amount: 5000000,
      walletId: 'w-bca',
      toWalletId: 'w-trading',
      createdAt: `${fmt(y, currentMonth, 3)}T14:00:00Z`,
    },
    {
      id: 'tx-110',
      date: fmt(y, currentMonth, 4),
      type: 'expense',
      category: 'Makanan',
      description: 'Restoran keluarga & kebutuhan pantry',
      amount: 1120000,
      walletId: 'w-cash',
      createdAt: `${fmt(y, currentMonth, 4)}T19:30:00Z`,
    },
    {
      id: 'tx-111',
      date: fmt(y, currentMonth, 5),
      type: 'expense',
      category: 'Transportasi',
      description: 'Servis berkala & parkir bulanan',
      amount: 490000,
      walletId: 'w-cash',
      createdAt: `${fmt(y, currentMonth, 5)}T13:15:00Z`,
    },
    {
      id: 'tx-112',
      date: fmt(y, currentMonth, 6),
      type: 'expense',
      category: 'Trading',
      description: 'Biaya riset data terminal & alokasi risiko',
      amount: 1200000,
      walletId: 'w-trading',
      createdAt: `${fmt(y, currentMonth, 6)}T15:45:00Z`,
    },
    {
      id: 'tx-113',
      date: fmt(y, currentMonth, 7),
      type: 'income',
      category: 'Freelance & Bisnis',
      description: 'Konsultasi arsitektur sistem cloud',
      amount: 6800000,
      walletId: 'w-bca',
      createdAt: `${fmt(y, currentMonth, 7)}T17:00:00Z`,
    },
    {
      id: 'tx-114',
      date: fmt(y, currentMonth, 8),
      type: 'expense',
      category: 'Belanja',
      description: 'Perlengkapan kerja ergonomis & buku teknis',
      amount: 1450000,
      walletId: 'w-ewallet',
      createdAt: `${fmt(y, currentMonth, 8)}T10:00:00Z`,
    },
    // Previous months for Year-to-date trend richness
    {
      id: 'tx-201',
      date: fmt(prevYear1, prevMonth1, 1),
      type: 'income',
      category: 'Gaji & Bonus',
      description: 'Gaji bulanan periode sebelumnya',
      amount: 24500000,
      walletId: 'w-bca',
      createdAt: `${fmt(prevYear1, prevMonth1, 1)}T08:00:00Z`,
    },
    {
      id: 'tx-202',
      date: fmt(prevYear1, prevMonth1, 12),
      type: 'expense',
      category: 'Makanan',
      description: 'Pengeluaran konsumsi bulanan',
      amount: 3100000,
      walletId: 'w-ewallet',
      createdAt: `${fmt(prevYear1, prevMonth1, 12)}T12:00:00Z`,
    },
    {
      id: 'tx-203',
      date: fmt(prevYear1, prevMonth1, 18),
      type: 'expense',
      category: 'Tagihan & Utilitas',
      description: 'Utilitas & asuransi kesehatan',
      amount: 2400000,
      walletId: 'w-bca',
      createdAt: `${fmt(prevYear1, prevMonth1, 18)}T14:00:00Z`,
    },
    {
      id: 'tx-204',
      date: fmt(prevYear1, prevMonth1, 24),
      type: 'income',
      category: 'Profit Trading',
      description: 'Dividen & capital gain bulanan',
      amount: 3900000,
      walletId: 'w-trading',
      createdAt: `${fmt(prevYear1, prevMonth1, 24)}T16:00:00Z`,
    },
    {
      id: 'tx-205',
      date: fmt(prevYear2, prevMonth2, 1),
      type: 'income',
      category: 'Gaji & Bonus',
      description: 'Gaji & insentif proyek kuartalan',
      amount: 27000000,
      walletId: 'w-bca',
      createdAt: `${fmt(prevYear2, prevMonth2, 1)}T08:00:00Z`,
    },
    {
      id: 'tx-206',
      date: fmt(prevYear2, prevMonth2, 15),
      type: 'expense',
      category: 'Belanja',
      description: 'Perawatan kendaraan & elektronik',
      amount: 4200000,
      walletId: 'w-bca',
      createdAt: `${fmt(prevYear2, prevMonth2, 15)}T15:00:00Z`,
    },
    {
      id: 'tx-207',
      date: fmt(prevYear3, prevMonth3, 1),
      type: 'income',
      category: 'Gaji & Bonus',
      description: 'Gaji bulanan',
      amount: 24500000,
      walletId: 'w-bca',
      createdAt: `${fmt(prevYear3, prevMonth3, 1)}T08:00:00Z`,
    },
    {
      id: 'tx-208',
      date: fmt(prevYear3, prevMonth3, 20),
      type: 'expense',
      category: 'Makanan',
      description: 'Belanja kebutuhan pokok & kuliner',
      amount: 2950000,
      walletId: 'w-ewallet',
      createdAt: `${fmt(prevYear3, prevMonth3, 20)}T18:00:00Z`,
    },
  ];
}
