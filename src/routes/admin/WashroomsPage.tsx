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
import type { WashroomArea, WashroomFixture } from '../../lib/database.types';

// ─── Status Styling ────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { fill: string; border: string; text: string; label: string }> = {
  operational: { fill: '#E6F4ED', border: '#2E7D5B', text: '#2E7D5B', label: 'Operational' },
  cleaning:    { fill: '#FBF0DC', border: '#8A5A00', text: '#8A5A00', label: 'Cleaning' },
  maintenance: { fill: '#FBEAE8', border: '#B3261E', text: '#B3261E', label: 'Maintenance' },
  inactive:    { fill: '#EFF1EF', border: '#69736D', text: '#69736D', label: 'Inactive' },
};

const TYPE_ICON = { toilet: '🚽', basin: '🚰', shower: '🚿' };

async function loadWashrooms(): Promise<Array<WashroomArea & { section_code: string; washroom_fixtures: WashroomFixture[] }>> {
  const { data, error } = await supabase
    .from('washroom_areas')
    .select('*, accommodation_sections!inner(code), washroom_fixtures(*)')
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
  const [selectedFixture, setSelectedFixture] = useState<WashroomFixture | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const washrooms = useAsync(loadWashrooms, [refreshKey]);

  // Realtime listener
  useEffect(() => {
    const channel = supabase.channel('washroom-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'washroom_fixtures' }, () => setRefreshKey(k => k + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    if (washrooms.status !== 'success') return [];
    return washrooms.data.filter(w => w.section_code === section);
  }, [washrooms.status === 'success' ? washrooms.data : null, section]);

  if (washrooms.status === 'loading') return <Spinner />;
  if (washrooms.status === 'error') return <ErrorState message={washrooms.error.message} />;

  return (
    <>
      <PageHeader
        eyebrow="Facilities"
        title="Washroom Fixtures"
        intro="Track every toilet, basin, and shower individually."
        actions={canManage && <Button onClick={() => setShowCreate(true)}>Add Washroom Block</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-input border border-line bg-surface">
          <button 
            onClick={() => setSection('AC')} 
            className={`rounded-l-input px-4 py-2 text-sm font-medium transition ${section === 'AC' ? 'bg-brand-900 text-white' : 'text-ink hover:bg-bg'}`}
          >
            AC Hall
          </button>
          <button 
            onClick={() => setSection('NON_AC')} 
            className={`rounded-r-input px-4 py-2 text-sm font-medium transition ${section === 'NON_AC' ? 'bg-brand-900 text-white' : 'text-ink hover:bg-bg'}`}
          >
            Non-AC Hall
          </button>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          {Object.entries(STATUS_STYLE).map(([key, style]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border" style={{ background: style.fill, borderColor: style.border }} />
              <span>{style.label}</span>
            </span>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          title={`No washrooms in ${section === 'AC' ? 'AC' : 'Non-AC'} Hall`} 
          body="Add a washroom block to start tracking its fixtures." 
        />
      ) : (
        <div className="space-y-8">
          {filtered.map((block) => (
            <div key={block.id} className="rounded-card border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
                <h3 className="text-lg font-semibold text-ink">{block.name}</h3>
                <span className="text-xs text-muted">{block.washroom_fixtures.length} total fixtures</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {block.washroom_fixtures.sort((a, b) => a.label.localeCompare(b.label)).map((fixture) => {
                  const s = STATUS_STYLE[fixture.status] || STATUS_STYLE.operational;
                  return (
                    <button
                      key={fixture.id}
                      onClick={() => setSelectedFixture(fixture)}
                      className="group flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-transform hover:scale-105 hover:shadow-md focus:outline-none"
                      style={{ background: s.fill, borderColor: s.border }}
                    >
                      <span className="text-2xl mb-1" aria-hidden>{TYPE_ICON[fixture.fixture_type]}</span>
                      <span className="font-mono text-xs font-bold" style={{ color: s.text }}>
                        {fixture.label}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider mt-1 opacity-80" style={{ color: s.text }}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedFixture && (
        <FixtureDrawer
          fixture={selectedFixture}
          canManage={canManage}
          onClose={() => setSelectedFixture(null)}
          onChanged={() => { setSelectedFixture(null); setRefreshKey(k => k + 1); }}
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

// ─── Fixture Action Drawer ─────────────────────────────────────────
function FixtureDrawer({ fixture, canManage, onClose, onChanged }: {
  fixture: WashroomFixture; canManage: boolean; onClose: () => void; onChanged: () => void;
}) {
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function updateStatus(newStatus: string) {
    if (!canManage) return;
    setWorking(true); setErr(null);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'operational') updates.last_cleaned_at = new Date().toISOString();
      
      const { error } = await supabase.from('washroom_fixtures').update(updates).eq('id', fixture.id);
      if (error) throw error;
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update status');
    } finally { setWorking(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-card bg-surface p-6 shadow-overlay" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <span className="text-4xl block mb-2">{TYPE_ICON[fixture.fixture_type]}</span>
          <h2 className="text-lg font-bold text-ink capitalize">{fixture.fixture_type} {fixture.label}</h2>
          <p className="text-sm text-muted">
            Last Cleaned: {fixture.last_cleaned_at ? formatDateTime(fixture.last_cleaned_at) : 'Never'}
          </p>
        </div>

        {err && <div className="mb-4 p-3 bg-[#FBEAE8] text-[#B3261E] text-sm rounded">{err}</div>}

        <div className="space-y-2">
          <Button onClick={() => updateStatus('operational')} loading={working} className="w-full bg-[#2E7D5B] text-white hover:bg-[#236346]">Mark Clean & Open</Button>
          <Button onClick={() => updateStatus('cleaning')} loading={working} className="w-full bg-[#8A5A00] text-white hover:bg-[#6B4600]">Mark for Cleaning</Button>
          <Button onClick={() => updateStatus('maintenance')} loading={working} className="w-full bg-[#B3261E] text-white hover:bg-[#8E1E18]">Report Maintenance</Button>
          <Button onClick={() => updateStatus('inactive')} loading={working} className="w-full bg-gray-500 text-white hover:bg-gray-600">Take Offline</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Block Modal ────────────────────────────────────────────
function CreateModal({ sectionCode, onClose, onSuccess }: { sectionCode: 'AC' | 'NON_AC'; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [toilets, setToilets] = useState<number>(0);
  const [basins, setBasins] = useState<number>(0);
  const [showers, setShowers] = useState<number>(0);
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

      const { error } = await supabase.rpc('admin_create_washroom_area', {
        p_section_id: (sec as { id: string }).id,
        p_name: name,
        p_toilets: toilets,
        p_basins: basins,
        p_showers: showers,
        p_notes: null
      });
      
      if (error) throw error;
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onSubmit={submit} className="w-full max-w-md rounded-card bg-surface p-6 shadow-overlay" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ink mb-4">Add Washroom Block</h2>
        
        <div className="space-y-4">
          <Field label="Block Name" htmlFor="w-name" required>
            <input id="w-name" className={inputClass} placeholder="e.g. AC Washroom Block A" value={name} onChange={e => setName(e.target.value)} required />
          </Field>
          
          <div className="grid grid-cols-3 gap-2">
            <Field label="Toilets" htmlFor="w-t">
              <input id="w-t" type="number" min={0} className={inputClass} value={toilets} onChange={e => setToilets(Number(e.target.value))} />
            </Field>
            <Field label="Basins" htmlFor="w-b">
              <input id="w-b" type="number" min={0} className={inputClass} value={basins} onChange={e => setBasins(Number(e.target.value))} />
            </Field>
            <Field label="Showers" htmlFor="w-s">
              <input id="w-s" type="number" min={0} className={inputClass} value={showers} onChange={e => setShowers(Number(e.target.value))} />
            </Field>
          </div>
          <p className="text-xs text-muted">This will automatically generate individual tiles for every fixture.</p>
        </div>
        
        {err && <p className="mt-3 text-sm text-[#B3261E]">{err}</p>}
        
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>Create Block</Button>
        </div>
      </form>
    </div>
  );
}