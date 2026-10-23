import { useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { supabase } from '../../lib/supabase';
import { getPropertyId } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime } from '../../lib/format';
import type { WashroomArea } from '../../lib/database.types';

async function loadAreas(): Promise<Array<WashroomArea & { section_code: string }>> {
  const { data, error } = await supabase
    .from('washroom_areas')
    .select('*, accommodation_sections!inner(code)')
    .order('section_id');
    
  if (error) throw error;
  
  return (data ?? []).map((a: any) => ({ 
    ...a, 
    section_code: a.accommodation_sections?.code ?? '—' 
  }));
}

export function AdminWashroomsPage() {
  const areas = useAsync(loadAreas, []);
  const [editing, setEditing] = useState<WashroomArea | 'new' | null>(null);

  if (areas.status === 'loading') return <Spinner />;
  if (areas.status === 'error') return <ErrorState message={areas.error.message} />;

  return (
    <>
      <PageHeader 
        eyebrow="Facilities" 
        title="Washroom registry" 
        actions={<Button onClick={() => setEditing('new')}>Add washroom</Button>} 
      />
      <p className="mb-4 text-sm text-muted">
        Fixture counts are only shown on the public site once verified (toggled in Settings).
      </p>

      {areas.data.length === 0 ? (
        <EmptyState 
          title="No washrooms recorded." 
          body="Add each physical washroom area here to track fixtures, cleaning and inspections." 
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {areas.data.map((a) => (
            <SectionCard key={a.id} title={a.name} subtitle={a.section_code === 'AC' ? 'AC Hall' : 'Non-AC Hall'}>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-muted">Toilets</dt><dd className="text-ink">{a.toilet_count ?? '—'}</dd></div>
                <div><dt className="text-muted">Basins</dt><dd className="text-ink">{a.basin_count ?? '—'}</dd></div>
                <div><dt className="text-muted">Showers</dt><dd className="text-ink">{a.shower_count ?? '—'}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-muted">
                Last inspection: {a.last_inspection_at ? formatDateTime(a.last_inspection_at) : 'never'}
              </p>
              {a.notes && <p className="mt-1 text-sm text-muted">{a.notes}</p>}
              <div className="mt-3">
                <Button variant="secondary" onClick={() => setEditing(a)}>Edit</Button>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {editing && (
        <EditDialog 
          area={editing === 'new' ? null : editing} 
          onClose={() => setEditing(null)} 
          onDone={() => { setEditing(null); window.location.reload(); }} 
        />
      )}
    </>
  );
}

function EditDialog({ area, onClose, onDone }: { area: WashroomArea | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(area?.name ?? '');
  const [section, setSection] = useState<'AC' | 'NON_AC'>('AC');
  const [toilets, setToilets] = useState<number | null>(area?.toilet_count ?? null);
  const [basins, setBasins] = useState<number | null>(area?.basin_count ?? null);
  const [showers, setShowers] = useState<number | null>(area?.shower_count ?? null);
  const [notes, setNotes] = useState(area?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); 
    setSaving(true); 
    setErr(null);
    
    try {
      if (area) {
        const { error } = await supabase
          .from('washroom_areas')
          .update({ name, toilet_count: toilets, basin_count: basins, shower_count: showers, notes: notes || null })
          .eq('id', area.id);
        if (error) throw error;
      } else {
        const propId = await getPropertyId();
        const { data: sec, error: secErr } = await supabase
          .from('accommodation_sections')
          .select('id')
          .eq('property_id', propId)
          .eq('code', section)
          .maybeSingle();
          
        if (secErr) throw secErr;
        if (!sec) throw new Error('Section not found');
        
        const { error } = await supabase
          .from('washroom_areas')
          .insert({ 
            section_id: (sec as { id: string }).id, 
            name, 
            toilet_count: toilets, 
            basin_count: basins, 
            shower_count: showers, 
            notes: notes || null 
          });
        if (error) throw error;
      }
      onDone();
    } catch (e) { 
      setErr(e instanceof Error ? e.message : 'Save failed'); 
    } finally { 
      setSaving(false); 
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form onSubmit={submit} className="w-full max-w-md rounded-card bg-surface p-6 shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ink">{area ? 'Edit washroom area' : 'New washroom area'}</h2>
        
        <div className="mt-4 space-y-3">
          <Field label="Name" htmlFor="wh-name" required>
            <input id="wh-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          
          {!area && (
            <Field label="Section" htmlFor="wh-sec" required>
              <select id="wh-sec" className={inputClass} value={section} onChange={(e) => setSection(e.target.value as 'AC'|'NON_AC')}>
                <option value="AC">AC Hall</option>
                <option value="NON_AC">Non-AC Hall</option>
              </select>
            </Field>
          )}
          
          <div className="grid grid-cols-3 gap-2">
            <Field label="Toilets" htmlFor="wh-t">
              <input id="wh-t" type="number" className={inputClass} value={toilets ?? ''} onChange={(e) => setToilets(e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Basins" htmlFor="wh-b">
              <input id="wh-b" type="number" className={inputClass} value={basins ?? ''} onChange={(e) => setBasins(e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Showers" htmlFor="wh-s">
              <input id="wh-s" type="number" className={inputClass} value={showers ?? ''} onChange={(e) => setShowers(e.target.value ? Number(e.target.value) : null)} />
            </Field>
          </div>
          
          <Field label="Notes" htmlFor="wh-notes">
            <textarea id="wh-notes" rows={2} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        
        {err && <p role="alert" className="mt-3 text-sm text-[#B3261E]">{err}</p>}
        
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
    </div>
  );
}