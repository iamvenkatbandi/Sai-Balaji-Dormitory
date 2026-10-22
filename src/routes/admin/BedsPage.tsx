import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getBedsStatus, getBedDetail, blockBed, releaseBlock } from '../../lib/admin';
import type { AdminOutletContext } from '../../components/Guards';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { inputClass } from '../../components/Field';
import { formatDateTime } from '../../lib/format';
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

const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export function AdminBedsPage() {
  const { permissions } = useOutletContext<AdminOutletContext>();
  const canBlock = permissions.includes('beds.block');

  const [section, setSection] = useState<'AC' | 'NON_AC'>('AC');
  const [status, setStatus] = useState<BedStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const beds = useAsync(() => getBedsStatus({ section }), [section]);

  const filtered = useMemo(() => {
    if (beds.status !== 'success') return [] as BedRow[];
    let rows = beds.data;
    if (status !== 'all') rows = rows.filter((r) => r.status === status);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.code.toLowerCase().includes(q));
    return rows;
  }, [beds.status === 'success' ? beds.data : null, status, search]);

  const counts = useMemo(() => {
    const c: Record<BedStatus, number> = {
      available: 0, reserved: 0, occupied: 0,
      cleaning: 0, maintenance: 0, inactive: 0,
    };
    if (beds.status === 'success') for (const r of beds.data) c[r.status]++;
    return c;
  }, [beds.status === 'success' ? beds.data : null]);

  const grouped = useMemo(() => {
    if (section === 'NON_AC') {
      const map = new Map<string, { unitCode: string; spaces: BedRow[] }>();
      for (const row of filtered) {
        const key = row.bunk_unit_code ?? 'unknown';
        if (!map.has(key)) map.set(key, { unitCode: key, spaces: [] });
        map.get(key)!.spaces.push(row);
      }
      return {
        units: Array.from(map.values()).sort((a, b) => a.unitCode.localeCompare(b.unitCode)),
        individual: [] as BedRow[],
      };
    }
    return {
      units: [] as { unitCode: string; spaces: BedRow[] }[],
      individual: [...filtered].sort((a, b) => a.code.localeCompare(b.code)),
    };
  }, [filtered, section]);

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Bed inventory"
        intro="Live seat-map view of every sleeping space. Click a bed for details and actions."
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-input border border-line bg-surface">
            <button
              onClick={() => setSection('AC')}
              className={`rounded-l-input px-4 py-2 text-sm ${
                section === 'AC' ? 'bg-brand-900 text-white' : 'text-ink hover:bg-bg'
              }`}
            >
              AC Hall
            </button>
            <button
              onClick={() => setSection('NON_AC')}
              className={`rounded-r-input px-4 py-2 text-sm ${
                section === 'NON_AC' ? 'bg-brand-900 text-white' : 'text-ink hover:bg-bg'
              }`}
            >
              Non-AC Hall
            </button>
          </div>

          <input
            className={`${inputClass} max-w-xs`}
            placeholder="Search bed ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search bed ID"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => {
            const active = status === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs ${
                  active
                    ? 'border-brand-900 bg-brand-900 text-white'
                    : 'border-line bg-surface text-ink hover:bg-bg'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {beds.status === 'success' && (
        <div className="mb-4 rounded-card border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {(['available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'inactive'] as BedStatus[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded border"
                  style={{ background: STATUS_STYLE[s].fill, borderColor: STATUS_STYLE[s].border }}
                />
                <span className="tabular-nums text-ink">{counts[s]}</span>
                <span className="text-muted">{STATUS_STYLE[s].label}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[#B3261E] text-[8px] font-bold text-white">
                W
              </span>
              <span className="text-muted">Women-reserved</span>
            </span>
            <span className="ml-auto text-muted">
              Showing <span className="tabular-nums text-ink">{filtered.length}</span>{' '}
              of <span className="tabular-nums text-ink">{beds.data.length}</span>
            </span>
          </div>
        </div>
      )}

      {beds.status === 'loading' && <Spinner />}
      {beds.status === 'error' && <ErrorState message={beds.error.message} />}
      {beds.status === 'success' && filtered.length === 0 && (
        <EmptyState
          title="No beds match these filters."
          body="Adjust the section, status or search to see inventory."
        />
      )}

      {beds.status === 'success' && section === 'AC' && grouped.individual.length > 0 && (
        <div className="rounded-card border border-line bg-bg p-4">
          <div className="grid grid-cols-4 justify-items-center gap-x-3 gap-y-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {grouped.individual.map((row) => (
              <BedTile
                key={row.space_id}
                row={row}
                onClick={() => setSelected(row.space_id)}
              />
            ))}
          </div>
        </div>
      )}

      {beds.status === 'success' && section === 'NON_AC' && grouped.units.length > 0 && (
        <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {grouped.units.map((unit) => (
            <BunkUnit
              key={unit.unitCode}
              unitCode={unit.unitCode}
              spaces={unit.spaces}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      {selected && (
        <BedDrawer
          spaceId={selected}
          canBlock={canBlock}
          onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); window.location.reload(); }}
        />
      )}
    </>
  );
}

