import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, Legend,
} from 'recharts';
import { useAsync } from '../../lib/useAsync';
import { getOccupancyReport, getRevenueReport, getVolumeReport } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
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

  const fromIso = useMemo(() => new Date(`${from}T00:00:00`).toISOString(), [from]);
  const toIso = useMemo(() => new Date(`${to}T23:59:59`).toISOString(), [to]);

  const occupancy = useAsync(() => getOccupancyReport(from, to), [from, to]);
  const revenue   = useAsync(() => getRevenueReport(from, to), [from, to]);
  const volume    = useAsync(() => getVolumeReport(from, to), [from, to]);

  // Preset Date Handlers
  function setPreset(preset: 'daily' | 'weekly' | 'monthly' | 'yearly') {
    const today = new Date();
    let start = new Date();
    
    if (preset === 'weekly') start.setDate(today.getDate() - 7);
    else if (preset === 'monthly') start.setMonth(today.getMonth() - 1);
    else if (preset === 'yearly') start.setFullYear(today.getFullYear() - 1);
    
    setFrom(start.toISOString().slice(0, 10));
    setTo(today.toISOString().slice(0, 10));
  }

  // Export Handlers
  function exportOccupancy() {
    if (occupancy.status === 'success') downloadCSV(occupancy.data, `occupancy_${from}_to_${to}`);
  }
  function exportRevenue() {
    if (revenue.status === 'success') downloadCSV(revenue.data, `revenue_${from}_to_${to}`);
  }
  function exportVolume() {
    if (volume.status === 'success') downloadCSV(volume.data, `volume_${from}_to_${to}`);
  }

  return (
    <>
      {/* ── Print Header (Only shows on A4) ──────────────────────── */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4">
        <h1 className="text-2xl font-bold text-black">Sai Balaji Dormitory — Reports</h1>
        <p className="text-sm text-gray-600">Period: {from} to {to}</p>
        <p className="text-xs text-gray-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
      </div>

      <PageHeader 
        eyebrow="Analytics" 
        title="Reports" 
        actions={
          <div className="print-hidden flex gap-2">
            <Button variant="secondary" onClick={() => window.print()}>Print / PDF</Button>
          </div>
        }
      />

      {/* ── Filters & Presets ────────────────────────────────────── */}
      <div className="print-hidden mb-6 space-y-4 rounded-card border border-line bg-surface p-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPreset('daily')} className="rounded-full border border-line bg-bg px-3 py-1 text-xs hover:bg-gray-200">Today (Daily)</button>
          <button onClick={() => setPreset('weekly')} className="rounded-full border border-line bg-bg px-3 py-1 text-xs hover:bg-gray-200">Last 7 Days (Weekly)</button>
          <button onClick={() => setPreset('monthly')} className="rounded-full border border-line bg-bg px-3 py-1 text-xs hover:bg-gray-200">Last 30 Days (Monthly)</button>
          <button onClick={() => setPreset('yearly')} className="rounded-full border border-line bg-bg px-3 py-1 text-xs hover:bg-gray-200">Last 1 Year (Yearly)</button>
        </div>
        
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From" htmlFor="rep-from">
            <input id="rep-from" type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To" htmlFor="rep-to">
            <input id="rep-to" type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* ── Report Charts ────────────────────────────────────────── */}
      <div className="grid gap-6">
        
        {/* Occupancy */}
        <SectionCard 
          title="Occupancy %" 
          actions={<button onClick={exportOccupancy} className="print-hidden text-xs text-brand-900 hover:underline">Export CSV</button>}
        >
          {occupancy.status === 'loading' && <Spinner />}
          {occupancy.status === 'error' && <ErrorState message={occupancy.error.message} />}
          {occupancy.status === 'success' && (
            <div className="h-64 print-break-avoid">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={occupancy.data.map((r) => ({ ...r, day: r.day.slice(0, 10) }))}>
                  <CartesianGrid stroke="#E2E6E3" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="occupancy_pct" stroke="#173B35" strokeWidth={2} dot={false} name="Occupancy" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* Revenue */}
        <SectionCard 
          title="Revenue (₹)" 
          actions={<button onClick={exportRevenue} className="print-hidden text-xs text-brand-900 hover:underline">Export CSV</button>}
        >
          {revenue.status === 'loading' && <Spinner />}
          {revenue.status === 'error' && <ErrorState message={revenue.error.message} />}
          {revenue.status === 'success' && (
            <div className="h-64 print-break-avoid">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue.data.map((r) => ({
                  day: r.day.slice(0, 10),
                  revenue: r.revenue_paise / 100,
                  refunds: r.refunds_paise / 100,
                  net: r.net_paise / 100,
                }))}>
                  <CartesianGrid stroke="#E2E6E3" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrencyINR(v * 100)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#173B35" name="Collected" />
                  <Bar dataKey="refunds" fill="#B3261E" name="Refunded" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* Volume */}
        <SectionCard 
          title="Booking volume" 
          actions={<button onClick={exportVolume} className="print-hidden text-xs text-brand-900 hover:underline">Export CSV</button>}
        >
          {volume.status === 'loading' && <Spinner />}
          {volume.status === 'error' && <ErrorState message={volume.error.message} />}
          {volume.status === 'success' && (
            <div className="h-64 print-break-avoid">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volume.data.map((r) => ({ ...r, day: r.day.slice(0, 10) }))}>
                  <CartesianGrid stroke="#E2E6E3" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bookings" fill="#173B35" name="Bookings" />
                  <Bar dataKey="cancellations" fill="#8A5A00" name="Cancellations" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

      </div>
    </>
  );
}