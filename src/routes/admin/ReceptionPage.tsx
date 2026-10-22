import { useOutletContext } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getBookingsList, checkInBooking, checkOutBooking } from '../../lib/admin';
import type { AdminOutletContext } from '../../components/Guards';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

export function AdminReceptionPage() {
  const { permissions } = useOutletContext<AdminOutletContext>();
  const canOperate = permissions.includes('reception.operate');

  const arrivals = useAsync(() => getBookingsList({ status: 'confirmed', limit: 100 }), []);
  const inHouse = useAsync(() => getBookingsList({ status: 'checked_in', limit: 100 }), []);

  if (arrivals.status === 'loading' || inHouse.status === 'loading') return <Spinner />;
  if (arrivals.status === 'error') return <ErrorState message={arrivals.error.message} />;
  if (inHouse.status === 'error') return <ErrorState message={inHouse.error.message} />;

  const now = Date.now();
  const todaysArrivals = arrivals.data.filter((b) => {
    const d = new Date(b.starts_at);
    return d.toDateString() === new Date(now).toDateString();
  });
  const overdue = inHouse.data.filter((b) => new Date(b.ends_at).getTime() < now);

  async function doCheckIn(id: string) {
    try { await checkInBooking(id); window.location.reload(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  }
  async function doCheckOut(id: string) {
    if (!confirm('Check out this guest?')) return;
    try { await checkOutBooking(id); window.location.reload(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  }

  return (
    <>
      <PageHeader eyebrow="Operations" title="Reception" intro="Arrivals to process, current guests to check out, and overdue stays." />

      <div className="space-y-6">
        <SectionCard title="Today's arrivals" subtitle="Confirmed bookings starting today">
          {todaysArrivals.length === 0 ? (
            <EmptyState title="No arrivals today." body="Guests with bookings starting today will appear here." />
          ) : (
            <ul className="space-y-2">
              {todaysArrivals.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-line p-3">
                  <div>
                    <p className="font-mono text-sm text-ink">{b.reference}</p>
                    <p className="text-xs text-muted">
                      {b.guest_name ?? '—'} · {formatDateTime(b.starts_at)} · {b.space_code ?? 'unassigned'}
                    </p>
                  </div>
                  {canOperate && (
                    <Button onClick={() => doCheckIn(b.id)}>Check in</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Overdue stays" subtitle="Checked-in bookings past their scheduled checkout">
          {overdue.length === 0 ? (
            <p className="text-sm text-muted">No overdue stays.</p>
          ) : (
            <ul className="space-y-2">
              {overdue.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-[#FBEAE8] bg-[#FBEAE8] p-3">
                  <div>
                    <p className="font-mono text-sm text-[#7A1A15]">{b.reference}</p>
                    <p className="text-xs text-[#7A1A15]">Scheduled checkout {formatDateTime(b.ends_at)}</p>
                  </div>
                  {canOperate && (
                    <Button onClick={() => doCheckOut(b.id)}>Check out</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Currently checked in">
          {inHouse.data.length === 0 ? (
            <p className="text-sm text-muted">No guests currently checked in.</p>
          ) : (
            <ul className="space-y-2">
              {inHouse.data.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-line p-3">
                  <div>
                    <p className="font-mono text-sm text-ink">{b.reference}</p>
                    <p className="text-xs text-muted">
                      {b.guest_name ?? '—'} · checkout {formatDateTime(b.ends_at)} · bed {b.space_code ?? '—'}
                    </p>
                    {b.total_paise != null && (
                      <p className="text-xs text-muted">Paid {formatCurrencyINR(b.total_paise)}</p>
                    )}
                  </div>
                  {canOperate && (
                    <Button variant="secondary" onClick={() => doCheckOut(b.id)}>Check out</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}