import { Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getPublishedRatePlans, getActiveFamilyPolicy } from '../../lib/queries';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { NotConfiguredNotice } from '../../components/NotConfiguredNotice';
import { PropertyPhoto } from '../../components/PropertyPhoto';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { Spinner } from '../../components/Spinner';
import { IMAGES } from '../../lib/images';

export function AcAccommodationPage() {
  const plans = useAsync(getPublishedRatePlans, []);
  const family = useAsync(getActiveFamilyPolicy, []);

  if (plans.status === 'loading' || family.status === 'loading') return <Spinner />;
  if (plans.status === 'error') return <ErrorState message={plans.error.message} />;
  if (family.status === 'error') return <ErrorState message={family.error.message} />;

  const acIndividual = plans.data.find((p) => p.plan.product_type === 'ac_individual');
  const acCompartment = plans.data.find((p) => p.plan.product_type === 'ac_family_compartment');
  const familyPublished = !!family.data;

  return (
    <>
      <PageHeader
        eyebrow="AC Hall"
        title="50 individual sleeping spaces"
        intro="Thirty individually partitioned beds plus ten private two-bed family compartments. Each bed is independently assigned."
        actions={<Link to="/book?product=ac_individual"><Button>Check availability</Button></Link>}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="30 individual AC beds" subtitle="Independently assigned sleeping spaces">
          <ul className="space-y-2 text-sm text-muted">
            <li>Partitioned on all four sides with a doorway opening</li>
            <li>Partition height approximately 170 cm — full standing privacy</li>
            <li>Women-reserved spaces designated by the property</li>
            <li>Access to the AC washroom group</li>
          </ul>
          <div className="mt-5">
            {acIndividual?.published ? (
              <p className="text-sm text-ink">
                Hourly booking available. See <Link to="/pricing" className="underline">pricing</Link> for details.
              </p>
            ) : (
              <NotConfiguredNotice
                title="Rates not yet published — please enquire."
                body="The property has not yet published a rate for AC individual beds."
              />
            )}
          </div>
        </SectionCard>

        <SectionCard title="10 AC family compartments" subtitle="Private two-bed units">
          <ul className="space-y-2 text-sm text-muted">
            <li>Reserved as a complete private unit</li>
            <li>Both beds belong to the same family reservation</li>
            <li>Never sold as two unrelated individual bookings</li>
            <li>Partitions on all four sides with a private entrance</li>
          </ul>
          <div className="mt-5">
            {!familyPublished ? (
              <NotConfiguredNotice
                title="Family compartment reservations are not yet available for online confirmation."
                body="The property is completing its family-eligibility policy. Once published, compartment bookings will open here."
              />
            ) : acCompartment?.published ? (
              <Link to="/book?product=ac_family_compartment"><Button>Book a compartment</Button></Link>
            ) : (
              <NotConfiguredNotice
                title="Rates not yet published — please enquire."
                body="Family compartment rates have not yet been published."
              />
            )}
          </div>
        </SectionCard>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <PropertyPhoto image={IMAGES.acBedPartition} />
        <PropertyPhoto image={IMAGES.acFamilyInside} />
      </div>

      <div className="mt-6">
        <PropertyPhoto image={IMAGES.acHallOverview} />
      </div>
    </>
  );
}