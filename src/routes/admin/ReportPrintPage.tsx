import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getDetailedTransactions } from '../../lib/admin';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { formatCurrencyINR } from '../../lib/format';

export function ReportPrintPage() {
  const [params] = useSearchParams();
  const from = params.get('from') || new Date().toISOString().slice(0, 10);
  const to = params.get('to') || new Date().toISOString().slice(0, 10);

  const fromIso = new Date(`${from}T00:00:00`).toISOString();
  const toIso = new Date(`${to}T23:59:59`).toISOString();

  const report = useAsync(() => getDetailedTransactions(fromIso, toIso), [fromIso, toIso]);

  useEffect(() => {
    document.body.classList.add('print-isolate');
    return () => document.body.classList.remove('print-isolate');
  }, []);

  if (report.status === 'loading') return <div className="p-12"><Spinner /></div>;
  if (report.status === 'error') return <div className="p-12"><ErrorState message={report.error.message} /></div>;

  const data = report.data;

  const totals = data.reduce((acc, row) => ({
    paid: acc.paid + row.amount_paid,
    refunded: acc.refunded + row.amount_refunded,
    net: acc.net + row.net_amount,
    count: acc.count + 1,
  }), { paid: 0, refunded: 0, net: 0, count: 0 });

  const STATUS_COLORS: Record<string, string> = {
    confirmed: 'text-[#2E7D5B]',
    checked_in: 'text-brand-900',
    completed: 'text-muted',
    cancelled: 'text-[#B3261E]',
    expired: 'text-[#8A5A00]',
    pending_payment: 'text-[#8A5A00]',
  };

  return (
    <div className="min-h-screen bg-bg py-12 px-4 print:bg-white print:py-0 print:px-0">
      
      {/* Action Buttons (Hidden when printing) */}
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between print:hidden">
        <Link to="/admin/reports" className="text-sm font-medium text-brand-900 hover:underline">
          ← Back to Dashboard
        </Link>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.print()}>Download / Print PDF</Button>
        </div>
      </div>

      {/* The A4 Report Area */}
      <div className="print-area mx-auto max-w-5xl rounded-card border border-line bg-surface p-8 shadow-card print:border-none print:shadow-none print:max-w-none print:p-0">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-brand-900 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-brand-900">Sai Balaji Dormitory</h1>
            <p className="text-sm text-muted mt-1">Detailed record of all bookings and payments.</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-ink">Report Period</p>
            <p className="text-sm text-muted">{new Date(from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to {new Date(to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <p className="text-xs text-muted mt-1">Generated: {new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Summary Box */}
        <div className="mt-8 grid grid-cols-4 gap-4 rounded-card border border-line bg-bg/50 p-4 print:bg-transparent print:border-gray-300">
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted">Total Txns</p>
            <p className="text-xl font-bold text-ink">{totals.count}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted">Collected</p>
            <p className="text-xl font-bold text-ink">{formatCurrencyINR(totals.paid)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted">Refunded</p>
            <p className="text-xl font-bold text-[#B3261E]">{formatCurrencyINR(totals.refunded)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted">Net Revenue</p>
            <p className="text-xl font-bold text-brand-900">{formatCurrencyINR(totals.net)}</p>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="mt-8">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="py-2 px-2 text-[10px] font-bold text-gray-800 uppercase tracking-wider">Date</th>
                <th className="py-2 px-2 text-[10px] font-bold text-gray-800 uppercase tracking-wider">Ref ID</th>
                <th className="py-2 px-2 text-[10px] font-bold text-gray-800 uppercase tracking-wider">Guest</th>
                <th className="py-2 px-2 text-[10px] font-bold text-gray-800 uppercase tracking-wider">Bed</th>
                <th className="py-2 px-2 text-[10px] font-bold text-gray-800 uppercase tracking-wider">Status</th>
                <th className="py-2 px-2 text-[10px] font-bold text-gray-800 uppercase tracking-wider text-right">Paid</th>
                <th className="py-2 px-2 text-[10px] font-bold text-gray-800 uppercase tracking-wider text-right">Refund</th>
                <th className="py-2 px-2 text-[10px] font-bold text-gray-800 uppercase tracking-wider text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.booking_id} className="border-b border-gray-200">
                  <td className="py-2 px-2 text-[11px] text-gray-600 whitespace-nowrap">{new Date(row.transaction_date).toLocaleDateString('en-IN')}</td>
                  <td className="py-2 px-2 text-[11px] font-mono text-gray-900 whitespace-nowrap">{row.reference}</td>
                  <td className="py-2 px-2 text-[11px] text-gray-900">{row.guest_name}</td>
                  <td className="py-2 px-2 text-[11px] font-mono text-gray-900">{row.bed_code}</td>
                  <td className={`py-2 px-2 text-[10px] capitalize font-medium whitespace-nowrap ${STATUS_COLORS[row.status] || 'text-gray-600'}`}>
                    {row.status.replace('_', ' ')}
                  </td>
                  <td className="py-2 px-2 text-[11px] text-right tabular-nums text-gray-900">{formatCurrencyINR(row.amount_paid)}</td>
                  <td className="py-2 px-2 text-[11px] text-right tabular-nums text-gray-900">{row.amount_refunded > 0 ? formatCurrencyINR(row.amount_refunded) : '—'}</td>
                  <td className="py-2 px-2 text-[11px] text-right tabular-nums font-bold text-gray-900">{formatCurrencyINR(row.net_amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-800 font-bold bg-gray-50">
                <td className="py-3 px-2 text-[11px] text-gray-900" colSpan={5}>Totals</td>
                <td className="py-3 px-2 text-[11px] text-right tabular-nums text-gray-900">{formatCurrencyINR(totals.paid)}</td>
                <td className="py-3 px-2 text-[11px] text-right tabular-nums text-gray-900">{totals.refunded > 0 ? formatCurrencyINR(totals.refunded) : '—'}</td>
                <td className="py-3 px-2 text-[11px] text-right tabular-nums text-brand-900">{formatCurrencyINR(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-12 flex justify-between border-t border-line pt-4 text-[10px] text-muted">
          <p>This is a system-generated report from the Admin Control Room.</p>
          <p>Page 1 of 1</p>
        </div>

      </div>
    </div>
  );
}