import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { getMyBookings, getMyTickets, claimBooking } from '../../lib/portal';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', pending_payment: 'Pending payment', pending_approval: 'Pending approval',
  confirmed: 'Confirmed', checked_in: 'Checked in', completed: 'Completed',
  cancelled: 'Cancelled', no_show: 'No show', expired: 'Expired',
};

export function DashboardPage() {
  const bookings = useAsync(getMyBookings, []);
  const tickets = useAsync(getMyTickets, []);

  const [ref, setRef] = useState('');
  const [email, setEmail] = useState('');
  const [claimState, setClaimState] = useState<'idle' | 'linking' | 'done' | 'error'>('idle');
  const [claimError, setClaimError] = useState<string | null>(null);

  if (bookings.status === 'loading' || tickets.status === 'loading') return <Spinner />;
  if (bookings.status === 'error') return <ErrorState message={bookings.error.message} />;
  if (tickets.status === 'error') return <ErrorState message={tickets.error.message} />;

  const now = Date.now();
  const upcoming = bookings.data
    .filter((b) => ['pending_payment', 'pending_approval', 'confirmed'].includes(b.status)
                 && new Date(b.starts_at).getTime() > now)
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const current = bookings.data.filter(
    (b) => b.status === 'checked_in'
        || (b.status === 'confirmed'
            && new Date(b.starts_at).getTime() <= now
            && new Date(b.ends_at).getTime() > now),
  );
  const openTickets = tickets.data.filter((t) => t.status === 'open' || t.status === 'in_progress');

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setClaimState('linking');
    setClaimError(null);
    try {
      await claimBooking(ref, email);
      setClaimState('done');
      setRef(''); setEmail('');
      // Trigger a refresh by reloading the page — acceptable for this scope.
      window.location.reload();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Could not link booking');
      setClaimState('error');
    }
  }

  return (
    <>
      <PageHeader eyebrow="Portal" title="Your dashboard" />

      <div className="space-y-6">
        {current.length > 0 && (
          <SectionCard title="Current stay">
            {current.map((b) => (
              <div key={b.id} className="rounded-input border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm text-ink">{b.reference}</span>
                  <span className="text-xs text-muted">{STATUS_LABEL[b.status] ?? b.status}</span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Checkout {formatDateTime(b.ends_at)}
                </p>
                <Link to={`/portal/bookings/${b.id}`} className="mt-3 inline-block text-sm text-brand-900 hover:underline">
                  View details →
                </Link>
              </div>
            ))}
          </SectionCard>
        )}

        <SectionCard title="Upcoming bookings">
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming bookings."
              body="Book a stay from the home page to see it here."
              action={<Link to="/book"><Button>Start a booking</Button></Link>}
            />
          ) : (
            <ul className="space-y-3">
              {upcoming.slice(0, 3).map((b) => (
                <li key={b.id} className="rounded-input border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm text-ink">{b.reference}</span>
                    <span className="text-xs text-muted">{STATUS_LABEL[b.status] ?? b.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatDateTime(b.starts_at)} → {formatDateTime(b.ends_at)}
                  </p>
                  {b.total_paise != null && (
                    <p className="text-sm text-ink">{formatCurrencyINR(b.total_paise)}</p>
                  )}
                  <Link to={`/portal/bookings/${b.id}`} className="mt-2 inline-block text-sm text-brand-900 hover:underline">
                    View details →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Support">
          {openTickets.length === 0 ? (
            <p className="text-sm text-muted">No open tickets.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {openTickets.slice(0, 3).map((t) => (
                <li key={t.id} className="rounded-input border border-line p-3">
                  <Link to={`/portal/support/${t.id}`} className="text-ink hover:underline">
                    {t.subject}
                  </Link>
                  <span className="ml-2 text-xs text-muted">{t.status.replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/portal/support" className="mt-3 inline-block text-sm text-brand-900 hover:underline">
            All tickets →
          </Link>
        </SectionCard>

        <SectionCard title="Link an existing booking" subtitle="If you booked as a guest without signing in">
          <form onSubmit={handleClaim} className="grid gap-3 sm:grid-cols-2">
            <Field label="Booking reference" htmlFor="claim-ref" required>
              <input id="claim-ref" className={`${inputClass} uppercase`} value={ref} onChange={(e) => setRef(e.target.value)} />
            </Field>
            <Field label="Email used at booking" htmlFor="claim-email" required>
              <input id="claim-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={claimState === 'linking'}>Link booking</Button>
            </div>
            {claimError && <p role="alert" className="text-sm text-[#B3261E] sm:col-span-2">{claimError}</p>}
          </form>
        </SectionCard>
      </div>
    </>
  );
}