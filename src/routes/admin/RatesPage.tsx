import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getRatePlans, publishRateVersion } from '../../lib/admin';
import type { AdminOutletContext } from '../../components/Guards';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatCurrencyINR } from '../../lib/format';
import type { RatePlanWithVersion } from '../../lib/admin';

export function AdminRatesPage() {
  const { permissions } = useOutletContext<AdminOutletContext>();
  const canEdit = permissions.includes('rates.manage');
  const plans = useAsync(getRatePlans, []);
  const [editing, setEditing] = useState<RatePlanWithVersion | null>(null);

  if (plans.status === 'loading') return <Spinner />;
  if (plans.status === 'error') return <ErrorState message={plans.error.message} />;

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Rates & pricing" intro="Each published version is preserved. Publishing a new version closes the previous one at the current timestamp." />

      <div className="grid gap-4 md:grid-cols-3">
        {plans.data.map((p) => (
          <SectionCard key={p.id} title={p.name} subtitle={p.product_type.replaceAll('_', ' ')}>
            {p.current_version ? (
              <dl className="space-y-1 text-sm">
                <Row label="Hourly" value={p.current_version.hourly_rate_paise} />
                <Row label="Extra hour" value={p.current_version.extra_hour_rate_paise} />
                <Row label="Overnight" value={p.current_version.overnight_rate_paise} />
                <Row label="Extended" value={p.current_version.extended_stay_rate_paise} />
                <Row label="Min booking" value={p.current_version.min_booking_minutes} suffix="min" />
                <p className="pt-2 text-xs text-muted">Version {p.current_version.version} · effective {p.current_version.effective_from.slice(0, 10)}</p>
              </dl>
            ) : (
              <p className="text-sm text-muted">Not yet published.</p>
            )}
            {canEdit && (
              <div className="mt-3">
                <Button onClick={() => setEditing(p)} variant="secondary">
                  {p.current_version ? 'Publish new version' : 'Publish first version'}
                </Button>
              </div>
            )}
          </SectionCard>
        ))}
      </div>

      {editing && (
        <RateEditor
          plan={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); window.location.reload(); }}
        />
      )}
    </>
  );
}

function Row({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums text-ink">
        {value == null ? '—' : suffix ? `${value} ${suffix}` : formatCurrencyINR(value)}
      </dd>
    </div>
  );
}

function RateEditor({ plan, onClose, onSaved }: {
  plan: RatePlanWithVersion; onClose: () => void; onSaved: () => void;
}) {
  const v = plan.current_version;
  const [hourly, setHourly] = useState<number | null>(v?.hourly_rate_paise ?? null);
  const [extra, setExtra] = useState<number | null>(v?.extra_hour_rate_paise ?? null);
  const [overnight, setOvernight] = useState<number | null>(v?.overnight_rate_paise ?? null);
  const [overnightMin, setOvernightMin] = useState<number | null>(v?.overnight_minutes ?? 720);
  const [extended, setExtended] = useState<number | null>(v?.extended_stay_rate_paise ?? null);
  const [extendedMin, setExtendedMin] = useState<number | null>(v?.extended_stay_minutes ?? 10080);
  const [minBooking, setMinBooking] = useState<number>(v?.min_booking_minutes ?? (plan.product_type === 'ac_family_compartment' ? 720 : 120));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true); setErr(null);
    try {
      await publishRateVersion(plan.id, {
        hourly_rate_paise: hourly,
        extra_hour_rate_paise: extra,
        overnight_rate_paise: overnight,
        overnight_minutes: overnightMin,
        extended_stay_rate_paise: extended,
        extended_stay_minutes: extendedMin,
        min_booking_minutes: minBooking,
        deposit_paise: null,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-card bg-surface p-6 shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ink">Publish new version — {plan.name}</h2>
        <p className="mt-1 text-sm text-muted">Next version: {plan.next_version_number}</p>

        <div className="mt-4 space-y-3">
          <MoneyField label="Hourly rate (₹)" value={hourly} onChange={setHourly} />
          <MoneyField label="Extra-hour rate (₹)" value={extra} onChange={setExtra} />
          <MoneyField label="Overnight rate (₹)" value={overnight} onChange={setOvernight} />
          <Field label="Overnight duration (minutes)" htmlFor="overnight-min">
            <input id="overnight-min" type="number" className={inputClass}
              value={overnightMin ?? ''} onChange={(e) => setOvernightMin(e.target.value ? Number(e.target.value) : null)} />
          </Field>
          <MoneyField label="Extended-stay rate (₹)" value={extended} onChange={setExtended} />
          <Field label="Extended-stay duration (minutes)" htmlFor="ext-min">
            <input id="ext-min" type="number" className={inputClass}
              value={extendedMin ?? ''} onChange={(e) => setExtendedMin(e.target.value ? Number(e.target.value) : null)} />
          </Field>
          <Field label="Minimum booking (minutes)" htmlFor="min-booking" required>
            <input id="min-booking" type="number" className={inputClass}
              value={minBooking} onChange={(e) => setMinBooking(Number(e.target.value))} />
          </Field>
        </div>

        {err && <p role="alert" className="mt-3 text-sm text-[#B3261E]">{err}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} loading={saving}>Publish</Button>
        </div>
      </div>
    </div>
  );
}

function MoneyField({ label, value, onChange }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
}) {
  return (
    <Field label={label} htmlFor={label}>
      <input id={label} type="number" step="1" className={inputClass}
        value={value == null ? '' : value / 100}
        onChange={(e) => onChange(e.target.value ? Math.round(Number(e.target.value) * 100) : null)} />
    </Field>
  );
}