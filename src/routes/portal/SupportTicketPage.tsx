import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getMyTicket, addTicketMessage } from '../../lib/portal';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime } from '../../lib/format';

export function SupportTicketPage() {
  const { id = '' } = useParams();
  const data = useAsync(() => getMyTicket(id), [id]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (data.status === 'loading') return <Spinner />;
  if (data.status === 'error') return <ErrorState message={data.error.message} />;
  if (!data.data.ticket) return <ErrorState message="Ticket not found." />;

  const { ticket, messages } = data.data;

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await addTicketMessage(id, body);
      setBody('');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title={ticket.subject}
        intro={`${ticket.category} · ${ticket.priority} · ${ticket.status.replace('_', ' ')}`}
        actions={<Link to="/portal/support" className="text-sm text-brand-900 hover:underline">← All tickets</Link>}
      />

      <SectionCard title="Conversation">
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className="rounded-input border border-line p-3">
              <div className="flex justify-between gap-2 text-xs text-muted">
                <span>{m.author_kind === 'guest' ? 'You' : 'Property'}</span>
                <span>{formatDateTime(m.created_at)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{m.body}</p>
            </li>
          ))}
        </ul>

        {!isClosed && (
          <form onSubmit={onReply} className="mt-6 space-y-3">
            <Field label="Add a message" htmlFor="reply">
              <textarea id="reply" rows={3} className={inputClass} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Button type="submit" loading={sending}>Send</Button>
            {error && <p role="alert" className="text-sm text-[#B3261E]">{error}</p>}
          </form>
        )}
      </SectionCard>
    </>
  );
}