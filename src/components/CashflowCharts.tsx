import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import {
  formatIDR,
  type CashflowSeries,
  type ExpenseSlice,
} from '../utils/financeEngine';

interface CashflowChartsProps {
  cashflowSeries: CashflowSeries;
  expenseSlices: ExpenseSlice[];
  periodLabel: string;
}

const DONUT_COLORS = [
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#F43F5E', // Rose
  '#64748B', // Slate
];

export function CashflowCharts({
  cashflowSeries,
  expenseSlices,
  periodLabel,
}: CashflowChartsProps) {
  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const donutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trendChartRef = useRef<Chart | null>(null);
  const donutChartRef = useRef<Chart | null>(null);

  const totalExpense = expenseSlices.reduce((sum, s) => sum + s.amount, 0);

  useEffect(() => {
    const canvas = trendCanvasRef.current;
    if (!canvas) return;

    if (trendChartRef.current) {
      trendChartRef.current.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const useLineChart = cashflowSeries.labels.length > 14;

    const incomeGrad = ctx.createLinearGradient(0, 0, 0, 260);
    incomeGrad.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
    incomeGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const expenseGrad = ctx.createLinearGradient(0, 0, 0, 260);
    expenseGrad.addColorStop(0, 'rgba(244, 63, 94, 0.24)');
    expenseGrad.addColorStop(1, 'rgba(244, 63, 94, 0.0)');

    trendChartRef.current = new Chart(ctx, {
      type: useLineChart ? 'line' : 'bar',
      data: {
        labels: cashflowSeries.labels,
        datasets: [
          {
            label: 'Pemasukan',
            data: cashflowSeries.income,
            backgroundColor: useLineChart ? incomeGrad : 'rgba(16, 185, 129, 0.85)',
            borderColor: '#10B981',
            borderWidth: useLineChart ? 2 : 1,
            fill: useLineChart,
            tension: 0.28,
            pointRadius: useLineChart
              ? (c) => (Number(c.raw || 0) > 0 ? 3.5 : 0)
              : 0,
            pointHoverRadius: 5,
            pointBackgroundColor: '#10B981',
            borderRadius: 4,
            barPercentage: 0.65,
            categoryPercentage: 0.72,
          },
          {
            label: 'Pengeluaran',
            data: cashflowSeries.expense,
            backgroundColor: useLineChart ? expenseGrad : 'rgba(244, 63, 94, 0.8)',
            borderColor: '#F43F5E',
            borderWidth: useLineChart ? 2 : 1,
            fill: useLineChart,
            tension: 0.28,
            pointRadius: useLineChart
              ? (c) => (Number(c.raw || 0) > 0 ? 3.5 : 0)
              : 0,
            pointHoverRadius: 5,
            pointBackgroundColor: '#F43F5E',
            borderRadius: 4,
            barPercentage: 0.65,
            categoryPercentage: 0.72,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: '#CBD5E1',
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              font: {
                family: 'DM Sans, system-ui, sans-serif',
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: '#090D16',
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            borderColor: '#1E293B',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const val = Number(context.parsed.y || 0);
                return ` ${context.dataset.label}: ${formatIDR(val)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#94A3B8',
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
              font: {
                family: 'JetBrains Mono, monospace',
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            border: {
              display: false,
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.08)',
            },
            ticks: {
              color: '#94A3B8',
              font: {
                family: 'JetBrains Mono, monospace',
                size: 11,
              },
              callback: (value) => formatIDR(Number(value), true),
            },
          },
        },
      },
    });

    return () => {
      if (trendChartRef.current) {
        trendChartRef.current.destroy();
        trendChartRef.current = null;
      }
    };
  }, [cashflowSeries]);

  useEffect(() => {
    const canvas = donutCanvasRef.current;
    if (!canvas) return;

    if (donutChartRef.current) {
      donutChartRef.current.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const hasData = expenseSlices.length > 0;
    donutChartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: hasData
          ? expenseSlices.map((s) => s.category)
          : ['Belum Ada Pengeluaran'],
        datasets: [
          {
            data: hasData ? expenseSlices.map((s) => s.amount) : [1],
            backgroundColor: hasData
              ? expenseSlices.map((_, idx) => DONUT_COLORS[idx % DONUT_COLORS.length])
              : ['#1E293B'],
            borderColor: '#0F1623',
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: hasData,
            backgroundColor: '#090D16',
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            borderColor: '#1E293B',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const val = Number(context.parsed || 0);
                const pct =
                  totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0;
                return ` ${context.label}: ${formatIDR(val)} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (donutChartRef.current) {
        donutChartRef.current.destroy();
        donutChartRef.current = null;
      }
    };
  }, [expenseSlices, totalExpense]);

  return (
    <section
      aria-label="Visualisasi Arus Kas dan Pengeluaran"
      className="grid grid-cols-1 gap-4 xl:grid-cols-12"
    >
      {/* Cashflow Trend Chart */}
      <div className="flex flex-col rounded-xl border border-slate-800/80 bg-[#0F1623] p-5 xl:col-span-8">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Tren Arus Kas
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Perbandingan pemasukan dan pengeluaran · {periodLabel}
            </p>
          </div>
        </div>
        <div className="relative h-72 w-full">
          <canvas
            ref={trendCanvasRef}
            data-testid="cashflow-trend-chart"
            aria-label="Grafik Tren Arus Kas"
          />
        </div>
      </div>

      {/* Expense Proportion Donut Chart */}
      <div className="flex flex-col rounded-xl border border-slate-800/80 bg-[#0F1623] p-5 xl:col-span-4">
        <div className="mb-4">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Proporsi Pengeluaran
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Distribusi kategori · Total {formatIDR(totalExpense, true)}
          </p>
        </div>

        <div className="relative mx-auto h-44 w-44 shrink-0">
          <canvas
            ref={donutCanvasRef}
            data-testid="expense-donut-chart"
            aria-label="Diagram Donat Proporsi Pengeluaran"
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] text-slate-400">Keluar</span>
            <span className="font-mono text-sm font-bold text-slate-100 tabular-nums">
              {formatIDR(totalExpense, true)}
            </span>
          </div>
        </div>

        <div className="mt-4 divide-y divide-slate-800/60">
          {expenseSlices.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-500">
              Tidak ada pengeluaran pada periode ini.
            </p>
          ) : (
            expenseSlices.slice(0, 5).map((slice, idx) => (
              <div
                key={slice.category}
                className="flex items-center justify-between py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{
                      backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                    }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-slate-300">{slice.category}</span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                  <span className="text-slate-400">{slice.percentage}%</span>
                  <span className="text-slate-100">
                    {formatIDR(slice.amount, true)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
