import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import {
  getMyBooking, getMySpace, getMyExtensionRequests,
  requestExtension, cancelMyBooking,
} from '../../lib/portal';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', pending_payment: 'Pending payment', pending_approval: 'Pending approval',
  confirmed: 'Confirmed', checked_in: 'Checked in', completed: 'Completed',
  cancelled: 'Cancelled', no_show: 'No show', expired: 'Expired',
};

export function MyBookingDetailPage() {
  const { id = '' } = useParams();
  const booking = useAsync(() => getMyBooking(id), [id]);
  const space = useAsync(() => getMySpace(id), [id]);
  const extensions = useAsync(() => getMyExtensionRequests(id), [id]);

  const [extDate, setExtDate] = useState('');
  const [extTime, setExtTime] = useState('');
  const [extReason, setExtReason] = useState('');
  const [extState, setExtState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [extError, setExtError] = useState<string | null>(null);

  const [cancelReason, setCancelReason] = useState('');
  const [cancelState, setCancelState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [refundInfo, setRefundInfo] = useState<{ refund_paise: number; refund_percent: number } | null>(null);

  if (booking.status === 'loading') return <Spinner />;
  if (booking.status === 'error') return <ErrorState message={booking.error.message} />;
  if (!booking.data) return <ErrorState message="Booking not found." />;

  const b = booking.data;
  const canCancel = ['pending_payment', 'pending_approval', 'confirmed'].includes(b.status);
  const canExtend = ['confirmed', 'checked_in'].includes(b.status);

  async function handleExtend(e: React.FormEvent) {
    e.preventDefault();
    if (!extDate || !extTime) return;
    setExtState('sending');
    setExtError(null);
    try {
      const newEnd = new Date(`${extDate}T${extTime}:00`).toISOString();
      await requestExtension({ booking_id: b.id, requested_new_end: newEnd, reason: extReason || null });
      setExtState('done');
      setExtDate(''); setExtTime(''); setExtReason('');
    } catch (err) {
      setExtError(err instanceof Error ? err.message : 'Request failed');
      setExtState('error');
    }
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm('Cancel this booking? This cannot be undone.')) return;
    setCancelState('sending');
    setCancelError(null);
    try {
      const res = await cancelMyBooking(b.id, cancelReason || null);
      setRefundInfo(res);
      setCancelState('done');
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Cancellation failed');
      setCancelState('error');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Booking"
        title={b.reference}
        intro={STATUS_LABEL[b.status] ?? b.status}
        actions={
          <div className="flex gap-3">
            <Link to={`/portal/receipt/${b.id}`} className="inline-flex items-center justify-center rounded-input border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
              View Receipt
            </Link>
            <Link to="/portal/bookings" className="inline-flex items-center justify-center rounded-input px-4 py-2 text-sm font-medium text-brand-900 hover:underline">
              ← All bookings
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        <SectionCard title="Stay details">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Accommodation</dt><dd className="text-ink">{b.product_type.replaceAll('_', ' ')}</dd></div>
            <div><dt className="text-muted">Status</dt><dd className="text-ink">{STATUS_LABEL[b.status] ?? b.status}</dd></div>
            <div><dt className="text-muted">Check-in</dt><dd className="text-ink">{formatDateTime(b.starts_at)}</dd></div>
            <div><dt className="text-muted">Checkout</dt><dd className="text-ink">{formatDateTime(b.ends_at)}</dd></div>
            <div><dt className="text-muted">Total</dt><dd className="text-ink">{b.total_paise != null ? formatCurrencyINR(b.total_paise) : '—'}</dd></div>
            <div><dt className="text-muted">Email</dt><dd className="text-ink">{b.primary_contact_email ?? '—'}</dd></div>
          </dl>
        </SectionCard>

        <SectionCard title="Assigned sleeping space" subtitle="Allocation is confirmed at check-in">
          {space.status === 'success' && space.data ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Space</dt><dd className="font-mono text-ink">{space.data.space_code}</dd></div>
              <div><dt className="text-muted">Section</dt><dd className="text-ink">{space.data.section_name}</dd></div>
              <div><dt className="text-muted">Position</dt><dd className="text-ink">{space.data.position}</dd></div>
              <div><dt className="text-muted">Assigned at</dt><dd className="text-ink">{formatDateTime(space.data.assigned_at)}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-muted">
              A space has not yet been assigned. Property staff will assign the exact bed at check-in.
            </p>
          )}
        </SectionCard>

        {extensions.status === 'success' && extensions.data.length > 0 && (
          <SectionCard title="Extension requests">
            <ul className="space-y-2 text-sm">
              {extensions.data.map((e) => (
                <li key={e.id} className="rounded-input border border-line p-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-ink">Requested new checkout: {formatDateTime(e.requested_new_end)}</span>
                    <span className="text-xs text-muted">{e.status}</span>
                  </div>
                  {e.quoted_extra_paise != null && (
                    <p className="mt-1 text-muted">Extra: {formatCurrencyINR(e.quoted_extra_paise)}</p>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {canExtend && (
          <SectionCard title="Request an extension" subtitle="Subject to availability and staff approval">
            <form onSubmit={handleExtend} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="New checkout date" htmlFor="ext-date" required>
                  <input id="ext-date" type="date" className={inputClass}
                         value={extDate}
                         min={b.ends_at.slice(0, 10)}
                         onChange={(e) => setExtDate(e.target.value)} />
                </Field>
                <Field label="New checkout time" htmlFor="ext-time" required>
                  <input id="ext-time" type="time" className={inputClass}
                         value={extTime}
                         onChange={(e) => setExtTime(e.target.value)} />
                </Field>
              </div>
              <Field label="Reason (optional)" htmlFor="ext-reason">
                <textarea id="ext-reason" rows={2} className={inputClass}
                          value={extReason} onChange={(e) => setExtReason(e.target.value)} />
              </Field>
              <Button type="submit" loading={extState === 'sending'} disabled={extState === 'done'}>
                {extState === 'done' ? 'Request submitted' : 'Submit request'}
              </Button>
              {extError && <p role="alert" className="text-sm text-[#B3261E]">{extError}</p>}
            </form>
          </SectionCard>
        )}

        {canCancel && (
          <SectionCard title="Cancel this booking">
            {refundInfo ? (
              <p className="text-sm text-ink">
                Booking cancelled. Refund of {formatCurrencyINR(refundInfo.refund_paise)}
                {' '}({refundInfo.refund_percent}% of accommodation charges) will be processed
                according to the cancellation policy.
              </p>
            ) : (
              <form onSubmit={handleCancel} className="space-y-3">
                <Field label="Reason (optional)" htmlFor="cancel-reason">
                  <textarea id="cancel-reason" rows={2} className={inputClass}
                            value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                </Field>
                <Button type="submit" variant="danger" loading={cancelState === 'sending'}>
                  Cancel booking
                </Button>
                {cancelError && <p role="alert" className="text-sm text-[#B3261E]">{cancelError}</p>}
              </form>
            )}
          </SectionCard>
        )}
      </div>
    </>
  );
}