import { Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getPublishedRatePlans } from '../../lib/queries';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { NotConfiguredNotice } from '../../components/NotConfiguredNotice';
import { PropertyPhoto } from '../../components/PropertyPhoto';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Spinner } from '../../components/Spinner';
import { IMAGES } from '../../lib/images';

export function NonAcAccommodationPage() {
  const plans = useAsync(getPublishedRatePlans, []);

  if (plans.status === 'loading') return <Spinner />;
  if (plans.status === 'error') return <ErrorState message={plans.error.message} />;

  const nonAc = plans.data.find((p) => p.plan.product_type === 'non_ac_space');

  return (
    <>
      <PageHeader
        eyebrow="Non-AC Hall"
        title="100 bunk units · 200 individual sleeping spaces"
        intro="Each bunk unit has one lower and one upper sleeping space. Both are independently assigned, subject to the property's same-gender bunk co-occupancy policy."
        actions={<Link to="/book?product=non_ac_space"><Button>Check availability</Button></Link>}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="100 bunk units" subtitle="Physical units — never booked as a whole">
          <ul className="space-y-2 text-sm text-muted">
            <li>Unit IDs: NA-001 through NA-100</li>
            <li>Each unit holds one lower bed and one upper bed</li>
            <li>Unit-level maintenance blocks both sleeping spaces</li>
            <li>Fixed ladder and safety rail on the upper level</li>
          </ul>
        </SectionCard>

        <SectionCard title="200 individual sleeping spaces" subtitle="Independently assigned">
          <ul className="space-y-2 text-sm text-muted">
            <li>Lower bed IDs: NA-001-L through NA-100-L</li>
            <li>Upper bed IDs: NA-001-U through NA-100-U</li>
            <li>Same-gender bunk co-occupancy policy applies</li>
            <li>Women-reserved spaces designated by the property</li>
          </ul>
        </SectionCard>
      </div>

      <div className="mt-6">
        {nonAc?.published ? (
          <p className="text-sm text-ink">
            Hourly booking available. See <Link to="/pricing" className="underline">pricing</Link> for rates.
          </p>
        ) : (
          <NotConfiguredNotice
            title="Rates not yet published — please enquire."
            body="The property has not yet published a rate for Non-AC sleeping spaces."
          />
        )}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <PropertyPhoto image={IMAGES.nonAcBunk} />
        <PropertyPhoto image={IMAGES.nonAcBunkDetail} />
      </div>

      <div className="mt-6">
        <PropertyPhoto image={IMAGES.nonAcHallOverview} aspectClass="aspect-[16/9]" />
      </div>
    </>
  );
}