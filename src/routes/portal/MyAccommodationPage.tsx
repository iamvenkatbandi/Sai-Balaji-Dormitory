import { Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getMyBookings, getMySpace, type MyBooking, type MySpace } from '../../lib/portal';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { formatDateTime } from '../../lib/format';

interface Row extends MyBooking { space: MySpace | null; }

export function MyAccommodationPage() {
  const bookings = useAsync(getMyBookings, []);

  const activeBookings = bookings.status === 'success'
    ? bookings.data.filter((b) => ['confirmed', 'checked_in'].includes(b.status))
    : [];

  const rows = useAsync<Row[]>(async () => {
    const out: Row[] = [];
    for (const b of activeBookings) {
      const space = await getMySpace(b.id).catch(() => null);
      out.push({ ...b, space });
    }
    return out;
  }, [bookings.status === 'success' ? activeBookings.map((b) => b.id).join(',') : '']);

  if (bookings.status === 'loading' || rows.status === 'loading') return <Spinner />;
  if (bookings.status === 'error') return <ErrorState message={bookings.error.message} />;
  if (rows.status === 'error') return <ErrorState message={rows.error.message} />;

  return (
    <>
      <PageHeader eyebrow="Portal" title="My accommodation" />
      {rows.data.length === 0 ? (
        <EmptyState
          title="No active accommodation."
          body="You have no confirmed or checked-in bookings."
          action={<Link to="/book"><Button>Book a stay</Button></Link>}
        />
      ) : (
        <div className="space-y-6">
          {rows.data.map((b) => (
            <SectionCard
              key={b.id}
              title={b.reference}
              subtitle={`${b.product_type.replaceAll('_', ' ')} — ${b.status.replace('_', ' ')}`}
            >
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">Check-in</dt><dd className="text-ink">{formatDateTime(b.starts_at)}</dd></div>
                <div><dt className="text-muted">Checkout</dt><dd className="text-ink">{formatDateTime(b.ends_at)}</dd></div>
                {b.space ? (
                  <>
                    <div><dt className="text-muted">Space</dt><dd className="font-mono text-ink">{b.space.space_code}</dd></div>
                    <div><dt className="text-muted">Section</dt><dd className="text-ink">{b.space.section_name}</dd></div>
                    <div><dt className="text-muted">Position</dt><dd className="text-ink">{b.space.position}</dd></div>
                  </>
                ) : (
                  <div className="sm:col-span-2 text-muted">
                    Exact space will be assigned by staff at check-in.
                  </div>
                )}
              </dl>
              <Link to={`/portal/bookings/${b.id}`} className="mt-3 inline-block text-sm text-brand-900 hover:underline">
                View booking →
              </Link>
            </SectionCard>
          ))}
        </div>
      )}
    </>
  );
}