function BedTile({ row, onClick }: { row: BedRow; onClick: () => void }) {
  const s = STATUS_STYLE[row.status];
  const title = `${row.code} — ${s.label}${row.current_booking_reference ? ` · ${row.current_booking_reference}` : ''}${row.women_reserved ? ' · women-reserved' : ''}`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="group flex flex-col items-center focus:outline-none"
    >
      <div
        className="relative rounded-lg border-2 transition-transform group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-brand-900 group-focus-visible:ring-offset-2"
        style={{ width: 52, height: 88, background: s.fill, borderColor: s.border }}
      >
        <div
          className="absolute rounded"
          style={{ top: 5, left: 5, right: 5, height: 16, background: s.pillow }}
        />
        {row.women_reserved && (
          <span
            className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white shadow"
            style={{ background: '#B3261E' }}
            aria-hidden
          >
            W
          </span>
        )}
      </div>
      <span className="mt-1 font-mono text-[10px] leading-tight" style={{ color: s.text }}>
        {row.code}
      </span>
    </button>
  );
}

function BunkUnit({
  unitCode, spaces, onSelect,
}: {
  unitCode: string;
  spaces: BedRow[];
  onSelect: (id: string) => void;
}) {
  const upper = spaces.find((s) => s.position === 'upper');
  const lower = spaces.find((s) => s.position === 'lower');

  return (
    <div className="flex flex-col items-center rounded-card border border-line bg-surface p-2">
      <span className="mb-1 font-mono text-[10px] text-muted">{unitCode}</span>
      {upper ? (
        <BedTile row={upper} onClick={() => onSelect(upper.space_id)} />
      ) : (
        <div className="flex flex-col items-center opacity-25">
          <div className="rounded-lg border border-dashed border-line" style={{ width: 52, height: 88 }} />
          <span className="mt-1 text-[10px] text-muted">—</span>
        </div>
      )}
      <div className="my-1 h-px w-10 bg-line" />
      {lower ? (
        <BedTile row={lower} onClick={() => onSelect(lower.space_id)} />
      ) : (
        <div className="flex flex-col items-center opacity-25">
          <div className="rounded-lg border border-dashed border-line" style={{ width: 52, height: 88 }} />
          <span className="mt-1 text-[10px] text-muted">—</span>
        </div>
      )}
    </div>
  );
}

