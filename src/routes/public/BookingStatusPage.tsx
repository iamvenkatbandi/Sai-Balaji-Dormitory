import { useState } from 'react';
import { lookupBooking } from '../../lib/queries';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { formatDateTime } from '../../lib/format';
import type { BookingStatusRow } from '../../lib/database.types';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_payment: 'Pending payment',
  pending_approval: 'Pending approval',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
  expired: 'Expired',
};

export function BookingStatusPage() {
  const [reference, setReference] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<BookingStatusRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const row = await lookupBooking(reference, contact);
      setResult(row);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Booking status"
        title="Look up your booking"
        intro="Enter the reference from your confirmation email along with the email address or phone number you booked with."
      />

      <form onSubmit={onSubmit} className="grid max-w-2xl gap-4 rounded-card border border-line bg-surface p-6 sm:grid-cols-2">
        <Field label="Booking reference" htmlFor="bs-ref" required>
          <input id="bs-ref" className={`${inputClass} uppercase`} value={reference} onChange={(e) => setReference(e.target.value)} required />
        </Field>
        <Field label="Email or phone" htmlFor="bs-contact" required>
          <input id="bs-contact" className={inputClass} value={contact} onChange={(e) => setContact(e.target.value)} required />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" loading={loading}>Look up booking</Button>
        </div>
        {error && <p role="alert" className="text-sm text-[#B3261E] sm:col-span-2">{error}</p>}
      </form>

      <div className="mt-6 max-w-2xl">
        {searched && !result && (
          <EmptyState title="No booking found." body="Check the reference and the email or phone used at booking." />
        )}
        {result && (
          <div className="rounded-card border border-line bg-surface p-6">
            <p className="text-sm text-muted">Reference</p>
            <p className="font-mono text-lg font-medium text-ink">{result.reference}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Status</dt><dd className="text-ink">{STATUS_LABEL[result.status] ?? result.status}</dd></div>
              <div><dt className="text-muted">Accommodation</dt><dd className="text-ink">{result.product_type.replaceAll('_', ' ')}</dd></div>
              <div><dt className="text-muted">Check-in</dt><dd className="text-ink">{formatDateTime(result.starts_at)}</dd></div>
              <div><dt className="text-muted">Checkout</dt><dd className="text-ink">{formatDateTime(result.ends_at)}</dd></div>
            </dl>
          </div>
        )}
      </div>
    </>
  );
}