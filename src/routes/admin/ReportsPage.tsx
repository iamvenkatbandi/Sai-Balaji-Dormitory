import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getDetailedTransactions } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

export function AdminReportsPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const fromIso = useMemo(() => new Date(`${from}T00:00:00`).toISOString(), [from]);
  const toIso = useMemo(() => new Date(`${to}T23:59:59`).toISOString(), [to]);

  // We still fetch data here to show the preview KPIs on the dashboard
  const report = useAsync(() => getDetailedTransactions(fromIso, toIso), [fromIso, toIso]);

  function setPreset(preset: 'today' | 'weekly' | 'monthly' | 'yearly') {
    const today = new Date();
    let start = new Date();
    if (preset === 'weekly') start.setDate(today.getDate() - 7);
    else if (preset === 'monthly') start.setMonth(today.getMonth() - 1);
    else if (preset === 'yearly') start.setFullYear(today.getFullYear() - 1);
    setFrom(start.toISOString().slice(0, 10));
    setTo(today.toISOString().slice(0, 10));
  }

  const totals = useMemo(() => {
    if (report.status !== 'success') return { paid: 0, refunded: 0, net: 0, count: 0 };
    return report.data.reduce((acc, row) => ({
      paid: acc.paid + row.amount_paid,
      refunded: acc.refunded + row.amount_refunded,
      net: acc.net + row.net_amount,
      count: acc.count + 1,
    }), { paid: 0, refunded: 0, net: 0, count: 0 });
  }, [report]);

  function handleGeneratePDF() {
    // Navigate to the dedicated print view with the date range in the URL
    navigate(`/admin/reports/print?from=${from}&to=${to}`);
  }

  return (
    <>
      <PageHeader 
        eyebrow="Analytics" 
        title="Reports Dashboard" 
        intro="Generate and preview detailed transaction ledgers."
        actions={
          <Button onClick={handleGeneratePDF} disabled={report.status !== 'success' || report.data.length === 0}>
            Generate PDF Report
          </Button>
        }
      />

      <div className="mb-6 rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPreset('today')} className="rounded-full border border-line bg-bg px-4 py-1.5 text-xs font-medium text-ink hover:bg-gray-100 transition">Today</button>
            <button onClick={() => setPreset('weekly')} className="rounded-full border border-line bg-bg px-4 py-1.5 text-xs font-medium text-ink hover:bg-gray-100 transition">Last 7 Days</button>
            <button onClick={() => setPreset('monthly')} className="rounded-full border border-line bg-bg px-4 py-1.5 text-xs font-medium text-ink hover:bg-gray-100 transition">Last 30 Days</button>
            <button onClick={() => setPreset('yearly')} className="rounded-full border border-line bg-bg px-4 py-1.5 text-xs font-medium text-ink hover:bg-gray-100 transition">Last 1 Year</button>
          </div>
          <div className="flex items-end gap-3">
            <Field label="From" htmlFor="rep-from"><input id="rep-from" type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To" htmlFor="rep-to"><input id="rep-to" type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        </div>
      </div>

      {/* KPI Cards Preview */}
      {report.status === 'success' && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Transactions</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{totals.count}</p>
          </div>
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Collected</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{formatCurrencyINR(totals.paid)}</p>
          </div>
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Refunded</p>
            <p className="mt-2 text-2xl font-semibold text-[#B3261E]">{formatCurrencyINR(totals.refunded)}</p>
          </div>
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Net Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-brand-900">{formatCurrencyINR(totals.net)}</p>
          </div>
        </div>
      )}

      {/* Screen-only preview table */}
      <div className="rounded-card border border-line bg-surface shadow-card overflow-hidden">
        {report.status === 'loading' && <div className="p-8"><Spinner /></div>}
        {report.status === 'error' && <div className="p-8"><ErrorState message={report.error.message} /></div>}
        
        {report.status === 'success' && report.data.length === 0 && (
          <div className="p-8 text-center text-muted">No transactions found for this period.</div>
        )}

        {report.status === 'success' && report.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-bg text-[10px] uppercase tracking-wide text-muted border-b border-line">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Ref ID</th>
                  <th className="px-4 py-3 font-semibold">Guest Name</th>
                  <th className="px-4 py-3 font-semibold">Bed</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.data.slice(0, 10).map((row) => (
                  <tr key={row.booking_id} className="hover:bg-bg/50 transition">
                    <td className="px-4 py-2 text-xs text-muted">{formatDateTime(row.transaction_date)}</td>
                    <td className="px-4 py-2 font-mono text-xs font-medium text-ink">{row.reference}</td>
                    <td className="px-4 py-2 text-xs text-ink">{row.guest_name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-ink">{row.bed_code}</td>
                    <td className="px-4 py-2 text-xs capitalize text-muted">{row.status.replace('_', ' ')}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-xs font-semibold text-brand-900">
                      {formatCurrencyINR(row.net_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.data.length > 10 && (
              <div className="bg-bg px-4 py-3 text-center text-xs text-muted">
                Showing first 10 of {report.data.length} transactions. Click "Generate PDF Report" for the full ledger.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}