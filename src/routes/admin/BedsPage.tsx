import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import {
  getBedsStatus, getBedDetail, blockBed, releaseBlock,
  proposeWomenReserved, applyWomenReserved, assignBedManual,
  transferBooking, toggleBedActive, checkInBooking,
  getUnassignedBookings
} from '../../lib/admin';
import { supabase } from '../../lib/supabase';
import type { AdminOutletContext } from '../../components/Guards';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime } from '../../lib/format';
import { CheckoutBillingModal } from '../../components/CheckoutBillingModal';
import type { BedDetail, BedRow, BedStatus } from '../../lib/database.types';

const STATUS_STYLE: Record<BedStatus, { fill: string; border: string; text: string; pillow: string; label: string }> = {
  available:   { fill: '#E6F4ED', border: '#2E7D5B', text: '#2E7D5B', pillow: '#C8E6D5', label: 'Available' },
  reserved:    { fill: '#FBF0DC', border: '#8A5A00', text: '#8A5A00', pillow: '#F0DAB0', label: 'Reserved' },
  occupied:    { fill: '#DCE6E2', border: '#173B35', text: '#173B35', pillow: '#B5C5BE', label: 'Occupied' },
  cleaning:    { fill: '#EDEAF7', border: '#5B4A8F', text: '#5B4A8F', pillow: '#D5CEE8', label: 'Cleaning' },
  maintenance: { fill: '#FBEAE8', border: '#B3261E', text: '#B3261E', pillow: '#F0C9C4', label: 'Maintenance' },
  inactive:    { fill: '#EFF1EF', border: '#69736D', text: '#69736D', pillow: '#D8DCD8', label: 'Inactive' },
};

const FILTER_OPTIONS: Array<{ value: BedStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
];