function BedDrawer({
  spaceId, canBlock, onClose, onChanged,
}: {
  spaceId: string;
  canBlock: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const detail = useAsync(() => getBedDetail(spaceId), [spaceId]);

  const [fromDate, setFromDate] = useState('');
  const [fromHour, setFromHour] = useState('10');
  const [fromMinute, setFromMinute] = useState('00');
  const [fromPeriod, setFromPeriod] = useState<'AM' | 'PM'>('AM');

  const [toDate, setToDate] = useState('');
  const [toHour, setToHour] = useState('10');
  const [toMinute, setToMinute] = useState('00');
  const [toPeriod, setToPeriod] = useState<'AM' | 'PM'>('AM');

  const [reason, setReason] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try { (e.target as HTMLInputElement).showPicker?.(); } catch {}
  };

  function clearForm() {
    setFromDate('');
    setFromHour('10');
    setFromMinute('00');
    setFromPeriod('AM');
    setToDate('');
    setToHour('10');
    setToMinute('00');
    setToPeriod('AM');
    setReason('');
    setErr(null);
  }

  function buildIso(dateStr: string, hourStr: string, minuteStr: string, period: 'AM' | 'PM') {
    if (!dateStr) return '';
    let h = parseInt(hourStr, 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return new Date(`${dateStr}T${h.toString().padStart(2, '0')}:${minuteStr}:00`).toISOString();
  }

  async function doBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!fromDate || !toDate) return;
    
    const fromIso = buildIso(fromDate, fromHour, fromMinute, fromPeriod);
    const toIso = buildIso(toDate, toHour, toMinute, toPeriod);

    if (new Date(toIso) <= new Date(fromIso)) {
      setErr('End time must be after start time.');
      return;
    }

    setBlocking(true);
    setErr(null);
    try {
      await blockBed(spaceId, fromIso, toIso, reason || 'Maintenance');
      onChanged();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Block failed');
    } finally {
      setBlocking(false);
    }
  }

  async function doRelease(blockId: string) {
    setBlocking(true);
    setErr(null);
    try {
      await releaseBlock(blockId);
      onChanged();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Release failed');
    } finally {
      setBlocking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bed-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-card bg-surface shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
          <h2 id="bed-modal-title" className="text-base font-semibold text-ink">
            Bed details
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-input p-1.5 text-muted hover:bg-bg hover:text-ink"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          {detail.status === 'loading' && <Spinner />}
          {detail.status === 'error' && <ErrorState message={detail.error.message} />}
          {detail.status === 'success' && <BedDetailBody detail={detail.data} />}

          {canBlock && (
            <div className="mt-6 border-t border-line pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Block for maintenance</h3>
                <button
                  type="button"
                  onClick={clearForm}
                  className="text-xs font-medium text-brand-900 hover:underline"
                >
                  Clear all
                </button>
              </div>
              
              <form onSubmit={doBlock} className="space-y-4">
                <div>
                  <p className="mb-1.5 block text-sm font-medium text-ink">
                    From <span className="text-[#B3261E]">*</span>
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className={`${inputClass} flex-1 cursor-pointer`}
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      onClick={openPicker}
                      required
                    />
                    <div className="flex gap-1">
                      <select className={`${inputClass} w-16 cursor-pointer px-2`} value={fromHour} onChange={(e) => setFromHour(e.target.value)}>
                        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select className={`${inputClass} w-16 cursor-pointer px-2`} value={fromMinute} onChange={(e) => setFromMinute(e.target.value)}>
                        {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select className={`${inputClass} w-20 cursor-pointer px-2`} value={fromPeriod} onChange={(e) => setFromPeriod(e.target.value as 'AM' | 'PM')}>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 block text-sm font-medium text-ink">
                    To <span className="text-[#B3261E]">*</span>
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className={`${inputClass} flex-1 cursor-pointer`}
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      onClick={openPicker}
                      required
                    />
                    <div className="flex gap-1">
                      <select className={`${inputClass} w-16 cursor-pointer px-2`} value={toHour} onChange={(e) => setToHour(e.target.value)}>
                        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select className={`${inputClass} w-16 cursor-pointer px-2`} value={toMinute} onChange={(e) => setToMinute(e.target.value)}>
                        {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select className={`${inputClass} w-20 cursor-pointer px-2`} value={toPeriod} onChange={(e) => setToPeriod(e.target.value as 'AM' | 'PM')}>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="blk-reason" className="mb-1.5 block text-sm font-medium text-ink">
                    Reason
                  </label>
                  <input
                    id="blk-reason"
                    className={inputClass}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <Button type="submit" loading={blocking}>
                  Create block
                </Button>
                {err && <p role="alert" className="text-sm text-[#B3261E]">{err}</p>}
              </form>

              {detail.status === 'success' && detail.data.maintenance_history.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs uppercase tracking-wide text-muted">Maintenance blocks</h4>
                  <ul className="mt-2 space-y-1 text-sm">
                    {detail.data.maintenance_history.map((b) => (
                      <li key={b.id} className="flex items-center justify-between rounded-input border border-line p-2">
                        <div>
                          <p className="text-ink">
                            {formatDateTime(b.blocked_from)} → {formatDateTime(b.blocked_to)}
                          </p>
                          {b.reason && <p className="text-xs text-muted">{b.reason}</p>}
                        </div>
                        <button
                          onClick={() => doRelease(b.id)}
                          className="text-xs text-brand-900 hover:underline"
                        >
                          Release
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BedDetailBody({ detail }: { detail: BedDetail }) {
  const s = detail.space;
  return (
    <div className="space-y-4">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Bed ID</dt><dd className="font-mono text-ink">{s.code}</dd></div>
        <div><dt className="text-muted">Section</dt><dd className="text-ink">{s.section_code === 'AC' ? 'AC Hall' : 'Non-AC Hall'}</dd></div>
        <div><dt className="text-muted">Position</dt><dd className="text-ink">{s.position}</dd></div>
        <div><dt className="text-muted">Zone</dt><dd className="text-ink">{s.zone_name}</dd></div>
        {s.family_compartment_code && (
          <div><dt className="text-muted">Compartment</dt><dd className="text-ink">{s.family_compartment_code}</dd></div>
        )}
        {s.women_reserved && (
          <div><dt className="text-muted">Women-reserved</dt><dd className="text-ink">Yes</dd></div>
        )}
      </dl>

      {detail.current_booking && (
        <div className="rounded-input border border-line bg-bg p-3">
          <p className="text-xs uppercase text-muted">Current booking</p>
          <p className="mt-1 font-mono text-sm text-ink">{detail.current_booking.reference}</p>
          <p className="text-xs text-muted">
            {detail.current_booking.guest_name ?? '—'} · checkout {formatDateTime(detail.current_booking.ends_at)}
          </p>
        </div>
      )}

      {detail.upcoming_bookings.length > 0 && (
        <div>
          <p className="text-xs uppercase text-muted">Upcoming</p>
          <ul className="mt-1 space-y-1 text-sm">
            {detail.upcoming_bookings.map((b) => (
              <li key={b.id} className="rounded-input border border-line p-2">
                <span className="font-mono text-ink">{b.reference}</span>
                <span className="ml-2 text-xs text-muted">{formatDateTime(b.starts_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}