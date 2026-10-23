import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { supabase } from '../../lib/supabase';
import { getPropertyId } from '../../lib/admin';
import type { AdminOutletContext } from '../../components/Guards';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime } from '../../lib/format';
import type { WashroomArea } from '../../lib/database.types';

// ─── Status Styling ────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { fill: string; border: string; text: string; label: string }> = {
  operational: { fill: '#E6F4ED', border: '#2E7D5B', text: '#2E7D5B', label: 'Operational' },
  cleaning:    { fill: '#FBF0DC', border: '#8A5A00', text: '#8A5A00', label: 'Cleaning' },
  maintenance: { fill: '#FBEAE8', border: '#B3261E', text: '#B3261E', label: 'Maintenance' },
  inactive:    { fill: '#EFF1EF', border: '#69736D', text: '#69736D', label: 'Inactive' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'operational', label: 'Operational' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
];

async function loadWashrooms(): Promise<Array<WashroomArea & { section_code: string }>> {
  const { data, error } = await supabase
    .from('washroom_areas')
    .select('*, accommodation_sections!inner(code)')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((a: any) => ({ 
    ...a, 
    section_code: a.accommodation_sections?.code ?? '—' 
  }));
}

export function AdminWashroomsPage() {
  const { permissions } = useOutletContext<AdminOutletContext>();
  const canManage = permissions.includes('settings.manage') || permissions.includes('reception.operate');

  const [section, setSection] = useState<'AC' | 'NON_AC'>('AC');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const washrooms = useAsync(loadWashrooms, [refreshKey]);

  // Realtime listener
  useEffect(() => {
    const channel = supabase.channel('washroom-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'washroom_areas' }, () => setRefreshKey(k => k + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const sectionFiltered = useMemo(() => {
    if (washrooms.status !== 'success') return [];
    return washrooms.data.filter(w => w.section_code === section);
  }, [washrooms.status === 'success' ? washrooms.data : null, section]);

  const filtered = useMemo(() => {
    let rows = sectionFiltered;
    if (statusFilter !== 'all') rows = rows.filter(w => w.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter(w => w.name.toLowerCase().includes(q));
    return rows;
  }, [sectionFiltered, statusFilter, search]);

  const counts = useMemo(() => {
    const c = { operational: 0, cleaning: 0, maintenance: 0, inactive: 0 };
    for (const w of sectionFiltered) {
      if (w.status in c) c[w.status as keyof typeof c]++;
    }
    return c;
  }, [sectionFiltered]);

  if (washrooms.status === 'loading') return <Spinner />;
  if (washrooms.status === 'error') return <ErrorState message={washrooms.error.message} />;

  return (
    <>
      <PageHeader
        eyebrow="Facilities"
        title="Washroom Registry"
        intro="Live map view of washroom blocks. Updates automatically."
        actions={canManage && <Button onClick={() => setShowCreate(true)}>Add Washroom</Button>}
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Section Tabs */}
          <div className="flex rounded-input border border-line bg-surface">
            <button 
              onClick={() => setSection('AC')} 
              className={`rounded-l-input px-3 py-1.5 text-xs font-medium transition ${section === 'AC' ? 'bg-brand-900 text-white' : 'text-ink hover:bg-bg'}`}
            >
              AC Hall
            </button>
            <button 
              onClick={() => setSection('NON_AC')} 
              className={`rounded-r-input px-3 py-1.5 text-xs font-medium transition ${section === 'NON_AC' ? 'bg-brand-900 text-white' : 'text-ink hover:bg-bg'}`}
            >
              Non-AC Hall
            </button>
          </div>
          
          <input 
            className={`${inputClass} max-w-[180px] py-1.5 text-xs`} 
            placeholder="Search block name" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />

          {/* Status Filters */}
          <div className="flex flex-wrap gap-1">
            {FILTER_OPTIONS.map((opt) => {
              const active = statusFilter === opt.value;
              return (
                <button 
                  key={opt.value} 
                  onClick={() => setStatusFilter(opt.value)} 
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition ${active ? 'border-brand-900 bg-brand-900 text-white' : 'border-line bg-surface text-ink hover:bg-bg'}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          {Object.entries(STATUS_STYLE).map(([key, style]) => (
            <span key={key} className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded border" style={{ background: style.fill, borderColor: style.border }} />
              <span className="tabular-nums text-ink">{counts[key as keyof typeof counts]}</span>
              <span>{style.label}</span>
            </span>
          ))}
          <span className="ml-auto">
            Showing <span className="tabular-nums text-ink">{filtered.length}</span> of <span className="tabular-nums text-ink">{sectionFiltered.length}</span>
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          title="No washrooms match these filters." 
          body="Adjust the section, status or search to see washrooms." 
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((w) => {
            const s = STATUS_STYLE[w.status] || STATUS_STYLE.operational;
            // Shorten the name for the compact tile
            const displayName = w.name.replace('AC Washroom ', '').replace('Non-AC Washroom ', '');
            
            return (
              <button
                key={w.id}
                onClick={() => setSelected(w.id)}
                className="group relative flex h-[90px] flex-col justify-between rounded-md border-2 p-2 text-left transition-transform hover:scale-105 hover:z-10 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                style={{ background: s.fill, borderColor: s.border }}
                title={w.name}
              >
                {/* Header: Block Name */}
                <div className="w-full flex justify-between items-start">
                  <span className="font-semibold text-xs leading-tight truncate pr-1" style={{ color: s.text }}>
                    {displayName}
                  </span>
                </div>
                
                {/* Fixtures Count */}
                <div className="mt-1 grid grid-cols-3 gap-1 w-full text-center text-[10px] bg-white/50 rounded p-1">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wide text-muted">Toilets</span>
                    <span className="font-bold" style={{ color: s.text }}>{w.toilet_count ?? 0}</span>
                  </div>
                  <div className="border-x border-white/50">
                    <span className="block text-[8px] uppercase tracking-wide text-muted">Basins</span>
                    <span className="font-bold" style={{ color: s.text }}>{w.basin_count ?? 0}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wide text-muted">Showers</span>
                    <span className="font-bold" style={{ color: s.text }}>{w.shower_count ?? 0}</span>
                  </div>
                </div>
                
                {/* Footer Status */}
                <div className="w-full text-center mt-1">
                   <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: s.text }}>
                     {s.label}
                   </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <WashroomDrawer
          washroomId={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); setRefreshKey(k => k + 1); }}
        />
      )}

      {showCreate && (
        <CreateModal
          sectionCode={section}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); setRefreshKey(k => k + 1); }}
        />
      )}
    </>
  );
}

