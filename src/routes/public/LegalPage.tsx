import { useParams, Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import {
  getActiveCancellationPolicy, getCancellationPolicyDraft, getActiveFamilyPolicy,
} from '../../lib/queries';
import { PageHeader } from '../../components/PageHeader';
import { NotConfiguredNotice } from '../../components/NotConfiguredNotice';
import { Spinner } from '../../components/Spinner';

const TITLES: Record<string, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms and Conditions',
  'cancellation-refund': 'Cancellation and Refund Policy',
  'guest-rules': 'Guest Rules and Accommodation Policies',
  'family-policy': 'Family Eligibility Policy',
};

export function LegalPage() {
  const { slug = '' } = useParams();
  const title = TITLES[slug] ?? 'Policy';
  const cancellation = useAsync(getActiveCancellationPolicy, []);
  const cancellationDraft = useAsync(getCancellationPolicyDraft, []);
  const family = useAsync(getActiveFamilyPolicy, []);

  if (slug === 'cancellation-refund') {
    if (cancellation.status === 'loading' || cancellationDraft.status === 'loading') return <Spinner />;
    const published = cancellation.status === 'success' ? cancellation.data : null;
    const draft = cancellationDraft.status === 'success' ? cancellationDraft.data : null;
    const policy = published ?? draft;

    return (
      <>
        <PageHeader eyebrow="Policy" title={title} />
        {!published && (
          <div className="mb-6 rounded-card border border-[#FBF0DC] bg-[#FBF0DC] p-4 text-sm text-[#8A5A00]">
            This is the property’s proposed default policy and is not yet final. Once the owner
            publishes the policy, the final version will replace this notice.
          </div>
        )}
        {policy ? (
          <div className="space-y-3 text-sm text-ink">
            <p>Free cancellation window: up to {Math.round(policy.free_cancel_before_minutes / 60)} hours before check-in.</p>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>Outside the free window: {policy.refund_percent_outside_window}% refund of eligible accommodation charges.</li>
              <li>Inside the free window: {policy.refund_percent_inside_window}% refund of eligible accommodation charges.</li>
              <li>Cancelled by the property: {policy.refund_percent_property_cancelled}% refund of eligible accommodation charges.</li>
              <li>Deposits, if enabled, follow their separately published terms.</li>
            </ul>
            <p className="text-xs text-muted">
              The exact policy that applied to your booking is preserved on your booking and shown
              before you confirm payment.
            </p>
          </div>
        ) : (
          <NotConfiguredNotice title="Policy not yet configured." body="The property has not yet published this policy." />
        )}
      </>
    );
  }

  if (slug === 'family-policy') {
    if (family.status === 'loading') return <Spinner />;
    const published = family.status === 'success' ? family.data : null;
    return (
      <>
        <PageHeader eyebrow="Policy" title={title} />
        {published ? (
          <p className="text-sm text-muted">
            The property has published a family-eligibility policy. Details are provided at the
            point of booking and at check-in.
          </p>
        ) : (
          <NotConfiguredNotice
            title="Family eligibility policy is not yet published."
            body="Family compartment bookings remain closed until the property publishes this policy."
          />
        )}
        <div className="mt-6">
          <Link to="/accommodation/ac" className="text-sm text-brand-900 hover:underline">
            Back to AC Hall →
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Policy" title={title} />
      <NotConfiguredNotice
        title="This policy has not yet been published."
        body="The property will publish its policy here once it has been reviewed and approved."
      />
    </>
  );
}