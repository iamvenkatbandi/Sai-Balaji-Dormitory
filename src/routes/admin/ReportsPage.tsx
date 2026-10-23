import { useMemo, useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { getDetailedTransactions, type TransactionLedgerRow } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

function downloadCSV(data: TransactionLedgerRow[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => JSON.stringify((row as any)[h] ?? '')).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'text-[#2E7D5B]',
  checked_in: 'text-brand-900',
  completed: 'text-muted',
  cancelled: 'text-[#B3261E]',
  expired: 'text-[#8A5A00]',
  pending_payment: 'text-[#8A5A00]',
};

export function AdminReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const fromIso = useMemo(() => new Date(`${from}T00:00:00`).toISOString(), [from]);
  const toIso = useMemo(() => new Date(`${to}T23:59:59`).toISOString(), [to]);

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

  // Calculate Totals
  const totals = useMemo(() => {
    if (report.status !== 'success') return { paid: 0, refunded: 0, net: 0, count: 0 };
    return report.data.reduce((acc, row) => ({
      paid: acc.paid + row.amount_paid,
      refunded: acc.refunded + row.amount_refunded,
      net: acc.net + row.net_amount,
      count: acc.count + 1,
    }), { paid: 0, refunded: 0, net: 0, count: 0 });
  }, [report]);

  return (
    <div className="print:bg-white print:p-0">
      {/* ── Print Header (Only shows on A4) ──────────────────────── */}
      <div className="hidden print:block mb-8 border-b-2 border-brand-900 pb-4">
        <h1 className="text-3xl font-bold text-brand-900">Sai Balaji Dormitory</h1>
        <h2 className="text-xl text-ink mt-1">Transaction Ledger Report</h2>
        <div className="flex justify-between mt-4 text-sm text-muted">
          <p><strong>Period:</strong> {new Date(from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to {new Date(to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="print-hidden">
        <PageHeader 
          eyebrow="Analytics" 
          title="Transaction Ledger" 
          intro="Detailed report of every booking and payment within the selected period."
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => report.status === 'success' && downloadCSV(report.data, `ledger_${from}_to_${to}`)}>
                Export CSV
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>Print / Save as PDF</Button>
            </div>
          }
        />

        {/* Filters & Presets */}
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

        {/* KPI Cards */}
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
      </div>

      {/* The Report Table */}
      <div className="print-hidden rounded-card border border-line bg-surface shadow-card overflow-hidden">
        {report.status === 'loading' && <div className="p-8"><Spinner /></div>}
        {report.status === 'error' && <div className="p-8"><ErrorState message={report.error.message} /></div>}
        
        {report.status === 'success' && report.data.length === 0 && (
          <div className="p-8 text-center text-muted">No transactions found for this period.</div>
        )}

        {report.status === 'success' && report.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-bg text-[10px] uppercase tracking-wide text-muted border-b border-line print:bg-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Ref ID</th>
                  <th className="px-4 py-3 font-semibold">Guest Name</th>
                  <th className="px-4 py-3 font-semibold">Accommodation</th>
                  <th className="px-4 py-3 font-semibold">Bed</th>
                  <th className="px-4 py-3 font-semibold">Stay Dates</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Paid</th>
                  <th className="px-4 py-3 font-semibold text-right">Refunded</th>
                  <th className="px-4 py-3 font-semibold text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.data.map((row, index) => (
                  <tr key={row.booking_id} className="hover:bg-bg/50 transition even:bg-gray-50/50 print:even:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-muted">{formatDateTime(row.transaction_date)}</td>
                    <td className="px-4 py-2 font-mono text-xs font-medium text-ink">{row.reference}</td>
                    <td className="px-4 py-2 text-xs text-ink">{row.guest_name}</td>
                    <td className="px-4 py-2 text-xs text-muted capitalize">{row.product_type.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-2 font-mono text-xs text-ink">{row.bed_code}</td>
                    <td className="px-4 py-2 text-xs text-muted">
                      {new Date(row.check_in).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(row.check_out).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className={`px-4 py-2 text-xs font-medium capitalize ${STATUS_COLORS[row.status] || 'text-muted'}`}>
                      {row.status.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-xs">{formatCurrencyINR(row.amount_paid)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-xs text-[#B3261E]">
                      {row.amount_refunded > 0 ? `-${formatCurrencyINR(row.amount_refunded)}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-xs font-semibold text-brand-900">
                      {formatCurrencyINR(row.net_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-bg font-semibold text-ink border-t-2 border-line print:bg-gray-100">
                <tr>
                  <td className="px-4 py-3 text-xs" colSpan={7}>Total ({totals.count} transactions)</td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs">{formatCurrencyINR(totals.paid)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs text-[#B3261E]">
                    {totals.refunded > 0 ? `-${formatCurrencyINR(totals.refunded)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs text-brand-900">{formatCurrencyINR(totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Print-Only Table (Forces full width and repeating headers) */}
      <div className="hidden print:block w-full">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="py-2 px-1 text-[10px] font-bold text-gray-800">Date</th>
              <th className="py-2 px-1 text-[10px] font-bold text-gray-800">Ref</th>
              <th className="py-2 px-1 text-[10px] font-bold text-gray-800">Guest</th>
              <th className="py-2 px-1 text-[10px] font-bold text-gray-800">Bed</th>
              <th className="py-2 px-1 text-[10px] font-bold text-gray-800">Status</th>
              <th className="py-2 px-1 text-[10px] font-bold text-gray-800 text-right">Paid</th>
              <th className="py-2 px-1 text-[10px] font-bold text-gray-800 text-right">Refund</th>
              <th className="py-2 px-1 text-[10px] font-bold text-gray-800 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {report.status === 'success' && report.data.map((row) => (
              <tr key={row.booking_id} className="border-b border-gray-200">
                <td className="py-2 px-1 text-[10px] text-gray-600">{new Date(row.transaction_date).toLocaleDateString('en-IN')}</td>
                <td className="py-2 px-1 text-[10px] font-mono text-gray-900">{row.reference}</td>
                <td className="py-2 px-1 text-[10px] text-gray-900">{row.guest_name}</td>
                <td className="py-2 px-1 text-[10px] font-mono text-gray-900">{row.bed_code}</td>
                <td className="py-2 px-1 text-[10px] capitalize text-gray-900">{row.status.replace('_', ' ')}</td>
                <td className="py-2 px-1 text-[10px] text-right tabular-nums text-gray-900">{formatCurrencyINR(row.amount_paid)}</td>
                <td className="py-2 px-1 text-[10px] text-right tabular-nums text-gray-900">{row.amount_refunded > 0 ? formatCurrencyINR(row.amount_refunded) : '—'}</td>
                <td className="py-2 px-1 text-[10px] text-right tabular-nums font-bold text-gray-900">{formatCurrencyINR(row.net_amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-800 font-bold">
              <td className="py-2 px-1 text-[10px] text-gray-900" colSpan={5}>Totals</td>
              <td className="py-2 px-1 text-[10px] text-right tabular-nums text-gray-900">{formatCurrencyINR(totals.paid)}</td>
              <td className="py-2 px-1 text-[10px] text-right tabular-nums text-gray-900">{formatCurrencyINR(totals.refunded)}</td>
              <td className="py-2 px-1 text-[10px] text-right tabular-nums text-gray-900">{formatCurrencyINR(totals.net)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}