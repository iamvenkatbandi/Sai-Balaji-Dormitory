import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import {
  getBedsStatus, getBedDetail, blockBed, releaseBlock,
} from '../../lib/admin';
import type { AdminOutletContext } from '../../components/Guards';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { StatusChip } from '../../components/StatusChip';
import { formatDateTime } from '../../lib/format';
import type { BedDetail, BedRow, BedStatus } from '../../lib/database.types';

const STATUSES: Array<BedStatus | 'all'> = ['all','available','reserved','occupied','cleaning','maintenance','inactive'];

export function AdminBedsPage() {
  const { permissions } = useOutletContext<AdminOutletContext>();
  const canBlock = permissions.includes('beds.block');

  const [section, setSection] = useState<'AC' | 'NON_AC'>('AC');
  const [status, setStatus] = useState<BedStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const beds = useAsync(
    () => getBedsStatus({
      section,
      status: status === 'all' ? null : status,
      search: search.trim() || null,
    }),
    [section, status, search],
  );

  const grouped = useMemo(() => {
    if (beds.status !== 'success') return { units: [], individual: [] as BedRow[] };
    if (section === 'NON_AC') {
      const map = new Map<string, { unitCode: string; spaces: BedRow[] }>();
      for (const row of beds.data) {
        const key = row.bunk_unit_code ?? 'unknown';
        if (!map.has(key)) map.set(key, { unitCode: key, spaces: [] });
        map.get(key)!.spaces.push(row);
      }
      const units = Array.from(map.values()).sort((a, b) => a.unitCode.localeCompare(b.unitCode));
      return { units, individual: [] as BedRow[] };
    }
    return { units: [], individual: [...beds.data].sort((a, b) => a.code.localeCompare(b.code)) };
  }, [beds.status === 'success' ? beds.data : null, section]);

  return (
    <>
      <PageHeader eyebrow="Inventory" title="Bed inventory" intro="Live status of every sleeping space. Click any bed for details and actions." />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex rounded-input border border-line bg-surface">
          <button onClick={() => setSection('AC')}
            className={`px-4 py-2 text-sm ${section === 'AC' ? 'bg-brand-900 text-white' : 'text-ink hover:bg-bg'} rounded-l-input`}>
            AC Hall
          </button>
          <button onClick={() => setSection('NON_AC')}
            className={`px-4 py-2 text-sm ${section === 'NON_AC' ? 'bg-brand-900 text-white' : 'text-ink hover:bg-bg'} rounded-r-input`}>
            Non-AC Hall
          </button>
        </div>
        <select
          className={`${inputClass} w-auto`}
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          aria-label="Status filter"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <input
          className={`${inputClass} w-auto`}
          placeholder="Search bed ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search bed ID"
        />
      </div>

      {beds.status === 'loading' && <Spinner />}
      {beds.status === 'error' && <ErrorState message={beds.error.message} />}
      {beds.status === 'success' && beds.data.length === 0 && (
        <EmptyState title="No beds match these filters." body="Adjust the section, status or search to see inventory." />
      )}

      {beds.status === 'success' && section === 'AC' && grouped.individual.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {grouped.individual.map((row) => (
            <button key={row.space_id}
              onClick={() => setSelected(row.space_id)}
              className="rounded-input border border-line bg-surface p-3 text-left hover:bg-bg">
              <p className="font-mono text-xs text-ink">{row.code}</p>
              <div className="mt-1"><StatusChip status={row.status} /></div>
            </button>
          ))}
        </div>
      )}

      {beds.status === 'success' && section === 'NON_AC' && grouped.units.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {grouped.units.map((unit) => {
            const upper = unit.spaces.find((s) => s.position === 'upper');
            const lower = unit.spaces.find((s) => s.position === 'lower');
            return (
              <div key={unit.unitCode} className="rounded-card border border-line bg-surface p-3">
                <p className="mb-2 font-mono text-xs text-muted">{unit.unitCode}</p>
                {[upper, lower].filter(Boolean).map((row) => row && (
                  <button key={row.space_id}
                    onClick={() => setSelected(row.space_id)}
                    className="mb-1 flex w-full items-center justify-between rounded-md border border-line px-2 py-1.5 text-left hover:bg-bg">
                    <span className="font-mono text-xs text-ink">{row.code}</span>
                    <StatusChip status={row.status} />
                  </button>
                ))}
              </div>
            );
          })}
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

function BedDrawer({ spaceId, canBlock, onClose, onChanged }: {
  spaceId: string; canBlock: boolean; onClose: () => void; onChanged: () => void;
}) {
  const detail = useAsync(() => getBedDetail(spaceId), [spaceId]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    setBlocking(true); setErr(null);
    try {
      await blockBed(spaceId, new Date(from).toISOString(), new Date(to).toISOString(), reason || 'Maintenance');
      onChanged();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Block failed');
    } finally {
      setBlocking(false);
    }
  }

  async function doRelease(blockId: string) {
    setBlocking(true); setErr(null);
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
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-surface shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-base font-semibold text-ink">Bed details</h2>
          <button onClick={onClose} className="rounded-input px-2 py-1 text-sm text-muted hover:bg-bg">Close</button>
        </div>
        <div className="p-4">
          {detail.status === 'loading' && <Spinner />}
          {detail.status === 'error' && <ErrorState message={detail.error.message} />}
          {detail.status === 'success' && <BedDetailBody detail={detail.data} />}

          {canBlock && (
            <div className="mt-6 border-t border-line pt-4">
              <h3 className="text-sm font-semibold text-ink">Block for maintenance</h3>
              <form onSubmit={doBlock} className="mt-3 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="From" htmlFor="blk-from" required>
                    <input id="blk-from" type="datetime-local" className={inputClass}
                      value={from} onChange={(e) => setFrom(e.target.value)} required />
                  </Field>
                  <Field label="To" htmlFor="blk-to" required>
                    <input id="blk-to" type="datetime-local" className={inputClass}
                      value={to} onChange={(e) => setTo(e.target.value)} required />
                  </Field>
                </div>
                <Field label="Reason" htmlFor="blk-reason">
                  <input id="blk-reason" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                <Button type="submit" loading={blocking}>Create block</Button>
                {err && <p role="alert" className="text-sm text-[#B3261E]">{err}</p>}
              </form>

              {detail.status === 'success' && detail.data.maintenance_history.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs uppercase tracking-wide text-muted">Maintenance blocks</h4>
                  <ul className="mt-2 space-y-1 text-sm">
                    {detail.data.maintenance_history.map((b) => (
                      <li key={b.id} className="flex items-center justify-between rounded-input border border-line p-2">
                        <div>
                          <p className="text-ink">{formatDateTime(b.blocked_from)} → {formatDateTime(b.blocked_to)}</p>
                          {b.reason && <p className="text-xs text-muted">{b.reason}</p>}
                        </div>
                        <button onClick={() => doRelease(b.id)} className="text-xs text-brand-900 hover:underline">Release</button>
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