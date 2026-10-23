import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getBookingsList } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { inputClass } from '../../components/Field';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

const STATUSES = ['all','draft','pending_payment','pending_approval','confirmed','checked_in','completed','cancelled','no_show','expired'];

export function AdminBookingsPage() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  const list = useAsync(
    () => getBookingsList({
      status: status === 'all' ? null : status,
      search: search.trim() || null,
      limit: 100,
    }),
    [status, search],
  );

  return (
    <>
      <PageHeader eyebrow="Operations" title="Bookings" intro="All bookings across the property." />

      <div className="mb-4 flex flex-wrap gap-3">
        <select className={`${inputClass} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_',' ')}</option>
          ))}
        </select>
        <input className={`${inputClass} w-auto`} placeholder="Search reference or guest name"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {list.status === 'loading' && <Spinner />}
      {list.status === 'error' && <ErrorState message={list.error.message} />}
      {list.status === 'success' && list.data.length === 0 && (
        <EmptyState title="No bookings match." body="Adjust the filter or search." />
      )}

      {list.status === 'success' && list.data.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-bg text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Bed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((b) => (
                <tr key={b.id} className="border-t border-line">
                  <td className="px-4 py-3 font-mono">
                    <Link to={`/admin/bookings/${b.id}`} className="text-brand-900 hover:underline">
                      {b.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{b.guest_name ?? '—'}<br /><span className="text-xs text-muted">{b.guest_email ?? ''}</span></td>
                  <td className="px-4 py-3 font-mono">{b.space_code ?? '—'}</td>
                  <td className="px-4 py-3">{b.status.replace('_',' ')}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDateTime(b.starts_at)}<br />→ {formatDateTime(b.ends_at)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{b.total_paise != null ? formatCurrencyINR(b.total_paise) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}