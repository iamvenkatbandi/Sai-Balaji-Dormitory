import { Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getMyBookings } from '../../lib/portal';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', pending_payment: 'Pending payment', pending_approval: 'Pending approval',
  confirmed: 'Confirmed', checked_in: 'Checked in', completed: 'Completed',
  cancelled: 'Cancelled', no_show: 'No show', expired: 'Expired',
};

export function MyBookingsPage() {
  const bookings = useAsync(getMyBookings, []);

  if (bookings.status === 'loading') return <Spinner />;
  if (bookings.status === 'error') return <ErrorState message={bookings.error.message} />;

  const now = Date.now();
  const groups = {
    upcoming: bookings.data.filter((b) =>
      ['pending_payment', 'pending_approval', 'confirmed'].includes(b.status)
      && new Date(b.starts_at).getTime() > now),
    current: bookings.data.filter((b) =>
      b.status === 'checked_in'
      || (b.status === 'confirmed'
          && new Date(b.starts_at).getTime() <= now
          && new Date(b.ends_at).getTime() > now)),
    past: bookings.data.filter((b) =>
      ['completed', 'cancelled', 'expired', 'no_show'].includes(b.status)
      || (b.status === 'checked_in' && new Date(b.ends_at).getTime() <= now)),
  };

  return (
    <>
      <PageHeader eyebrow="Portal" title="My bookings" actions={
        <Link to="/book"><Button>Book a new stay</Button></Link>
      } />

      {bookings.data.length === 0 ? (
        <EmptyState
          title="No bookings yet."
          body="Bookings you make will appear here."
          action={<Link to="/book"><Button>Start a booking</Button></Link>}
        />
      ) : (
        <div className="space-y-8">
          <Group title="Current" items={groups.current} />
          <Group title="Upcoming" items={groups.upcoming} />
          <Group title="Past" items={groups.past} />
        </div>
      )}
    </>
  );
}

function Group({ title, items }: { title: string; items: any[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-ink">{title}</h2>
      <ul className="space-y-3">
        {items.map((b) => (
          <li key={b.id} className="rounded-card border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-ink">{b.reference}</p>
                <p className="text-xs text-muted">{b.product_type.replaceAll('_', ' ')}</p>
              </div>
              <span className="rounded-full bg-bg px-3 py-1 text-xs text-ink">
                {STATUS_LABEL[b.status] ?? b.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {formatDateTime(b.starts_at)} → {formatDateTime(b.ends_at)}
            </p>
            {b.total_paise != null && (
              <p className="text-sm text-ink">{formatCurrencyINR(b.total_paise)}</p>
            )}
            <Link to={`/portal/bookings/${b.id}`} className="mt-3 inline-block text-sm text-brand-900 hover:underline">
              View details →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}