import { Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getPublishedRatePlans, getSettings } from '../../lib/queries';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { NotConfiguredNotice } from '../../components/NotConfiguredNotice';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { formatCurrencyINR, formatDurationMinutes } from '../../lib/format';
import type { RatePlanVersion } from '../../lib/database.types';

function PlanDetail({ v }: { v: RatePlanVersion }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {v.hourly_rate_paise != null && (
        <div><dt className="text-muted">Hourly rate</dt><dd className="tabular-nums text-ink">{formatCurrencyINR(v.hourly_rate_paise)}</dd></div>
      )}
      {v.extra_hour_rate_paise != null && (
        <div><dt className="text-muted">Extra-hour rate</dt><dd className="tabular-nums text-ink">{formatCurrencyINR(v.extra_hour_rate_paise)}</dd></div>
      )}
      {v.overnight_rate_paise != null && (
        <div>
          <dt className="text-muted">Overnight package{v.overnight_minutes ? ` (${formatDurationMinutes(v.overnight_minutes)})` : ''}</dt>
          <dd className="tabular-nums text-ink">{formatCurrencyINR(v.overnight_rate_paise)}</dd>
        </div>
      )}
      {v.extended_stay_rate_paise != null && (
        <div>
          <dt className="text-muted">Extended stay{v.extended_stay_minutes ? ` (${formatDurationMinutes(v.extended_stay_minutes)})` : ''}</dt>
          <dd className="tabular-nums text-ink">{formatCurrencyINR(v.extended_stay_rate_paise)}</dd>
        </div>
      )}
      {v.min_booking_minutes != null && (
        <div><dt className="text-muted">Minimum booking</dt><dd className="text-ink">{formatDurationMinutes(v.min_booking_minutes)}</dd></div>
      )}
      {v.deposit_paise != null && (
        <div><dt className="text-muted">Refundable deposit</dt><dd className="tabular-nums text-ink">{formatCurrencyINR(v.deposit_paise)}</dd></div>
      )}
    </dl>
  );
}

export function PricingPage() {
  const plans = useAsync(getPublishedRatePlans, []);
  const settings = useAsync(getSettings, []);

  if (plans.status === 'loading' || settings.status === 'loading') return <Spinner />;
  if (plans.status === 'error') return <ErrorState message={plans.error.message} />;
  if (settings.status === 'error') return <ErrorState message={settings.error.message} />;

  const s = settings.data;
  const published = plans.data.filter((p) => p.published);
  const unpublished = plans.data.filter((p) => !p.published);

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Rates are configured by the property"
        intro="Prices depend on the accommodation type, the requested duration and the applicable rate plan. Tax treatment, deposits and any additional charges are shown separately before you confirm a booking."
      />

      {published.length > 0 && (
        <div className="grid gap-6 md:grid-cols-3">
          {published.map(({ plan, published: v }) => (
            <SectionCard key={plan.id} title={plan.name}>
              {v && <PlanDetail v={v} />}
            </SectionCard>
          ))}
        </div>
      )}

      {unpublished.length > 0 && (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {unpublished.map(({ plan }) => (
            <SectionCard key={plan.id} title={plan.name}>
              <NotConfiguredNotice
                title="Rates not yet published — please enquire."
                body="No published rate is currently available for this accommodation type."
              />
            </SectionCard>
          ))}
        </div>
      )}

      {plans.data.length === 0 && (
        <NotConfiguredNotice
          title="No rate plans configured."
          body="The property has not yet created any rate plans."
        />
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <SectionCard title="Booking rules" subtitle="Applied to every booking">
          <ul className="space-y-2 text-sm text-muted">
            <li>Minimum hourly booking: {formatDurationMinutes(s?.min_hourly_minutes ?? 120)}</li>
            <li>Cleaning buffer between guests: {s?.cleaning_buffer_minutes ?? 30} min</li>
            <li>Booking horizon: {s?.booking_horizon_days ?? 30} days</li>
            <li>Maximum continuous stay: {s?.max_stay_days ?? 30} days</li>
            <li>Overstay grace period: {s?.overstay_grace_minutes ?? 15} min</li>
            <li>Overstay escalation to staff review after: {s?.overstay_escalation_hours ?? 4} hours</li>
          </ul>
        </SectionCard>

        <SectionCard title="Deposits and taxes">
          <ul className="space-y-2 text-sm text-muted">
            <li>Refundable deposit: {s?.deposits_enabled ? 'Configured — shown before payment.' : 'Not required.'}</li>
            <li>Taxes and additional charges: displayed as separate line items when configured by the property.</li>
          </ul>
          <p className="mt-3 text-xs text-muted">
            No tax line is shown until the property has confirmed the applicable tax treatment and
            published a tax configuration.
          </p>
        </SectionCard>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link to="/book?product=ac_individual" className="text-sm font-medium text-brand-900 hover:underline">Book an AC individual bed →</Link>
        <Link to="/book?product=non_ac_space" className="text-sm font-medium text-brand-900 hover:underline">Book a Non-AC space →</Link>
        <Link to="/legal/cancellation-refund" className="text-sm font-medium text-brand-900 hover:underline">Cancellation & refund policy →</Link>
      </div>
    </>
  );
}