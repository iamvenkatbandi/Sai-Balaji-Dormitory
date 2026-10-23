import { useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { createMaintenance, resolveMaintenance } from '../../lib/admin';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime } from '../../lib/format';
import type { MaintenanceTicket } from '../../lib/database.types';

async function loadOpen(): Promise<MaintenanceTicket[]> {
  const { data, error } = await supabase
    .from('maintenance_tickets').select('*')
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MaintenanceTicket[];
}

export function AdminMaintenancePage() {
  const tickets = useAsync(loadOpen, []);
  const [showCreate, setShowCreate] = useState(false);

  if (tickets.status === 'loading') return <Spinner />;
  if (tickets.status === 'error') return <ErrorState message={tickets.error.message} />;

  async function resolve(id: string) {
    const note = prompt('Resolution note:');
    if (note == null) return;
    try { await resolveMaintenance(id, note); window.location.reload(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  }

  return (
    <>
      <PageHeader eyebrow="Operations" title="Maintenance" actions={<Button onClick={() => setShowCreate(true)}>New ticket</Button>} />

      {tickets.data.length === 0 ? (
        <EmptyState title="No open maintenance tickets." body="Raise a ticket when a space, bunk or washroom needs attention." />
      ) : (
        <div className="space-y-2">
          {tickets.data.map((t) => (
            <div key={t.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  <p className="text-xs text-muted">{t.priority} · {t.status} · {formatDateTime(t.created_at)}</p>
                  {t.description && <p className="mt-2 text-sm text-muted">{t.description}</p>}
                </div>
                <Button variant="secondary" onClick={() => resolve(t.id)}>Resolve</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateDialog onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); window.location.reload(); }} />
      )}
    </>
  );
}

function CreateDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [spaceCode, setSpaceCode] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      let spaceId: string | null = null;
      if (spaceCode.trim()) {
        const { data } = await supabase.from('sleeping_spaces').select('id').eq('code', spaceCode.trim()).maybeSingle();
        if (!data) throw new Error(`Space ${spaceCode} not found`);
        spaceId = (data as { id: string }).id;
      }
      await createMaintenance({ title, description: description || null, spaceId, bunkUnitId: null, sectionId: null, priority });
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Create failed'); } 
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form onSubmit={submit} className="w-full max-w-lg rounded-card bg-surface p-6 shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ink">New maintenance ticket</h2>
        <div className="mt-4 space-y-3">
          <Field label="Title" htmlFor="mt-title" required><input id="mt-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          <Field label="Description" htmlFor="mt-desc"><textarea id="mt-desc" rows={3} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <Field label="Affected space code" htmlFor="mt-space" hint="e.g. AC-014. Leave blank if not space-specific."><input id="mt-space" className={inputClass} value={spaceCode} onChange={(e) => setSpaceCode(e.target.value)} /></Field>
          <Field label="Priority" htmlFor="mt-prio" required>
            <select id="mt-prio" className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </Field>
        </div>
        {err && <p role="alert" className="mt-3 text-sm text-[#B3261E]">{err}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>Create ticket</Button>
        </div>
      </form>
    </div>
  );
}