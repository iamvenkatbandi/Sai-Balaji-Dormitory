import { Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getMyTickets } from '../../lib/portal';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { formatDateTime } from '../../lib/format';

export function SupportListPage() {
  const tickets = useAsync(getMyTickets, []);

  if (tickets.status === 'loading') return <Spinner />;
  if (tickets.status === 'error') return <ErrorState message={tickets.error.message} />;

  return (
    <>
      <PageHeader
        eyebrow="Portal"
        title="Support"
        actions={<Link to="/portal/support/new"><Button>New request</Button></Link>}
      />
      {tickets.data.length === 0 ? (
        <EmptyState
          title="No support tickets."
          body="Open a request if you need help with a booking, facility or safety matter."
          action={<Link to="/portal/support/new"><Button>New request</Button></Link>}
        />
      ) : (
        <ul className="space-y-2">
          {tickets.data.map((t) => (
            <li key={t.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`/portal/support/${t.id}`} className="text-sm font-medium text-ink hover:underline">
                  {t.subject}
                </Link>
                <span className="text-xs text-muted">{t.status.replace('_', ' ')}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {t.category} · {t.priority} · {formatDateTime(t.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}