// ─── Operations Drawer ─────────────────────────────────────────────
function WashroomDrawer({ washroomId, canManage, onClose, onChanged }: {
  washroomId: string; canManage: boolean; onClose: () => void; onChanged: () => void;
}) {
  const [washroom, setWashroom] = useState<WashroomArea | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [toilets, setToilets] = useState<number | null>(null);
  const [basins, setBasins] = useState<number | null>(null);
  const [showers, setShowers] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    supabase.from('washroom_areas').select('*').eq('id', washroomId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWashroom(data as WashroomArea);
          setName(data.name);
          setToilets(data.toilet_count);
          setBasins(data.basin_count);
          setShowers(data.shower_count);
          setNotes(data.notes || '');
        }
        setLoading(false);
      });
  }, [washroomId]);

  async function updateStatus(newStatus: string) {
    if (!canManage) return;
    setWorking(true); setErr(null);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'operational') {
        updates.last_cleaned_at = new Date().toISOString();
      }
      const { error } = await supabase.from('washroom_areas').update(updates).eq('id', washroomId);
      if (error) throw error;
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update status');
    } finally { setWorking(false); }
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setWorking(true); setErr(null);
    try {
      const { error } = await supabase.from('washroom_areas').update({
        name, toilet_count: toilets, basin_count: basins, shower_count: showers, notes: notes || null,
      }).eq('id', washroomId);
      if (error) throw error;
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally { setWorking(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-surface shadow-overlay" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Washroom Operations</h2>
          <button onClick={onClose} className="rounded-input p-1.5 text-muted hover:bg-bg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {loading && <Spinner />}
          {err && <div className="p-3 bg-[#FBEAE8] text-[#B3261E] text-sm rounded">{err}</div>}

          {washroom && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-ink mb-2">Status Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={washroom.status === 'operational' ? 'primary' : 'secondary'} onClick={() => updateStatus('operational')} loading={working} className="bg-[#2E7D5B] hover:bg-[#236346] text-white border-transparent">Mark Clean & Open</Button>
                  <Button variant={washroom.status === 'cleaning' ? 'primary' : 'secondary'} onClick={() => updateStatus('cleaning')} loading={working} className="bg-[#8A5A00] hover:bg-[#6B4600] text-white border-transparent">Mark for Cleaning</Button>
                  <Button variant={washroom.status === 'maintenance' ? 'primary' : 'secondary'} onClick={() => updateStatus('maintenance')} loading={working} className="bg-[#B3261E] hover:bg-[#8E1E18] text-white border-transparent">Report Maintenance</Button>
                  <Button variant={washroom.status === 'inactive' ? 'primary' : 'secondary'} onClick={() => updateStatus('inactive')} loading={working}>Mark Closed</Button>
                </div>
                <p className="mt-3 text-xs text-muted">Last Cleaned: <strong>{washroom.last_cleaned_at ? formatDateTime(washroom.last_cleaned_at) : 'Never'}</strong></p>
              </div>

              {canManage && (
                <form onSubmit={saveDetails} className="border-t border-line pt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-ink mb-2">Edit Details</h3>
                  <Field label="Name" htmlFor="w-name" required><input id="w-name" className={inputClass} value={name} onChange={e => setName(e.target.value)} required /></Field>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Toilets" htmlFor="w-t"><input id="w-t" type="number" min={0} className={inputClass} value={toilets ?? ''} onChange={e => setToilets(e.target.value ? Number(e.target.value) : null)} /></Field>
                    <Field label="Basins" htmlFor="w-b"><input id="w-b" type="number" min={0} className={inputClass} value={basins ?? ''} onChange={e => setBasins(e.target.value ? Number(e.target.value) : null)} /></Field>
                    <Field label="Showers" htmlFor="w-s"><input id="w-s" type="number" min={0} className={inputClass} value={showers ?? ''} onChange={e => setShowers(e.target.value ? Number(e.target.value) : null)} /></Field>
                  </div>
                  <Field label="Notes" htmlFor="w-notes"><textarea id="w-notes" rows={2} className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
                  <Button type="submit" loading={working} variant="secondary">Save Details</Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Modal ──────────────────────────────────────────────────
function CreateModal({ sectionCode, onClose, onSuccess }: { sectionCode: 'AC' | 'NON_AC'; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [toilets, setToilets] = useState<number | null>(null);
  const [basins, setBasins] = useState<number | null>(null);
  const [showers, setShowers] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const propertyId = await getPropertyId();
      const { data: sec, error: secErr } = await supabase.from('accommodation_sections').select('id').eq('property_id', propertyId).eq('code', sectionCode).maybeSingle();
      if (secErr) throw secErr;
      if (!sec) throw new Error('Section not found');
      const { error } = await supabase.from('washroom_areas').insert({
        section_id: (sec as { id: string }).id,
        name, toilet_count: toilets, basin_count: basins, shower_count: showers,
        notes: notes || null, status: 'operational'
      });
      if (error) throw error;
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onSubmit={submit} className="w-full max-w-md rounded-card bg-surface p-6 shadow-overlay" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ink mb-4">Add Washroom ({sectionCode === 'AC' ? 'AC Hall' : 'Non-AC Hall'})</h2>
        <div className="space-y-3">
          <Field label="Name" htmlFor="w-name" required><input id="w-name" className={inputClass} placeholder="e.g. AC Washroom Block C" value={name} onChange={e => setName(e.target.value)} required /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Toilets" htmlFor="w-t"><input id="w-t" type="number" min={0} className={inputClass} value={toilets ?? ''} onChange={e => setToilets(e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Basins" htmlFor="w-b"><input id="w-b" type="number" min={0} className={inputClass} value={basins ?? ''} onChange={e => setBasins(e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Showers" htmlFor="w-s"><input id="w-s" type="number" min={0} className={inputClass} value={showers ?? ''} onChange={e => setShowers(e.target.value ? Number(e.target.value) : null)} /></Field>
          </div>
          <Field label="Notes" htmlFor="w-notes"><textarea id="w-notes" rows={2} className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
        </div>
        {err && <p className="mt-3 text-sm text-[#B3261E]">{err}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>Create Washroom</Button>
        </div>
      </form>
    </div>
  );
}