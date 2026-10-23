import { useMemo, useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { getOccupancyReport, getRevenueReport, getVolumeReport } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatCurrencyINR } from '../../lib/format';

// Utility to generate CSV and trigger download
function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

export function AdminReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const occupancy = useAsync(() => getOccupancyReport(from, to), [from, to]);
  const revenue   = useAsync(() => getRevenueReport(from, to), [from, to]);
  const volume    = useAsync(() => getVolumeReport(from, to), [from, to]);

  // Preset Date Handlers
  function setPreset(preset: 'today' | 'weekly' | 'monthly' | 'yearly') {
    const today = new Date();
    let start = new Date();
    
    if (preset === 'weekly') start.setDate(today.getDate() - 7);
    else if (preset === 'monthly') start.setMonth(today.getMonth() - 1);
    else if (preset === 'yearly') start.setFullYear(today.getFullYear() - 1);
    
    setFrom(start.toISOString().slice(0, 10));
    setTo(today.toISOString().slice(0, 10));
  }

  // Merge data into a single daily ledger
  const mergedReport = useMemo(() => {
    if (revenue.status !== 'success' || occupancy.status !== 'success' || volume.status !== 'success') {
      return [];
    }

    const map = new Map<string, any>();

    // Initialize with Revenue (ensures all dates from the report are included)
    revenue.data.forEach(r => {
      map.set(r.day, {
        date: r.day,
        collected: r.revenue_paise,
        refunds: r.refunds_paise,
        net: r.net_paise,
        occupied: 0,
        total_beds: 250,
        occupancy_pct: 0,
        bookings: 0,
        cancellations: 0,
      });
    });

    // Merge Occupancy
    occupancy.data.forEach(o => {
      const existing = map.get(o.day);
      if (existing) {
        existing.occupied = o.occupied;
        existing.total_beds = o.total;
        existing.occupancy_pct = o.occupancy_pct;
      }
    });

    // Merge Volume
    volume.data.forEach(v => {
      const existing = map.get(v.day);
      if (existing) {
        existing.bookings = v.bookings;
        existing.cancellations = v.cancellations;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [revenue, occupancy, volume]);

  // Calculate Totals for the Footer Row
  const totals = useMemo(() => {
    return mergedReport.reduce((acc, row) => ({
      collected: acc.collected + row.collected,
      refunds: acc.refunds + row.refunds,
      net: acc.net + row.net,
      bookings: acc.bookings + row.bookings,
      cancellations: acc.cancellations + row.cancellations,
      avgOccupancy: acc.avgOccupancy + Number(row.occupancy_pct),
    }), { collected: 0, refunds: 0, net: 0, bookings: 0, cancellations: 0, avgOccupancy: 0 });
  }, [mergedReport]);

  const avgOcc = mergedReport.length > 0 
    ? (totals.avgOccupancy / mergedReport.length).toFixed(1) 
    : '0.0';

  const isLoading = revenue.status === 'loading' || occupancy.status === 'loading' || volume.status === 'loading';
  const isError = revenue.status === 'error' || occupancy.status === 'error' || volume.status === 'error';

  return (
    <>
      {/* ── Print Header (Only shows on A4) ──────────────────────── */}
      <div className="hidden print:block mb-8 border-b-2 border-brand-900 pb-4">
        <h1 className="text-3xl font-bold text-brand-900">Sai Balaji Dormitory</h1>
        <h2 className="text-xl text-ink mt-1">Daily Operations & Financial Ledger</h2>
        <div className="flex justify-between mt-4 text-sm text-muted">
          <p><strong>Period:</strong> {from} to {to}</p>
          <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
        </div>
      </div>

      <PageHeader 
        eyebrow="Analytics" 
        title="Reports" 
        intro="Track daily occupancy, revenue, and booking volume."
        actions={
          <div className="print-hidden flex gap-2">
            <Button variant="secondary" onClick={() => downloadCSV(mergedReport, `ledger_${from}_to_${to}`)}>
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>Print / PDF</Button>
          </div>
        }
      />

      {/* ── Toolbar (Filters & Presets) ──────────────────────────── */}
      <div className="print-hidden mb-6 rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPreset('today')} className="rounded-full border border-line bg-bg px-4 py-1.5 text-xs font-medium text-ink hover:bg-gray-100 transition">Daily</button>
            <button onClick={() => setPreset('weekly')} className="rounded-full border border-line bg-bg px-4 py-1.5 text-xs font-medium text-ink hover:bg-gray-100 transition">Weekly</button>
            <button onClick={() => setPreset('monthly')} className="rounded-full border border-line bg-bg px-4 py-1.5 text-xs font-medium text-ink hover:bg-gray-100 transition">Monthly</button>
            <button onClick={() => setPreset('yearly')} className="rounded-full border border-line bg-bg px-4 py-1.5 text-xs font-medium text-ink hover:bg-gray-100 transition">Yearly</button>
          </div>
          
          <div className="flex items-end gap-3">
            <Field label="From" htmlFor="rep-from">
              <input id="rep-from" type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To" htmlFor="rep-to">
              <input id="rep-to" type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Summary KPIs ─────────────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print-break-avoid">
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Net Revenue</p>
          <p className="mt-2 text-2xl font-semibold text-brand-900">{formatCurrencyINR(totals.net)}</p>
          <p className="mt-1 text-xs text-muted">Gross: {formatCurrencyINR(totals.collected)}</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Bookings</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{totals.bookings}</p>
          <p className="mt-1 text-xs text-muted">Cancellations: {totals.cancellations}</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Avg Occupancy</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{avgOcc}%</p>
          <p className="mt-1 text-xs text-muted">Across selected period</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Refunds</p>
          <p className="mt-2 text-2xl font-semibold text-[#B3261E]">{formatCurrencyINR(totals.refunds)}</p>
          <p className="mt-1 text-xs text-muted">Processed in period</p>
        </div>
      </div>

      {/* ── The Report Table ─────────────────────────────────────── */}
      <div className="rounded-card border border-line bg-surface shadow-card overflow-hidden">
        {isLoading && <div className="p-8"><Spinner /></div>}
        {isError && <div className="p-8"><ErrorState message="Failed to load report data." /></div>}
        
        {!isLoading && !isError && mergedReport.length === 0 && (
          <div className="p-8 text-center text-muted">No data available for this period.</div>
        )}

        {!isLoading && !isError && mergedReport.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-bg text-xs uppercase tracking-wide text-muted border-b border-line">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Bookings</th>
                  <th className="px-4 py-3 font-semibold text-right">Cancellations</th>
                  <th className="px-4 py-3 font-semibold text-right">Occupancy</th>
                  <th className="px-4 py-3 font-semibold text-right">Collected</th>
                  <th className="px-4 py-3 font-semibold text-right">Refunds</th>
                  <th className="px-4 py-3 font-semibold text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {mergedReport.map((row, index) => (
                  <tr key={row.date} className="hover:bg-bg/50 transition">
                    <td className="px-4 py-3 text-muted tabular-nums">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.bookings}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.cancellations}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.occupied} / {row.total_beds} <span className="text-muted ml-1">({row.occupancy_pct}%)</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrencyINR(row.collected)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#B3261E]">
                      {row.refunds > 0 ? `- ${formatCurrencyINR(row.refunds)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-brand-900">
                      {formatCurrencyINR(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer Totals Row */}
              <tfoot className="bg-bg font-semibold text-ink border-t-2 border-line">
                <tr>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.bookings}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.cancellations}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{avgOcc}% (avg)</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrencyINR(totals.collected)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#B3261E]">
                    {totals.refunds > 0 ? `- ${formatCurrencyINR(totals.refunds)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-900">{formatCurrencyINR(totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}