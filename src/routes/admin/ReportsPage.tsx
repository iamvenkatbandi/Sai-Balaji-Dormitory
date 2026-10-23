import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart
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
  function setPreset(preset: 'today' | 'weekly' | 'monthly' | 'yearly') {
    const today = new Date();
    let start = new Date();
    
    if (preset === 'weekly') start.setDate(today.getDate() - 7);
    else if (preset === 'monthly') start.setMonth(today.getMonth() - 1);
    else if (preset === 'yearly') start.setFullYear(today.getFullYear() - 1);
    
    setFrom(start.toISOString().slice(0, 10));
    setTo(today.toISOString().slice(0, 10));
  }

  // Calculate Summary KPIs
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let totalRefunds = 0;
    let totalBookings = 0;
    let totalOccupancy = 0;
    let occupancyDays = 0;

    if (revenue.status === 'success') {
      revenue.data.forEach(r => {
        totalRevenue += r.revenue_paise;
        totalRefunds += r.refunds_paise;
      });
    }
    if (volume.status === 'success') {
      volume.data.forEach(v => { totalBookings += v.bookings; });
    }
    if (occupancy.status === 'success') {
      occupancy.data.forEach(o => {
        totalOccupancy += Number(o.occupancy_pct);
        occupancyDays++;
      });
    }

    return {
      totalRevenue,
      totalRefunds,
      netRevenue: totalRevenue - totalRefunds,
      totalBookings,
      avgOccupancy: occupancyDays > 0 ? (totalOccupancy / occupancyDays).toFixed(1) : '0.0'
    };
  }, [revenue.status, volume.status, occupancy.status, revenue.data, volume.data, occupancy.data]);

  return (
    <>
      {/* ── Print Header (Only shows on A4) ──────────────────────── */}
      <div className="hidden print:block mb-8 border-b-2 border-brand-900 pb-4">
        <h1 className="text-3xl font-bold text-brand-900">Sai Balaji Dormitory</h1>
        <h2 className="text-xl text-ink mt-1">Operational & Financial Report</h2>
        <div className="flex justify-between mt-4 text-sm text-muted">
          <p><strong>Period:</strong> {from} to {to}</p>
          <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
        </div>
      </div>

      <PageHeader 
        eyebrow="Analytics" 
        title="Reports" 
        intro="Track occupancy, revenue, and booking volume across custom date ranges."
        actions={
          <div className="print-hidden flex gap-2">
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
          <p className="mt-2 text-2xl font-semibold text-brand-900">{formatCurrencyINR(summary.netRevenue)}</p>
          <p className="mt-1 text-xs text-muted">Gross: {formatCurrencyINR(summary.totalRevenue)}</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Bookings</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{summary.totalBookings}</p>
          <p className="mt-1 text-xs text-muted">Confirmed stays in period</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Avg Occupancy</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{summary.avgOccupancy}%</p>
          <p className="mt-1 text-xs text-muted">Across all 250 spaces</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Refunds</p>
          <p className="mt-2 text-2xl font-semibold text-[#B3261E]">{formatCurrencyINR(summary.totalRefunds)}</p>
          <p className="mt-1 text-xs text-muted">Processed in period</p>
        </div>
      </div>

      {/* ── Charts ───────────────────────────────────────────────── */}
      <div className="grid gap-6">
        
        {/* Revenue Chart */}
        <SectionCard 
          title="Revenue & Refunds" 
          subtitle="Daily breakdown of collected vs refunded amounts"
          actions={<button onClick={() => revenue.status === 'success' && downloadCSV(revenue.data, `revenue_${from}_to_${to}`)} className="print-hidden text-xs font-medium text-brand-900 hover:underline">Export CSV</button>}
        >
          {revenue.status === 'loading' && <Spinner />}
          {revenue.status === 'error' && <ErrorState message={revenue.error.message} />}
          {revenue.status === 'success' && (
            <div className="h-72 print-break-avoid">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenue.data.map((r) => ({
                  day: r.day.slice(5), // MM-DD
                  revenue: r.revenue_paise / 100,
                  refunds: r.refunds_paise / 100,
                  net: r.net_paise / 100,
                }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#E2E6E3" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#69736D' }} tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#69736D' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrencyINR(v * 100)} cursor={{ fill: 'rgba(23, 59, 53, 0.04)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="revenue" fill="#173B35" name="Collected" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="refunds" fill="#B3261E" name="Refunded" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Line type="monotone" dataKey="net" stroke="#E8B86D" strokeWidth={2} dot={false} name="Net" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Occupancy Chart */}
          <SectionCard 
            title="Occupancy %" 
            subtitle="Percentage of beds filled"
            actions={<button onClick={() => occupancy.status === 'success' && downloadCSV(occupancy.data, `occupancy_${from}_to_${to}`)} className="print-hidden text-xs font-medium text-brand-900 hover:underline">Export CSV</button>}
          >
            {occupancy.status === 'loading' && <Spinner />}
            {occupancy.status === 'error' && <ErrorState message={occupancy.error.message} />}
            {occupancy.status === 'success' && (
              <div className="h-64 print-break-avoid">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={occupancy.data.map((r) => ({ ...r, day: r.day.slice(5) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOcc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#173B35" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#173B35" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E2E6E3" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#69736D' }} tickMargin={8} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#69736D' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Occupancy']} cursor={{ stroke: '#173B35', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Area type="monotone" dataKey="occupancy_pct" stroke="#173B35" strokeWidth={2} fillOpacity={1} fill="url(#colorOcc)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          {/* Volume Chart */}
          <SectionCard 
            title="Booking Volume" 
            subtitle="New bookings vs cancellations"
            actions={<button onClick={() => volume.status === 'success' && downloadCSV(volume.data, `volume_${from}_to_${to}`)} className="print-hidden text-xs font-medium text-brand-900 hover:underline">Export CSV</button>}
          >
            {volume.status === 'loading' && <Spinner />}
            {volume.status === 'error' && <ErrorState message={volume.error.message} />}
            {volume.status === 'success' && (
              <div className="h-64 print-break-avoid">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volume.data.map((r) => ({ ...r, day: r.day.slice(5) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#E2E6E3" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#69736D' }} tickMargin={8} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#69736D' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(23, 59, 53, 0.04)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar dataKey="bookings" fill="#173B35" name="Bookings" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="cancellations" fill="#8A5A00" name="Cancellations" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}