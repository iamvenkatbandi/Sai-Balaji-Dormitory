import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { getContact, getSettings, getPublishedRatePlans } from '../../lib/queries';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { SectionCard } from '../../components/SectionCard';
import { FaqItem } from '../../components/FaqItem';
import { PropertyPhoto } from '../../components/PropertyPhoto';
import { NotConfiguredNotice } from '../../components/NotConfiguredNotice';
import { IMAGES } from '../../lib/images';
import type { ProductType } from '../../lib/database.types';

export function HomePage() {
  const nav = useNavigate();
  const contact = useAsync(getContact, []);
  const settings = useAsync(getSettings, []);
  const plans = useAsync(getPublishedRatePlans, []);

  const [section, setSection] = useState<ProductType>('ac_individual');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [hours, setHours] = useState(2);

  const c = contact.status === 'success' ? contact.data : null;
  const s = settings.status === 'success' ? settings.data : null;
  const anyRatePublished = plans.status === 'success' && plans.data.some((p) => p.published);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    const start = new Date(`${date}T${time}:00`);
    const durationMinutes = section === 'ac_family_compartment' ? 24 * 60 : hours * 60;
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const q = new URLSearchParams({
      product: section,
      from: start.toISOString(),
      to: end.toISOString(),
    });
    nav(`/book?${q.toString()}`);
  }

  return (
    <div className="space-y-16">
      <section className="grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
            Sai Balaji Dormitory
          </p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Clean, flexible accommodation in two halls — AC and Non-AC.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted">
            250 individual sleeping spaces across an air-conditioned hall and a non-air-conditioned
            hall, with separate washroom groups and hourly, overnight and extended-stay bookings.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Accommodation" htmlFor="home-section">
                <select
                  id="home-section"
                  className={inputClass}
                  value={section}
                  onChange={(e) => setSection(e.target.value as ProductType)}
                >
                  <option value="ac_individual">AC — individual bed</option>
                  <option value="ac_family_compartment">AC — family compartment</option>
                  <option value="non_ac_space">Non-AC — bunk bed (single space)</option>
                </select>
              </Field>
              <Field label="Check-in date" htmlFor="home-date" required>
                <input
                  id="home-date"
                  type="date"
                  className={inputClass}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  required
                />
              </Field>
              <Field label="Check-in time" htmlFor="home-time" required>
                <input
                  id="home-time"
                  type="time"
                  className={inputClass}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </Field>
              <Field
                label="Duration (hours)"
                htmlFor="home-hours"
                hint={section === 'ac_family_compartment' ? 'Family compartments are booked overnight.' : undefined}
              >
                <input
                  id="home-hours"
                  type="number"
                  min={section === 'ac_family_compartment' ? 24 : (s?.min_hourly_minutes ?? 120) / 60}
                  step={0.5}
                  className={inputClass}
                  value={section === 'ac_family_compartment' ? 24 : hours}
                  disabled={section === 'ac_family_compartment'}
                  onChange={(e) => setHours(Number(e.target.value))}
                />
              </Field>
            </div>
            <Button type="submit" className="w-full sm:w-auto">Check availability</Button>
            {!anyRatePublished && plans.status === 'success' && (
              <p className="text-xs text-muted">
                Rates are not yet published. You can still check availability; the booking wizard
                will show enquiry-only options until rates are configured.
              </p>
            )}
          </form>
        </div>

        <PropertyPhoto image={IMAGES.heroAcHall} priority />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <SectionCard title="AC Hall" subtitle="50 individual sleeping spaces">
          <ul className="space-y-2 text-sm text-muted">
            <li>30 individually partitioned beds</li>
            <li>10 private two-bed family compartments</li>
            <li>Separate AC washroom group</li>
            <li>Women-reserved spaces designated by the property</li>
          </ul>
          <Link to="/accommodation/ac" className="mt-4 inline-block text-sm font-medium text-brand-900 hover:underline">
            Explore AC accommodation →
          </Link>
        </SectionCard>

        <SectionCard title="Non-AC Hall" subtitle="200 individual sleeping spaces">
          <ul className="space-y-2 text-sm text-muted">
            <li>100 physical bunk units (lower + upper beds)</li>
            <li>Each bed is an independently assigned space</li>
            <li>Separate Non-AC washroom group</li>
            <li>Same-gender bunk co-occupancy policy</li>
          </ul>
          <Link to="/accommodation/non-ac" className="mt-4 inline-block text-sm font-medium text-brand-900 hover:underline">
            Explore Non-AC accommodation →
          </Link>
        </SectionCard>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-ink">How booking works</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-4">
          {[
            'Choose AC or Non-AC.',
            'Pick a time and pricing plan.',
            'Review the final price.',
            'Complete verification and payment.',
          ].map((step, i) => (
            <li key={i} className="rounded-card border border-line bg-surface p-4">
              <p className="text-xs font-medium text-brand-700">Step {i + 1}</p>
              <p className="mt-1 text-sm text-ink">{step}</p>
            </li>
          ))}
        </ol>
        <Link to="/how-it-works" className="mt-4 inline-block text-sm font-medium text-brand-900 hover:underline">
          See the full process →
        </Link>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <SectionCard title="Facilities" subtitle="Published only after verification by the property">
          <ul className="space-y-2 text-sm text-muted">
            <li>Individual bed partitions in the AC hall</li>
            <li>Two-level bunk beds in the Non-AC hall</li>
            <li>Private family compartments in the AC hall</li>
            <li>Separate washroom groups for AC and Non-AC sections</li>
          </ul>
          <Link to="/facilities" className="mt-4 inline-block text-sm font-medium text-brand-900 hover:underline">
            All facilities →
          </Link>
        </SectionCard>

        <SectionCard title="Contact">
          {c?.address_line || c?.phone ? (
            <div className="space-y-1 text-sm text-muted">
              {c.address_line && <p>{c.address_line}</p>}
              {c.locality && <p>{c.locality}</p>}
              {c.phone && <p>Phone: {c.phone}</p>}
              {c.email && <p>Email: {c.email}</p>}
            </div>
          ) : (
            <NotConfiguredNotice
              title="Contact details are being finalised."
              body="The property will publish verified contact details here once confirmed."
            />
          )}
          <Link to="/contact" className="mt-4 inline-block text-sm font-medium text-brand-900 hover:underline">
            Contact the property →
          </Link>
        </SectionCard>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-ink">Frequently asked questions</h2>
        <div className="mt-4 space-y-3">
          <FaqItem
            question="Do I choose the exact bed?"
            answer="No. You choose a section and a time window. The property staff assign the exact sleeping space at check-in, subject to allocation policy and physical layout."
          />
          <FaqItem
            question="How are rates set?"
            answer="All rates are configured by the property in the Admin Control Room. If no rate has been published for the selected accommodation type and duration, the site will show an enquiry-only message instead of a price."
          />
          <FaqItem
            question="Can a family book a private compartment?"
            answer="AC family compartments are bookable as a private two-bed unit once the property has published its family-eligibility policy. Until then, the compartment booking path will show an enquiry message."
          />
        </div>
        <Link to="/faq" className="mt-4 inline-block text-sm font-medium text-brand-900 hover:underline">
          All FAQs →
        </Link>
      </section>
    </div>
  );
}