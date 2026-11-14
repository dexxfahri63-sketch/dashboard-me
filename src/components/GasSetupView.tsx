import { useState } from 'react';
import { Check, Cloud, Copy, Download, RefreshCw, UploadCloud } from 'lucide-react';
import type { GasConfig } from '../types/finance';
import { GAS_CODE_TEMPLATE } from '../utils/gasApi';

interface GasSetupViewProps {
  gasConfig: GasConfig;
  onUpdateUrl: (url: string) => void;
  onPullFromGas: () => Promise<void>;
  onPushAllToGas: () => Promise<void>;
  onResetSeed: () => void;
}

export function GasSetupView({
  gasConfig,
  onUpdateUrl,
  onPullFromGas,
  onPushAllToGas,
  onResetSeed,
}: GasSetupViewProps) {
  const [urlInput, setUrlInput] = useState(gasConfig.webAppUrl);
  const [copied, setCopied] = useState(false);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUrl(urlInput.trim());
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GAS_CODE_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard permission unavailable
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([GAS_CODE_TEMPLATE], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = 'Code.gs';
    a.click();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="space-y-6">
      {/* GAS Endpoint Configuration */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0F1623] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-100">
              Koneksi Backend Google Apps Script
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Hubungkan DEXX FINANCE ke Google Sheets pribadi Anda via URL Web App publik.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <Cloud className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span className="text-slate-300">
              {gasConfig.webAppUrl
                ? gasConfig.syncStatus === 'error'
                  ? 'Gagal Sinkronisasi'
                  : gasConfig.syncStatus === 'syncing'
                  ? 'Menyinkronkan...'
                  : 'URL Terkonfigurasi'
                : 'Mode Lokal (Seed Data)'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveUrl} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1 text-xs text-slate-400">
            <span className="sr-only">Google Apps Script Web App URL</span>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
          >
            Simpan URL Web App
          </button>
        </form>

        {gasConfig.lastError && (
          <p role="alert" className="mt-3 text-xs text-rose-400">
            {gasConfig.lastError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-800/70 pt-4">
          <button
            type="button"
            disabled={!gasConfig.webAppUrl || gasConfig.syncStatus === 'syncing'}
            onClick={onPullFromGas}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-emerald-500/50 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tarik Data dari Google Sheets (doGet)</span>
          </button>
          <button
            type="button"
            disabled={!gasConfig.webAppUrl || gasConfig.syncStatus === 'syncing'}
            onClick={onPushAllToGas}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-indigo-500/50 disabled:opacity-40 transition-colors"
          >
            <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Kirim Semua Data Lokal ke Sheets (doPost)</span>
          </button>
          <button
            type="button"
            onClick={onResetSeed}
            className="ml-auto text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
          >
            Reset ke Data Demo Awal
          </button>
        </div>
      </section>

      {/* Deployment & GitHub Guide */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800/80 bg-[#0F1623] p-6 space-y-3">
          <h3 className="font-display text-base font-semibold text-slate-100">
            1. Panduan Setup Google Apps Script (Akses Publik)
          </h3>
          <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-slate-300">
            <li>
              Buat Google Spreadsheet baru di Google Drive (misal: <code className="font-mono text-emerald-300">DEXX_FINANCE_DB</code>).
            </li>
            <li>
              Buka menu <strong className="text-slate-100">Extensions &gt; Apps Script</strong>, hapus kode bawaan, lalu tempel skrip <code className="font-mono text-emerald-300">Code.gs</code> di bawah ini.
            </li>
            <li>
              Pilih fungsi <code className="font-mono text-emerald-300">setupDatabase</code> pada toolbar editor lalu klik <strong className="text-slate-100">Run</strong> untuk membuat 4 tab sheet otomatis (<code className="font-mono">Wallets</code>, <code className="font-mono">Transactions</code>, <code className="font-mono">Budgets</code>, <code className="font-mono">Wishlist</code>).
            </li>
            <li>
              Klik <strong className="text-slate-100">Deploy &gt; New deployment</strong>, pilih tipe <strong className="text-slate-100">Web app</strong>.
            </li>
            <li>
              Atur <strong className="text-slate-100">Execute as: Me</strong> dan <strong className="text-slate-100">Who has access: Anyone (Publik)</strong> agar dashboard dapat melakukan request <code className="font-mono">doGet</code> &amp; <code className="font-mono">doPost</code> tanpa hambatan autentikasi.
            </li>
            <li>
              Salin URL <code className="font-mono text-emerald-300">/exec</code> yang muncul, tempel pada formulir koneksi di atas, lalu klik <strong className="text-slate-100">Kirim Semua Data Lokal ke Sheets</strong> untuk sinkronisasi awal.
            </li>
          </ol>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F1623] p-6 space-y-3">
          <h3 className="font-display text-base font-semibold text-slate-100">
            2. Panduan Persiapan Deploy ke GitHub
          </h3>
          <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-slate-300">
            <li>
              Inisialisasi repository Git pada direktori proyek dan push ke GitHub (<code className="font-mono text-emerald-300">git init &amp;&amp; git add . &amp;&amp; git commit -m &quot;Initial DEXX FINANCE&quot;</code>).
            </li>
            <li>
              File backend referensi sudah tersedia di dalam folder <code className="font-mono text-emerald-300">google-apps-script/Code.gs</code> untuk dokumentasi repository Anda.
            </li>
            <li>
              Untuk hosting gratis di <strong className="text-slate-100">GitHub Pages</strong>, jalankan <code className="font-mono text-emerald-300">npm run build</code> untuk menghasilkan bundel statis di folder <code className="font-mono">dist/</code> atau hubungkan repo langsung ke GitHub Actions / Vercel / Cloudflare Pages.
            </li>
            <li>
              Seluruh komunikasi ke Google Apps Script menggunakan request <code className="font-mono">Content-Type: text/plain</code> pada <code className="font-mono">doPost</code> sehingga bebas dari error CORS preflight di browser.
            </li>
          </ol>
        </div>
      </section>

      {/* Code.gs Viewer */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0F1623] p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-100">
              Skrip Backend Google Apps Script (Code.gs)
            </h3>
            <p className="text-xs text-slate-400">
              Mendukung CRUD Multi-Wallet, Filter Tanggal, Anggaran Kategori, dan Wishlist
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCode}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#090D16] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 transition-colors"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Unduh Code.gs</span>
            </button>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Salin Kode GAS</span>
                </>
              )}
            </button>
          </div>
        </div>

        <pre className="max-h-96 overflow-auto rounded-lg border border-slate-800 bg-[#090D16] p-4 font-mono text-xs leading-relaxed text-slate-300">
          <code>{GAS_CODE_TEMPLATE}</code>
        </pre>
      </section>
    </div>
  );
}
