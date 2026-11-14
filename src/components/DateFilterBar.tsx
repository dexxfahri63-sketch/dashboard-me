import { Calendar } from 'lucide-react';
import type {
  DateFilterPreset,
  DateRangeFilter,
  NumberDisplayMode,
} from '../types/finance';
import { formatDateID } from '../utils/financeEngine';

interface DateFilterBarProps {
  dateRange: DateRangeFilter;
  onPresetChange: (preset: DateFilterPreset) => void;
  onCustomChange: (startDate: string, endDate: string) => void;
  filteredCount: number;
  numberMode: NumberDisplayMode;
  onToggleNumberMode: () => void;
}

const PRESETS: { id: DateFilterPreset; label: string }[] = [
  { id: 'today', label: 'Hari Ini' },
  { id: 'week', label: 'Minggu Ini' },
  { id: 'month', label: 'Bulan Ini' },
  { id: 'year', label: 'Tahun Ini' },
  { id: 'custom', label: 'Custom Date' },
];

export function DateFilterBar({
  dateRange,
  onPresetChange,
  onCustomChange,
  filteredCount,
  numberMode,
  onToggleNumberMode,
}: DateFilterBarProps) {
  return (
    <section
      aria-label="Filter Periode Waktu"
      className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-[#0F1623] p-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#090D16] p-1 border border-slate-800/70">
        {PRESETS.map((p) => {
          const active = dateRange.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                active
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {dateRange.preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <span>Dari</span>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => onCustomChange(e.target.value, dateRange.endDate)}
                className="rounded-md border border-slate-700 bg-[#090D16] px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <span>Sampai</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => onCustomChange(dateRange.startDate, e.target.value)}
                className="rounded-md border border-slate-700 bg-[#090D16] px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </label>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
          <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden="true" />
          <span>
            {formatDateID(dateRange.startDate)}
            {dateRange.startDate !== dateRange.endDate
              ? ` — ${formatDateID(dateRange.endDate)}`
              : ''}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-300">{filteredCount} transaksi</span>
        </div>

        <button
          type="button"
          onClick={onToggleNumberMode}
          aria-label="Ubah mode format angka"
          className="rounded-md border border-slate-700 bg-[#090D16] px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0"
        >
          {numberMode === 'smart' ? 'Format: Ringkas (Jt)' : 'Format: Penuh (Rp)'}
        </button>
      </div>
    </section>
  );
}
