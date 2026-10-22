import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getMyBookings, createTicket } from '../../lib/portal';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';

export function NewSupportPage() {
  const navigate = useNavigate();
  const bookings = useAsync(getMyBookings, []);

  const [category, setCategory] = useState<'booking'|'facility'|'safety'|'billing'|'other'>('booking');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<'low'|'normal'|'high'|'urgent'>('normal');
  const [body, setBody] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [state, setState] = useState<'idle'|'sending'|'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (bookings.status === 'loading') return <Spinner />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setError(null);
    try {
      const id = await createTicket({
        category, subject, priority, body,
        booking_id: bookingId || null,
      });
      navigate(`/portal/support/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create ticket');
      setState('error');
    }
  }

  return (
    <>
      <PageHeader eyebrow="Support" title="New support request" />
      <SectionCard title="Request details">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category" htmlFor="cat" required>
              <select id="cat" className={inputClass} value={category}
                      onChange={(e) => setCategory(e.target.value as any)}>
                <option value="booking">Booking</option>
                <option value="facility">Facility</option>
                <option value="safety">Safety</option>
                <option value="billing">Billing</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Priority" htmlFor="prio" required>
              <select id="prio" className={inputClass} value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
          </div>
          {bookings.status === 'success' && bookings.data.length > 0 && (
            <Field label="Related booking (optional)" htmlFor="booking">
              <select id="booking" className={inputClass} value={bookingId}
                      onChange={(e) => setBookingId(e.target.value)}>
                <option value="">— None —</option>
                {bookings.data.map((b) => (
                  <option key={b.id} value={b.id}>{b.reference}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Subject" htmlFor="subj" required>
            <input id="subj" className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </Field>
          <Field label="Details" htmlFor="body" required>
            <textarea id="body" rows={5} className={inputClass} value={body} onChange={(e) => setBody(e.target.value)} required />
          </Field>
          <Button type="submit" loading={state === 'sending'}>Submit</Button>
          {error && <p role="alert" className="text-sm text-[#B3261E]">{error}</p>}
        </form>
      </SectionCard>
    </>
  );
}