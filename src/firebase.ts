/**
 * ============================================================================
 * DEXX FINANCE — Konfigurasi Firebase (Firestore & Firebase Storage)
 * ============================================================================
 * Panduan Deploy ke Vercel / Netlify / GitHub Pages:
 * 1. Ganti atau gunakan objek `firebaseConfig` di bawah dari Firebase Console
 *    (Project Settings > Your apps > Web app).
 * 2. Aktifkan Cloud Firestore dan Firebase Storage di Firebase Console.
 * 3. Sesuaikan `firestore.rules` (lihat file firestore.rules di root proyek)
 *    agar aplikasi dapat membaca/menulis koleksi:
 *    - dexx_wallets
 *    - dexx_transactions
 *    - dexx_budgets
 *    - dexx_wishlist
 *    - dexx_settings
 * 4. Untuk hosting di Vercel/Netlify/GitHub Pages, jalankan `npm run build`
 *    dan arahkan output direktori ke `dist/`.
 * ============================================================================
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyBiOJgC1Lej7CBtttCLhlWWQpUNc5HyPqY',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'dashboard-17da6.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dashboard-17da6',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'dashboard-17da6.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '262895669205',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:262895669205:web:6e427f6b080f5ef331775c',
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-3EM3T1N2VE',
};

const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export const analyticsPromise: Promise<Analytics | null> =
  typeof window !== 'undefined'
    ? isSupported()
        .then((supported) => (supported ? getAnalytics(app) : null))
        .catch(() => null)
    : Promise.resolve(null);

export default app;
