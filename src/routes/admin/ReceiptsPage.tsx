import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getBookingsList } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

export function AdminReceiptsPage() {
  const [search, setSearch] = useState('');
  
  // Reusing the admin_bookings_list RPC but filtering for statuses that generate receipts
  const receipts = useAsync(() => getBookingsList({ search: search || null, limit: 100 }), [search]);

  if (receipts.status === 'loading') return <Spinner />;
  if (receipts.status === 'error') return <ErrorState message={receipts.error.message} />;

  // Filter for bookings that actually have a receipt (paid/confirmed)
  const validReceipts = receipts.data.filter(b => 
    ['confirmed', 'checked_in', 'completed'].includes(b.status) && b.total_paise != null
  );

  return (
    <>
      <PageHeader 
        eyebrow="Finance" 
        title="Generated Receipts" 
        intro="View and download receipts for all confirmed bookings."
      />

      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Search by Reference or Guest Name"
          className="w-full max-w-md rounded-input border border-line bg-surface px-4 py-2 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {validReceipts.length === 0 ? (
        <EmptyState 
          title="No receipts found." 
          body="Receipts are automatically generated once a booking is confirmed and paid." 
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg text-xs uppercase tracking-wide text-muted border-b border-line">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Guest</th>
                <th className="px-4 py-3 font-semibold">Date Issued</th>
                <th className="px-4 py-3 font-semibold text-right">Amount Paid</th>
                <th className="px-4 py-3 font-semibold text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {validReceipts.map((b) => (
                <tr key={b.id} className="hover:bg-bg/50 transition">
                  <td className="px-4 py-3 font-mono font-medium text-ink">{b.reference}</td>
                  <td className="px-4 py-3 text-ink">{b.guest_name || '—'}</td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(b.starts_at).split(',')[0]}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-brand-900">
                    {formatCurrencyINR(b.total_paise!)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link 
                      to={`/admin/receipt/${b.id}`} 
                      className="inline-block rounded border border-line bg-white px-3 py-1 text-xs font-medium text-ink hover:bg-bg transition"
                    >
                      View / Print
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}