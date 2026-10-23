import { useAsync } from '../../lib/useAsync';
import { completeCleaning } from '../../lib/admin';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { formatDateTime } from '../../lib/format';

interface Row {
  id: string;
  space_code: string;
  section_code: string;
  created_at: string;
}

async function loadTasks(): Promise<Row[]> {
  // Use the RPC instead of querying the table directly
  const { data, error } = await supabase.rpc('get_cleaning_tasks');
  if (error) throw error;
  return (data ?? []) as Row[];
}

export function AdminCleaningPage() {
  const tasks = useAsync(loadTasks, []);

  if (tasks.status === 'loading') return <Spinner />;
  if (tasks.status === 'error') return <ErrorState message={tasks.error.message} />;

  async function handleComplete(id: string) {
    try { 
      await completeCleaning(id); 
      window.location.reload(); 
    } catch (e) { 
      alert(e instanceof Error ? e.message : 'Failed'); 
    }
  }

  return (
    <>
      <PageHeader eyebrow="Operations" title="Cleaning queue" intro="Beds awaiting turnover. Completing a task releases the cleaning block." />
      {tasks.data.length === 0 ? (
        <EmptyState title="No pending cleaning tasks." body="New tasks are created automatically when a guest checks out." />
      ) : (
        <SectionCard title="Awaiting completion">
          <ul className="space-y-2">
            {tasks.data.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-line p-3">
                <div>
                  <p className="font-mono text-sm text-ink">{t.space_code}</p>
                  <p className="text-xs text-muted">{t.section_code === 'AC' ? 'AC Hall' : 'Non-AC Hall'} · created {formatDateTime(t.created_at)}</p>
                </div>
                <Button onClick={() => handleComplete(t.id)}>Complete</Button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </>
  );
}