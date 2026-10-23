import { useState } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getBookingDetailFull, cancelBookingAdmin, markNoShow, checkInBooking, checkOutBooking } from '../../lib/admin';
import type { AdminOutletContext } from '../../components/Guards';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

export function AdminBookingDetailPage() {
  const { id = '' } = useParams();
  const { permissions } = useOutletContext<AdminOutletContext>();
  const detail = useAsync(() => getBookingDetailFull(id), [id]);
  const [actionState, setActionState] = useState<'idle' | 'working' | 'error'>('idle');
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundInfo, setRefundInfo] = useState<{ refund_paise: number; refund_percent: number } | null>(null);

  const canOperate = permissions.includes('reception.operate');
  const canManage = permissions.includes('bookings.manage');

  if (detail.status === 'loading') return <Spinner />;
  if (detail.status === 'error') return <ErrorState message={detail.error.message} />;

  const { booking, guests, payments, spaces } = detail.data;

  async function run(fn: () => Promise<unknown>) {
    setActionState('working'); setActionErr(null);
    try { await fn(); window.location.reload(); }
    catch (e) { setActionErr(e instanceof Error ? e.message : 'Action failed'); setActionState('error'); }
  }

  async function handleCancel() {
    if (!confirm('Cancel this booking? This action cannot be undone.')) return;
    setActionState('working'); setActionErr(null);
    try {
      const res = await cancelBookingAdmin(booking.id, cancelReason || null);
      setRefundInfo(res);
      setActionState('idle');
      window.location.reload();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Cancellation failed');
      setActionState('error');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Booking"
        title={booking.reference}
        intro={`${booking.status.replace('_', ' ')} · ${booking.product_type.replaceAll('_', ' ')}`}
        actions={
          <div className="flex gap-3">
            <Link to={`/admin/receipt/${booking.id}`} className="inline-flex items-center justify-center rounded-input border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
              Print Receipt
            </Link>
            <Link to="/admin/bookings" className="inline-flex items-center justify-center rounded-input px-4 py-2 text-sm font-medium text-brand-900 hover:underline">
              ← All bookings
            </Link>
          </div>
        }
      />

      {actionErr && <div className="mb-4"><ErrorState message={actionErr} /></div>}

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="Stay">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Status</dt><dd className="text-ink">{booking.status.replace('_', ' ')}</dd></div>
            <div><dt className="text-muted">Total</dt><dd className="text-ink">{booking.total_paise != null ? formatCurrencyINR(booking.total_paise) : '—'}</dd></div>
            <div><dt className="text-muted">Check-in</dt><dd className="text-ink">{formatDateTime(booking.starts_at)}</dd></div>
            <div><dt className="text-muted">Checkout</dt><dd className="text-ink">{formatDateTime(booking.ends_at)}</dd></div>
            <div><dt className="text-muted">Email</dt><dd className="text-ink">{booking.primary_contact_email ?? '—'}</dd></div>
            <div><dt className="text-muted">Phone</dt><dd className="text-ink">{booking.primary_contact_phone ?? '—'}</dd></div>
          </dl>
        </SectionCard>

        <SectionCard title="Assigned spaces">
          {spaces.length === 0 ? (
            <p className="text-sm text-muted">Not assigned.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {spaces.map((s) => (
                <li key={s.space_id} className="rounded-input border border-line p-2">
                  <span className="font-mono text-ink">{s.code}</span>
                  <span className="ml-2 text-xs text-muted">{s.position}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <SectionCard title="Guests">
          <ul className="space-y-2 text-sm">
            {guests.map((g) => (
              <li key={g.id} className="rounded-input border border-line p-3">
                <p className="text-ink">{g.full_name}{g.is_primary ? ' (primary)' : ''}</p>
                <p className="text-xs text-muted">{g.gender}{g.age_years != null ? ` · ${g.age_years}y` : ''}</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Payments">
          {payments.length === 0 ? (
            <p className="text-sm text-muted">No payments recorded.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="rounded-input border border-line p-2">
                  <div className="flex justify-between">
                    <span className="tabular-nums text-ink">{formatCurrencyINR(p.amount_paise)}</span>
                    <span className="text-xs text-muted">{p.status}</span>
                  </div>
                  <p className="text-xs text-muted">{formatDateTime(p.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {(canOperate || canManage) && (
        <SectionCard title="Actions" className="mt-6">
          <div className="flex flex-wrap gap-3">
            {canOperate && booking.status === 'confirmed' && (
              <Button onClick={() => run(() => checkInBooking(booking.id))} loading={actionState === 'working'}>
                Check in
              </Button>
            )}
            {canOperate && booking.status === 'checked_in' && (
              <Button onClick={() => run(() => checkOutBooking(booking.id))} loading={actionState === 'working'}>
                Check out
              </Button>
            )}
            {canManage && (booking.status === 'confirmed' || booking.status === 'pending_approval') && (
              <Button variant="secondary" onClick={() => run(() => markNoShow(booking.id))} loading={actionState === 'working'}>
                Mark no-show
              </Button>
            )}
          </div>

          {canManage && ['pending_payment', 'pending_approval', 'confirmed'].includes(booking.status) && (
            <div className="mt-6 border-t border-line pt-4">
              <h3 className="text-sm font-semibold text-ink">Cancel booking</h3>
              {refundInfo ? (
                <p className="mt-2 text-sm text-ink">
                  Refund of {formatCurrencyINR(refundInfo.refund_paise)} ({refundInfo.refund_percent}%) will be processed per policy.
                </p>
              ) : (
                <>
                  <Field label="Reason (optional)" htmlFor="cancel-reason">
                    <textarea id="cancel-reason" rows={2} className={`${inputClass} mt-2`}
                      value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                  </Field>
                  <div className="mt-3">
                    <Button variant="danger" onClick={handleCancel} loading={actionState === 'working'}>
                      Cancel booking
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </SectionCard>
      )}
    </>
  );
}