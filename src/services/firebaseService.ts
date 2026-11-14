import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { analyticsPromise, db, firebaseConfig, storage } from '../firebase';
import type {
  AppSettings,
  BudgetLimit,
  FirebaseConnectionState,
  Transaction,
  Wallet,
  WishlistItem,
} from '../types/finance';

export const COLLECTIONS = {
  WALLETS: 'dexx_wallets',
  TRANSACTIONS: 'dexx_transactions',
  BUDGETS: 'dexx_budgets',
  WISHLIST: 'dexx_wishlist',
  SETTINGS: 'dexx_settings',
} as const;

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) {
      delete out[key];
    }
  }
  return out;
}

export async function testFirestoreConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    void analyticsPromise;
    await Promise.race([
      getDocFromServer(doc(db, COLLECTIONS.SETTINGS, 'app')),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Koneksi Firestore timeout')), 4000)
      ),
    ]);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export interface FirebaseCallbacks {
  onWallets: (wallets: Wallet[]) => void;
  onTransactions: (transactions: Transaction[]) => void;
  onBudgets: (budgets: BudgetLimit[]) => void;
  onWishlist: (wishlist: WishlistItem[]) => void;
  onSettings: (settings: AppSettings) => void;
  onConnectionChange: (state: FirebaseConnectionState) => void;
}

export async function initAndSubscribeFirestore(
  seedPayload: {
    wallets: Wallet[];
    transactions: Transaction[];
    budgets: BudgetLimit[];
    wishlist: WishlistItem[];
    settings: AppSettings;
  },
  callbacks: FirebaseCallbacks
): Promise<() => void> {
  const unsubs: Unsubscribe[] = [];

  try {
    const walletSnap = await Promise.race([
      getDocs(collection(db, COLLECTIONS.WALLETS)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Koneksi Firestore timeout (mode fallback lokal aktif)')), 2500)
      ),
    ]);

    // Seed initial demo dataset if Firestore is completely empty on first launch
    if (walletSnap.empty) {
      await seedAllToFirestore(seedPayload);
    }

    const markConnected = () => {
      callbacks.onConnectionChange({
        status: 'connected',
        projectId: firebaseConfig.projectId,
        lastSyncAt: new Date().toISOString(),
      });
    };

    const handleSnapshotError = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      callbacks.onConnectionChange({
        status: 'local-fallback',
        projectId: firebaseConfig.projectId,
        lastSyncAt: null,
        errorDetail: msg,
      });
    };

    unsubs.push(
      onSnapshot(
        collection(db, COLLECTIONS.WALLETS),
        (snap) => {
          const items = snap.docs.map((d) => d.data() as Wallet);
          if (items.length > 0) callbacks.onWallets(items);
          markConnected();
        },
        handleSnapshotError
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, COLLECTIONS.TRANSACTIONS),
        (snap) => {
          const items = snap.docs.map((d) => d.data() as Transaction);
          callbacks.onTransactions(items);
          markConnected();
        },
        handleSnapshotError
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, COLLECTIONS.BUDGETS),
        (snap) => {
          const items = snap.docs.map((d) => d.data() as BudgetLimit);
          callbacks.onBudgets(items);
          markConnected();
        },
        handleSnapshotError
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, COLLECTIONS.WISHLIST),
        (snap) => {
          const items = snap.docs.map((d) => d.data() as WishlistItem);
          callbacks.onWishlist(items);
          markConnected();
        },
        handleSnapshotError
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, COLLECTIONS.SETTINGS, 'app'),
        (snap) => {
          if (snap.exists()) {
            callbacks.onSettings(snap.data() as AppSettings);
          }
          markConnected();
        },
        handleSnapshotError
      )
    );

    markConnected();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    callbacks.onConnectionChange({
      status: 'local-fallback',
      projectId: firebaseConfig.projectId,
      lastSyncAt: null,
      errorDetail: msg,
    });
  }

  return () => {
    for (const u of unsubs) u();
  };
}

export async function saveWalletDoc(wallet: Wallet): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.WALLETS, wallet.id), stripUndefined({ ...wallet }));
}

export async function deleteWalletDoc(walletId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.WALLETS, walletId));
}

export async function saveTransactionDoc(tx: Transaction): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.TRANSACTIONS, tx.id), stripUndefined({ ...tx }));
}

export async function deleteTransactionDoc(txId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.TRANSACTIONS, txId));
}

export async function saveBudgetDoc(budget: BudgetLimit): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.BUDGETS, budget.id), stripUndefined({ ...budget }));
}

export async function saveWishlistDoc(item: WishlistItem): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.WISHLIST, item.id), stripUndefined({ ...item }));
}

export async function deleteWishlistDoc(itemId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.WISHLIST, itemId));
}

export async function saveSettingsDoc(settings: AppSettings): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.SETTINGS, 'app'), stripUndefined({ ...settings }));
}

export async function clearAllFirestoreDocs(): Promise<void> {
  const targets = [
    COLLECTIONS.WALLETS,
    COLLECTIONS.TRANSACTIONS,
    COLLECTIONS.BUDGETS,
    COLLECTIONS.WISHLIST,
  ];
  const batch = writeBatch(db);
  for (const colName of targets) {
    const snap = await getDocs(collection(db, colName));
    snap.forEach((d) => batch.delete(d.ref));
  }
  await batch.commit();
}

export async function seedAllToFirestore(payload: {
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: BudgetLimit[];
  wishlist: WishlistItem[];
  settings: AppSettings;
}): Promise<void> {
  await clearAllFirestoreDocs();
  const batch = writeBatch(db);

  for (const w of payload.wallets) {
    batch.set(doc(db, COLLECTIONS.WALLETS, w.id), stripUndefined({ ...w }));
  }
  for (const t of payload.transactions) {
    batch.set(doc(db, COLLECTIONS.TRANSACTIONS, t.id), stripUndefined({ ...t }));
  }
  for (const b of payload.budgets) {
    batch.set(doc(db, COLLECTIONS.BUDGETS, b.id), stripUndefined({ ...b }));
  }
  for (const wl of payload.wishlist) {
    batch.set(doc(db, COLLECTIONS.WISHLIST, wl.id), stripUndefined({ ...wl }));
  }
  batch.set(
    doc(db, COLLECTIONS.SETTINGS, 'app'),
    stripUndefined({ ...payload.settings })
  );

  await batch.commit();
}

async function compressImageToBlobAndDataUrl(
  file: File,
  maxSize = 560,
  quality = 0.82
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context tidak tersedia.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal mengompresi gambar.'));
              return;
            }
            resolve({ blob, dataUrl });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses image and attempts Firebase Storage upload (`wishlist/...`).
 * Automatically falls back to compressed Base64 Data URL if Storage rules/CORS
 * block upload so client demos and offline environments never fail.
 */
export async function uploadWishlistImage(
  file: File,
  wishlistId: string
): Promise<{ url: string; source: 'firebase-storage' | 'compressed-local' }> {
  const { blob, dataUrl } = await compressImageToBlobAndDataUrl(file);

  try {
    const storageRef = ref(storage, `wishlist/${wishlistId}_${Date.now()}.jpg`);
    const uploadWithTimeout = Promise.race([
      uploadBytes(storageRef, blob, { contentType: 'image/jpeg' }).then(() =>
        getDownloadURL(storageRef)
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase Storage timeout')), 4500)
      ),
    ]);
    const url = await uploadWithTimeout;
    return { url, source: 'firebase-storage' };
  } catch {
    return { url: dataUrl, source: 'compressed-local' };
  }
}
