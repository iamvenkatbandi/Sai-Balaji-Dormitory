import { useAsync } from '../../lib/useAsync';
import { getSettings } from '../../lib/queries';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { EmptyState } from '../../components/EmptyState';
import { PropertyPhoto } from '../../components/PropertyPhoto';
import { IMAGES } from '../../lib/images';

export function FacilitiesPage() {
  const settings = useAsync(getSettings, []);
  const s = settings.status === 'success' ? settings.data : null;

  return (
    <>
      <PageHeader
        eyebrow="Facilities"
        title="What is confirmed at Sai Balaji Dormitory"
        intro="Only facilities verified by the property are shown. Anything still under verification will not be listed here."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="AC Hall">
          <ul className="space-y-2 text-sm text-muted">
            <li>Individually partitioned AC beds (30 spaces)</li>
            <li>Four-sided partition cubicles with doorway opening</li>
            <li>Private two-bed family compartments (10 units)</li>
            <li>Dedicated AC washroom group</li>
          </ul>
        </SectionCard>

        <SectionCard title="Non-AC Hall">
          <ul className="space-y-2 text-sm text-muted">
            <li>Two-level bunk beds (100 units, 200 spaces)</li>
            <li>Ladder and safety rail on upper bunks</li>
            <li>Dedicated Non-AC washroom group</li>
            <li>Women-reserved spaces designated by the property</li>
          </ul>
        </SectionCard>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <SectionCard title="Washrooms" subtitle="Separate groups for AC and Non-AC sections">
          {s?.washroom_counts_confirmed ? (
            <p className="text-sm text-muted">
              Detailed fixture counts are published on the property's verified listing.
            </p>
          ) : (
            <p className="text-sm text-muted">
              Each section has its own washroom group. Toilet, basin and shower counts are not
              published here until the property has verified the installed facilities.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Cleaning and maintenance standards">
          <ul className="space-y-2 text-sm text-muted">
            <li>Cleaning buffer between guests: {s?.cleaning_buffer_minutes ?? 30} minutes</li>
            <li>Each sleeping space moves through Cleaning before becoming bookable again</li>
            <li>Maintenance holds block affected inventory immediately</li>
          </ul>
        </SectionCard>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <PropertyPhoto image={IMAGES.acWashroomCorridor} />
        <PropertyPhoto image={IMAGES.nonAcWashroomCorridor} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <PropertyPhoto image={IMAGES.bedTurnover} />
        <PropertyPhoto image={IMAGES.nonAcHallAisle} />
      </div>

      <div className="mt-6">
        <EmptyState
          title="Additional amenities not yet published."
          body="The property has not yet confirmed any additional amenities beyond the two accommodation halls and their washroom groups. Newly confirmed items will appear here after verification."
        />
      </div>
    </>
  );
}