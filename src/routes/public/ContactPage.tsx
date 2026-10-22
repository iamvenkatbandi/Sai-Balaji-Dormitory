import { useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { getContact, getSettings } from '../../lib/queries';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Field, inputClass } from '../../components/Field';
import { Button } from '../../components/Button';
import { NotConfiguredNotice } from '../../components/NotConfiguredNotice';

export function ContactPage() {
  const contact = useAsync(getContact, []);
  const settings = useAsync(getSettings, []);
  const c = contact.status === 'success' ? contact.data : null;
  const s = settings.status === 'success' ? settings.data : null;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    // Enquiry submission is wired in a later phase alongside notifications.
    // Until then, surface a clear, honest state rather than pretending it sent.
    setTimeout(() => setState('error'), 400);
  }

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to Sai Balaji Dormitory"
        intro="Verified contact details appear here once the property publishes them."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="Property details">
          {c?.address_line || c?.phone ? (
            <address className="not-italic text-sm text-muted">
              {c.address_line && <p>{c.address_line}</p>}
              {c.locality && <p>{c.locality}</p>}
              {c.region && <p>{c.region}{c.postal_code ? ` — ${c.postal_code}` : ''}</p>}
              {c.phone && <p className="mt-2">Phone: {c.phone}</p>}
              {c.email && <p>Email: {c.email}</p>}
              {c.map_url && (
                <p className="mt-2"><a href={c.map_url} className="underline" target="_blank" rel="noreferrer">Open map</a></p>
              )}
            </address>
          ) : (
            <NotConfiguredNotice
              title="Contact details are being finalised."
              body="No address, phone number, email or map location will be shown until the property verifies them."
            />
          )}
        </SectionCard>

        <SectionCard title="Send an enquiry" subtitle="Available once enquiries are enabled">
          {s && !s.enquiries_enabled ? (
            <NotConfiguredNotice
              title="Enquiries are currently closed."
              body="The property is not accepting online enquiries at this time."
            />
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Your name" htmlFor="enq-name" required>
                <input id="enq-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Email" htmlFor="enq-email" required>
                <input id="enq-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Field>
              <Field label="Message" htmlFor="enq-message" required>
                <textarea id="enq-message" rows={4} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} required />
              </Field>
              <Button type="submit" loading={state === 'sending'} disabled={state === 'sent'}>
                {state === 'sent' ? 'Enquiry sent' : 'Send enquiry'}
              </Button>
              {state === 'error' && (
                <p role="alert" className="text-sm text-[#B3261E]">
                  Enquiry submission is not yet wired up. Please use the property’s verified contact
                  details when they are published.
                </p>
              )}
              {state === 'sent' && (
                <p role="status" className="text-sm text-[#2E7D5B]">Thank you — the property will be in touch.</p>
              )}
            </form>
          )}
        </SectionCard>
      </div>
    </>
  );
}