import { useAsync } from '../../lib/useAsync';
import { getMyPayments } from '../../lib/portal';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

export function PaymentsPage() {
  const payments = useAsync(getMyPayments, []);

  if (payments.status === 'loading') return <Spinner />;
  if (payments.status === 'error') return <ErrorState message={payments.error.message} />;

  return (
    <>
      <PageHeader eyebrow="Portal" title="Payments" />
      {payments.data.length === 0 ? (
        <EmptyState title="No payments yet." body="Once you complete a booking payment, it will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-bg text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Verified</th>
              </tr>
            </thead>
            <tbody>
              {payments.data.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-3 font-mono">{p.booking_reference}</td>
                  <td className="px-4 py-3 tabular-nums">{formatCurrencyINR(p.amount_paise)}</td>
                  <td className="px-4 py-3">{p.status}</td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(p.created_at)}</td>
                  <td className="px-4 py-3 text-muted">{p.verified_at ? formatDateTime(p.verified_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}