export function AdminBedsPage() {
  const { permissions } = useOutletContext<AdminOutletContext>();
  const canBlock = permissions.includes('beds.block');
  const canAssign = permissions.includes('beds.assign');
  const canManage = permissions.includes('inventory.manage');

  const [section, setSection] = useState<'AC' | 'NON_AC'>('AC');
  const [status, setStatus] = useState<BedStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [showProposal, setShowProposal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const allBeds = useAsync(() => getBedsStatus({}), [refreshKey]);

  useEffect(() => {
    const channel = supabase.channel('bed-inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'space_blocks' }, () => setRefreshKey((k) => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bed_assignments' }, () => setRefreshKey((k) => k + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => setRefreshKey((k) => k + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const sectionFiltered = useMemo(() => {
    if (allBeds.status !== 'success') return [] as BedRow[];
    return allBeds.data.filter((r) => r.section_code === section);
  }, [allBeds.status === 'success' ? allBeds.data : null, section]);

  const filtered = useMemo(() => {
    let rows = sectionFiltered;
    if (status !== 'all') rows = rows.filter((r) => r.status === status);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.code.toLowerCase().includes(q));
    return rows;
  }, [sectionFiltered, status, search]);

  const counts = useMemo(() => {
    const c: Record<BedStatus, number> = { available: 0, reserved: 0, occupied: 0, cleaning: 0, maintenance: 0, inactive: 0 };
    for (const r of sectionFiltered) c[r.status]++;
    return c;
  }, [sectionFiltered]);

  const acReserved = allBeds.status === 'success' ? allBeds.data.filter((r) => r.women_reserved && r.section_code === 'AC').length : 0;
  const naReserved = allBeds.status === 'success' ? allBeds.data.filter((r) => r.women_reserved && r.section_code === 'NON_AC').length : 0;

  const grouped = useMemo(() => {
    if (section === 'NON_AC') {
      const map = new Map<string, { unitCode: string; spaces: BedRow[] }>();
      for (const row of filtered) {
        const key = row.bunk_unit_code ?? 'unknown';
        if (!map.has(key)) map.set(key, { unitCode: key, spaces: [] });
        map.get(key)!.spaces.push(row);
      }
      return { units: Array.from(map.values()).sort((a, b) => a.unitCode.localeCompare(b.unitCode)), individual: [] as BedRow[] };
    }
    return { units: [] as { unitCode: string; spaces: BedRow[] }[], individual: [...filtered].sort((a, b) => a.code.localeCompare(b.code)) };
  }, [filtered, section]);

  if (allBeds.status === 'loading') return <Spinner />;
  if (allBeds.status === 'error') return <ErrorState message={allBeds.error.message} />;

  return (
    <>
      <PageHeader eyebrow="Inventory" title="Bed inventory" intro="Live seat-map view. Updates automatically." />

      <div className="mb-3 rounded-card border border-line bg-surface p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Women-reserved configuration</h3>
            <p className="mt-1 text-xs text-muted">
              {acReserved === 0 && naReserved === 0 ? (
                <>No beds designated. Targets: 10 AC individual beds · 30 Non-AC bunk units (60 spaces).</>
              ) : (
                <>{acReserved} of 10 AC beds · {naReserved} of 60 Non-AC spaces designated.</>
              )}
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowProposal(true)}>
                {acReserved === 0 && naReserved === 0 ? 'Review proposal' : 'Add / adjust'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-input border border-line bg-surface">
            <button onClick={() => setSection('AC')} className={`rounded-l-input px-3 py-1.5 text-xs ${section === 'AC' ? 'bg-brand-900 text-white' : 'text-ink hover:bg-bg'}`}>AC Hall · {allBeds.data.filter(b => b.section_code === 'AC').length}</button>
            <button onClick={() => setSection('NON_AC')} className={`rounded-r-input px-3 py-1.5 text-xs ${section === 'NON_AC' ? 'bg-brand-900 text-white' : 'text-ink hover:bg-bg'}`}>Non-AC Hall · {allBeds.data.filter(b => b.section_code === 'NON_AC').length}</button>
          </div>
          <input className={`${inputClass} max-w-[180px] py-1.5 text-xs`} placeholder="Search bed ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-wrap gap-1">
            {FILTER_OPTIONS.map((opt) => {
              const active = status === opt.value;
              return <button key={opt.value} onClick={() => setStatus(opt.value)} className={`rounded-full border px-2.5 py-0.5 text-xs ${active ? 'border-brand-900 bg-brand-900 text-white' : 'border-line bg-surface text-ink hover:bg-bg'}`}>{opt.label}</button>;
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          {(['available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'inactive'] as BedStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded border" style={{ background: STATUS_STYLE[s].fill, borderColor: STATUS_STYLE[s].border }} />
              <span className="tabular-nums text-ink">{counts[s]}</span><span>{STATUS_STYLE[s].label}</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-1"><span className="grid h-3 w-3 place-items-center rounded-full bg-[#B3261E] text-[7px] font-bold text-white">W</span><span>Women-reserved</span></span>
          <span className="ml-auto">Showing <span className="tabular-nums text-ink">{filtered.length}</span> of <span className="tabular-nums text-ink">{sectionFiltered.length}</span></span>
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState title="No beds match these filters." body="Adjust the section, status or search to see inventory." />
      )}

      {/* ─── FLOOR PLAN LAYOUT ─────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="relative mx-auto w-full max-w-6xl rounded-xl border-2 border-dashed border-gray-400 bg-gray-50 p-6 sm:p-10 shadow-inner">
          
          {/* Entrance */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="rounded-t-md bg-brand-900 px-8 py-2 text-center text-xs font-bold uppercase tracking-widest text-white shadow-md">
              Main Entrance
            </div>
            <div className="h-4 w-24 bg-gradient-to-b from-gray-200 to-transparent opacity-50" />
          </div>

          <div className="flex h-full w-full gap-4 sm:gap-8 items-stretch justify-center mt-4">
            
            {/* Washroom Block A (Left) */}
            <Link 
              to="/admin/washrooms" 
              className="hidden w-20 flex-col items-center justify-center rounded-lg border-2 border-[#2E7D5B] bg-[#E6F4ED] p-2 hover:scale-[1.02] transition-transform lg:flex"
            >
              <span className="text-3xl mb-2">🚽</span>
              <span className="text-[10px] font-bold uppercase text-[#2E7D5B] text-center leading-tight">Washroom<br/>Block A</span>
              <span className="mt-2 text-[9px] text-[#2E7D5B]">Manage →</span>
            </Link>

            {/* Center: Beds */}
            <div className="flex-1 rounded-lg bg-white p-4 shadow-sm border border-gray-200">
              <div className="mb-3 flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                <span>{section === 'AC' ? 'AC Hall Area' : 'Non-AC Hall Area'}</span>
                <span>{filtered.length} Spaces</span>
              </div>

              {section === 'AC' && grouped.individual.length > 0 && (
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                  {grouped.individual.map((row) => <CompactBedTile key={row.space_id} row={row} onClick={() => setSelected(row.space_id)} />)}
                </div>
              )}

              {section === 'NON_AC' && grouped.units.length > 0 && (
                <div className="grid grid-cols-10 gap-1 sm:grid-cols-[repeat(20,minmax(0,1fr))]">
                  {grouped.units.map((unit) => <CompactBunk key={unit.unitCode} unitCode={unit.unitCode} spaces={unit.spaces} onSelect={setSelected} />)}
                </div>
              )}
            </div>

            {/* Washroom Block B (Right) */}
            <Link 
              to="/admin/washrooms" 
              className="hidden w-20 flex-col items-center justify-center rounded-lg border-2 border-[#2E7D5B] bg-[#E6F4ED] p-2 hover:scale-[1.02] transition-transform lg:flex"
            >
              <span className="text-3xl mb-2">🚿</span>
              <span className="text-[10px] font-bold uppercase text-[#2E7D5B] text-center leading-tight">Washroom<br/>Block B</span>
              <span className="mt-2 text-[9px] text-[#2E7D5B]">Manage →</span>
            </Link>

          </div>
        </div>
      )}
      {/* ───────────────────────────────────────────────────────────── */}

      {selected && (
        <BedDrawer
          spaceId={selected}
          sectionCode={section}
          canBlock={canBlock}
          canAssign={canAssign}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); setRefreshKey(k => k + 1); }}
        />
      )}

      {showProposal && <ProposalModal onClose={() => setShowProposal(false)} onApplied={() => { setShowProposal(false); setRefreshKey(k => k + 1); }} />}
    </>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────
function CompactBedTile({ row, onClick }: { row: BedRow; onClick: () => void }) {
  const s = STATUS_STYLE[row.status];
  const title = `${row.code} — ${s.label}${row.current_booking_reference ? ` · ${row.current_booking_reference}` : ''}${row.women_reserved ? ' · women-reserved' : ''}`;
  const displayCode = row.code.startsWith('F-') ? row.code.replace('F-00', 'F').replace('F-0', 'F') : row.code.replace('AC-', '');
  return (
    <button type="button" onClick={onClick} title={title} className="group relative flex h-[60px] w-full flex-col items-center justify-between rounded border-2 py-1 transition-transform hover:scale-105 hover:z-10 hover:shadow-md focus:outline-none" style={{ background: s.fill, borderColor: s.border }}>
      <div className="h-1.5 w-3/4 rounded-full opacity-60" style={{ background: s.pillow }} />
      <span className="font-mono text-[9px] font-bold tracking-tight" style={{ color: s.text }}>{displayCode}</span>
      {row.women_reserved && <span className="absolute -right-1.5 -top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#B3261E] text-[7px] font-bold text-white shadow">W</span>}
    </button>
  );
}

function CompactBunk({ unitCode, spaces, onSelect }: { unitCode: string; spaces: BedRow[]; onSelect: (id: string) => void }) {
  const upper = spaces.find((s) => s.position === 'upper');
  const lower = spaces.find((s) => s.position === 'lower');
  return (
    <div className="flex flex-col items-center w-full">
      {upper ? <CompactBunkCell row={upper} letter="U" onClick={() => onSelect(upper.space_id)} /> : <div className="h-6 w-full rounded-sm border border-dashed border-line opacity-25" />}
      <div className="h-0.5" />
      {lower ? <CompactBunkCell row={lower} letter="L" onClick={() => onSelect(lower.space_id)} /> : <div className="h-6 w-full rounded-sm border border-dashed border-line opacity-25" />}
      <span className="mt-1 font-mono text-[8px] font-medium text-muted">{unitCode.replace('NA-', '')}</span>
    </div>
  );
}

function CompactBunkCell({ row, letter, onClick }: { row: BedRow; letter: 'U' | 'L'; onClick: () => void }) {
  const s = STATUS_STYLE[row.status];
  return (
    <button type="button" onClick={onClick} className="group relative flex h-6 w-full items-center justify-between rounded-sm border px-1 transition-transform hover:scale-110 hover:z-10 hover:shadow-md" style={{ background: s.fill, borderColor: s.border, color: s.text }}>
      <span className="text-[9px] font-bold">{letter}</span>
      {row.women_reserved && <span className="h-1.5 w-1.5 rounded-full bg-[#B3261E]" />}
    </button>
  );
}

// ─── THE BED DRAWER (Operations Hub) ───────────────────────────────
function BedDrawer({ spaceId, sectionCode, canBlock, canAssign, canManage, onClose, onChanged }: {
  spaceId: string; sectionCode: 'AC' | 'NON_AC'; canBlock: boolean; canAssign: boolean; canManage: boolean; onClose: () => void; onChanged: () => void;
}) {
  const detail = useAsync(() => getBedDetail(spaceId), [spaceId, onChanged]);
  const unassigned = useAsync(() => getUnassignedBookings(sectionCode), [sectionCode, onChanged]);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  
  const [blocking, setBlocking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [assignId, setAssignId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [transferRef, setTransferRef] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [working, setWorking] = useState(false);
  const [showBilling, setShowBilling] = useState(false);

  async function doBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!fromDate || !toDate) return;
    const fromIso = new Date(fromDate).toISOString();
    const toIso = new Date(toDate).toISOString();
    if (new Date(toIso) <= new Date(fromIso)) { setErr('End time must be after start time.'); return; }
    setBlocking(true); setErr(null);
    try { await blockBed(spaceId, fromIso, toIso, reason || 'Maintenance'); onChanged(); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Block failed'); }
    finally { setBlocking(false); }
  }

  async function doRelease(blockId: string) {
    setBlocking(true); setErr(null);
    try { await releaseBlock(blockId); onChanged(); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Release failed'); }
    finally { setBlocking(false); }
  }

  async function handleManualAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignId) return;
    setAssigning(true); setErr(null);
    try {
      await assignBedManual(assignId, spaceId);
      setAssignId(''); onChanged();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Assignment failed'); }
    finally { setAssigning(false); }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!detail.data?.current_booking) return;
    setTransferring(true); setErr(null);
    try {
      await transferBooking(detail.data.current_booking.id, spaceId);
      setTransferRef(''); onChanged();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Transfer failed'); }
    finally { setTransferring(false); }
  }

  async function handleCheckIn() {
    if (!detail.data?.current_booking) return;
    setWorking(true); setErr(null);
    try { await checkInBooking(detail.data.current_booking.id); onChanged(); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Check-in failed'); }
    finally { setWorking(false); }
  }

  async function handleToggleActive() {
    if (!detail.data) return;
    const isActive = detail.data.space.is_active;
    if (!confirm(isActive ? 'Permanently disable this bed? It will no longer be bookable.' : 'Enable this bed?')) return;
    setWorking(true); setErr(null);
    try { await toggleBedActive(spaceId, !isActive); onChanged(); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Failed to toggle bed'); }
    finally { setWorking(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-card bg-surface shadow-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
            <h2 className="text-base font-semibold text-ink">Bed Operations</h2>
            <button onClick={onClose} className="rounded-input p-1.5 text-muted hover:bg-bg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className="px-5 py-4 space-y-6">
            {detail.status === 'loading' && <Spinner />}
            {detail.status === 'error' && <ErrorState message={detail.error.message} />}
            
            {detail.status === 'success' && (
              <>
                <BedDetailBody detail={detail.data} />

                {detail.data.current_booking && (
                  <div className="rounded-input border border-[#E6F4ED] bg-[#E6F4ED] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-[#2E7D5B]">Current Booking</h3>
                      <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-white text-[#2E7D5B]">
                        {detail.data.current_booking.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="text-sm text-[#2E7D5B] mb-4 space-y-1">
                      <p><strong>Ref:</strong> {detail.data.current_booking.reference}</p>
                      <p><strong>Guest:</strong> {detail.data.current_booking.guest_name || '—'}</p>
                      <p><strong>Dates:</strong> {formatDateTime(detail.data.current_booking.starts_at).split(',')[0]} to {formatDateTime(detail.data.current_booking.ends_at).split(',')[0]}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {detail.data.current_booking.status === 'confirmed' && (
                        <Button onClick={handleCheckIn} loading={working} className="bg-[#2E7D5B] text-white hover:bg-[#236346] w-full sm:w-auto">
                          Check In Guest
                        </Button>
                      )}
                      {detail.data.current_booking.status === 'checked_in' && (
                        <Button onClick={() => setShowBilling(true)} loading={working} variant="danger" className="w-full sm:w-auto">
                          Check Out Guest
                        </Button>
                      )}
                    </div>
                    
                    <form onSubmit={handleTransfer} className="mt-4 flex gap-2">
                      <input className={`${inputClass} flex-1 bg-white`} placeholder="Transfer to Bed Code (e.g. AC-015)" value={transferRef} onChange={(e) => setTransferRef(e.target.value)} required />
                      <Button type="submit" loading={transferring} variant="secondary">Transfer</Button>
                    </form>
                  </div>
                )}

                {canAssign && !detail.data.current_booking && (
                  <div className="border-t border-line pt-4">
                    <h3 className="text-sm font-semibold text-ink">Assign Booking</h3>
                    {unassigned.status === 'loading' ? (
                      <p className="text-sm text-muted mt-2">Loading unassigned bookings...</p>
                    ) : unassigned.status === 'error' ? (
                      <p className="text-sm text-[#B3261E] mt-2">Failed to load bookings.</p>
                    ) : unassigned.data.length === 0 ? (
                      <p className="text-sm text-muted mt-2">No unassigned bookings available for this section.</p>
                    ) : (
                      <form onSubmit={handleManualAssign} className="mt-2 flex gap-2">
                        <select className={`${inputClass} flex-1`} value={assignId} onChange={(e) => setAssignId(e.target.value)} required>
                          <option value="" disabled>Select a booking to assign...</option>
                          {unassigned.data.map((b) => (
                            <option key={b.booking_id} value={b.booking_id}>{b.reference} — {b.guest_name} ({formatDateTime(b.starts_at).split(',')[0]})</option>
                          ))}
                        </select>
                        <Button type="submit" loading={assigning} disabled={!assignId}>Assign</Button>
                      </form>
                    )}
                  </div>
                )}

                {canManage && (
                  <div className="border-t border-line pt-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">Bed Status</h3>
                      <p className="text-xs text-muted">Take this bed offline permanently.</p>
                    </div>
                    <Button variant={detail.data.space.is_active ? 'danger' : 'primary'} onClick={handleToggleActive} loading={working}>
                      {detail.data.space.is_active ? 'Disable Bed' : 'Enable Bed'}
                    </Button>
                  </div>
                )}

                {canBlock && (
                  <div className="border-t border-line pt-4">
                    <h3 className="text-sm font-semibold text-ink mb-2">Block for Maintenance</h3>
                    <form onSubmit={doBlock} className="space-y-3">
                      <div className="flex gap-2">
                        <input type="date" className={`${inputClass} flex-1`} value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
                        <input type="date" className={`${inputClass} flex-1`} value={toDate} onChange={(e) => setToDate(e.target.value)} required />
                      </div>
                      <input className={inputClass} placeholder="Reason (e.g. Broken fan)" value={reason} onChange={(e) => setReason(e.target.value)} />
                      <Button type="submit" loading={blocking} variant="secondary">Create Block</Button>
                    </form>
                    {detail.data.maintenance_history.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm">
                        {detail.data.maintenance_history.map((b) => (
                          <li key={b.id} className="flex justify-between border border-line p-2 rounded bg-bg">
                            <span>{formatDateTime(b.blocked_from).split(',')[0]} to {formatDateTime(b.blocked_to).split(',')[0]}</span>
                            <button onClick={() => doRelease(b.id)} className="text-xs text-brand-900 hover:underline">Release</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {err && <p role="alert" className="text-sm text-[#B3261E]">{err}</p>}
              </>
            )}
          </div>
        </div>
      </div>

      {showBilling && detail.data?.current_booking && (
        <CheckoutBillingModal
          bookingId={detail.data.current_booking.id}
          onClose={() => setShowBilling(false)}
          onSuccess={() => { setShowBilling(false); onChanged(); }}
        />
      )}
    </>
  );
}

function BedDetailBody({ detail }: { detail: BedDetail }) {
  const s = detail.space;
  return (
    <div className="space-y-4">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Bed ID</dt><dd className="font-mono text-ink">{s.code}</dd></div>
        <div><dt className="text-muted">Section</dt><dd className="text-ink">{s.section_code === 'AC' ? 'AC Hall' : 'Non-AC Hall'}</dd></div>
        <div><dt className="text-muted">Position</dt><dd className="text-ink capitalize">{s.position}</dd></div>
        <div><dt className="text-muted">Zone</dt><dd className="text-ink">{s.zone_name}</dd></div>
        {s.women_reserved && <div><dt className="text-muted">Women-reserved</dt><dd className="text-ink">Yes</dd></div>}
      </dl>
    </div>
  );
}

// ─── THE PROPOSAL MODAL ───────────────────────────────────────────
function ProposalModal({ onClose, onApplied }: { onClose: () => void; onApplied: () => void }) {
  const proposal = useAsync(() => proposeWomenReserved(10, 30), []);
  const [acknowledged, setAcknowledged] = useState(false);
  const [applying, setApplying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const acProposal = proposal.status === 'success' ? proposal.data.filter((p) => p.product_type === 'ac_individual') : [];
  const naProposal = proposal.status === 'success' ? proposal.data.filter((p) => p.product_type === 'non_ac_space') : [];
  const naBunkCount = new Set(naProposal.map((p) => p.code.replace(/-[LU]$/, ''))).size;

  async function apply() {
    if (proposal.status !== 'success' || proposal.data.length === 0) return;
    setApplying(true);
    setErr(null);
    try {
      await applyWomenReserved(proposal.data.map((p) => p.space_id));
      onApplied();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to apply');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card bg-surface shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Women-reserved proposal</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-input p-1.5 text-muted hover:bg-bg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-input border border-[#FBEAE8] bg-[#FBEAE8] p-3 text-sm text-[#7A1A15]">
            <strong>This is a starting proposal, not a safety claim.</strong> It selects low-numbered beds for review. Verify against the physical layout before confirming.
          </div>

          {proposal.status === 'loading' && <Spinner />}
          {proposal.status === 'error' && <ErrorState message={proposal.error.message} />}
          {proposal.status === 'success' && proposal.data.length === 0 && (
            <EmptyState title="Nothing to add." body={`Designation is already at or above the target of 10 AC beds and 30 Non-AC bunk units.`} />
          )}

          {proposal.status === 'success' && proposal.data.length > 0 && (
            <>
              <div>
                <p className="text-sm font-semibold text-ink">Proposed additions ({proposal.data.length} spaces)</p>
                <p className="text-xs text-muted">{acProposal.length} AC individual beds · {naBunkCount} Non-AC bunk units ({naProposal.length} spaces)</p>
              </div>

              {acProposal.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">AC individual beds</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {acProposal.map((p) => <span key={p.space_id} className="rounded border border-line bg-bg px-2 py-0.5 font-mono text-xs text-ink">{p.code}</span>)}
                  </div>
                </div>
              )}

              {naProposal.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Non-AC bunk units</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Array.from(new Set(naProposal.map((p) => p.code.replace(/-[LU]$/, '')))).sort().map((unit) => (
                      <span key={unit} className="rounded border border-line bg-bg px-2 py-0.5 font-mono text-xs text-ink">{unit}</span>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-start gap-2 rounded-input border border-line bg-bg p-3 text-sm text-ink">
                <input type="checkbox" className="mt-1" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                <span>I have verified the physical layout of these beds, confirmed they meet the property's safety requirements, and accept responsibility for this designation.</span>
              </label>

              {err && <p role="alert" className="text-sm text-[#B3261E]">{err}</p>}
            </>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-line bg-surface px-5 py-3">
          <Button variant="secondary" onClick={onClose} disabled={applying}>Cancel</Button>
          <Button onClick={apply} loading={applying} disabled={!acknowledged || proposal.status !== 'success' || proposal.data.length === 0}>Apply designation</Button>
        </div>
      </div>
    </div>
  );
}