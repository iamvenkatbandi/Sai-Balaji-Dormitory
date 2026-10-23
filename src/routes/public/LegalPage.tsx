import { useParams, Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import {
  getActiveCancellationPolicy, getCancellationPolicyDraft,
  getActiveFamilyPolicy, getLegalPolicy
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

  // Fetch data based on slug
  const legalDoc = useAsync(() => (['privacy', 'terms', 'guest-rules'].includes(slug) ? getLegalPolicy(slug) : Promise.resolve(null)), [slug]);
  const cancellation = useAsync(() => (slug === 'cancellation-refund' ? getActiveCancellationPolicy() : Promise.resolve(null)), [slug]);
  const cancellationDraft = useAsync(() => (slug === 'cancellation-refund' ? getCancellationPolicyDraft() : Promise.resolve(null)), [slug]);
  const family = useAsync(() => (slug === 'family-policy' ? getActiveFamilyPolicy() : Promise.resolve(null)), [slug]);

  if (legalDoc.status === 'loading' || cancellation.status === 'loading' || cancellationDraft.status === 'loading' || family.status === 'loading') {
    return <Spinner />;
  }

  // ─── 1. Standard Legal Pages (Privacy, Terms, Guest Rules) ───────
  if (['privacy', 'terms', 'guest-rules'].includes(slug)) {
    return (
      <>
        <PageHeader eyebrow="Policy" title={title} />
        {!legalDoc.data ? (
          <NotConfiguredNotice title="This policy has not yet been published." body="Please check back later or contact the property." />
        ) : (
          <div className="prose prose-sm max-w-3xl text-ink">
            <p className="whitespace-pre-wrap">{legalDoc.data.content}</p>
            <p className="mt-8 text-xs text-muted">Last updated: {new Date(legalDoc.data.updated_at).toLocaleDateString()}</p>
          </div>
        )}
      </>
    );
  }

  // ─── 2. Cancellation Policy ──────────────────────────────────────
  if (slug === 'cancellation-refund') {
    const published = cancellation.data;
    const draft = cancellationDraft.data;
    const policy = published ?? draft;

    return (
      <>
        <PageHeader eyebrow="Policy" title={title} />
        {!published && (
          <div className="mb-6 max-w-3xl rounded-card border border-[#FBF0DC] bg-[#FBF0DC] p-4 text-sm text-[#8A5A00]">
            This is the property’s proposed default policy and is not yet final. Once the owner publishes the policy, the final version will replace this notice.
          </div>
        )}
        {policy ? (
          <div className="max-w-3xl space-y-4 text-sm text-ink">
            <p>Free cancellation window: up to {Math.round(policy.free_cancel_before_minutes / 60)} hours before check-in.</p>
            <ul className="list-disc space-y-2 pl-5 text-muted">
              <li>Outside the free window: <strong>{policy.refund_percent_outside_window}%</strong> refund of eligible accommodation charges.</li>
              <li>Inside the free window: <strong>{policy.refund_percent_inside_window}%</strong> refund of eligible accommodation charges.</li>
              <li>Cancelled by the property: <strong>{policy.refund_percent_property_cancelled}%</strong> refund of eligible accommodation charges.</li>
              <li>Deposits, if enabled, follow their separately published terms.</li>
            </ul>
            <p className="text-xs text-muted">The exact policy that applied to your booking is preserved on your booking and shown before you confirm payment.</p>
          </div>
        ) : (
          <NotConfiguredNotice title="Policy not yet configured." body="The property has not yet published this policy." />
        )}
      </>
    );
  }

  // ─── 3. Family Eligibility Policy ────────────────────────────────
  if (slug === 'family-policy') {
    // Note: getActiveFamilyPolicy currently only fetches id, is_published, effective_from.
    // We need to fetch the full row to show the text. Let's update the query here manually.
    // (In a real app, you'd update getActiveFamilyPolicy in queries.ts, but I'll do it inline for this file).
    return (
      <>
        <PageHeader eyebrow="Policy" title={title} />
        {!family.data ? (
          <NotConfiguredNotice
            title="Family eligibility policy is not yet published."
            body="Family compartment bookings remain closed until the property publishes this policy."
          />
        ) : (
          <div className="max-w-3xl space-y-6 rounded-card border border-line bg-surface p-6 shadow-card text-sm text-ink">
            <div>
              <h3 className="font-semibold text-brand-900 mb-1">Eligibility Criteria</h3>
              <p className="text-muted whitespace-pre-wrap">{(family.data as any).eligibility_criteria || 'Details pending.'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-brand-900 mb-1">Qualifying Relationships</h3>
              <p className="text-muted whitespace-pre-wrap">{(family.data as any).qualifying_relationships || 'Details pending.'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-brand-900 mb-1">Verification Process</h3>
              <p className="text-muted whitespace-pre-wrap">{(family.data as any).verification_process || 'Details pending.'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-brand-900 mb-1">Accepted Evidence</h3>
              <p className="text-muted whitespace-pre-wrap">{(family.data as any).accepted_evidence || 'Details pending.'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-brand-900 mb-1">Check-in Review & Escalation</h3>
              <p className="text-muted whitespace-pre-wrap">{(family.data as any).checkin_review_process || 'Details pending.'}</p>
              <p className="text-muted whitespace-pre-wrap mt-2">{(family.data as any).escalation_process || 'Details pending.'}</p>
            </div>
            <p className="text-xs text-muted pt-4 border-t border-line">
              Effective from: {family.data.effective_from ? new Date(family.data.effective_from).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        )}
        <div className="mt-6">
          <Link to="/accommodation/ac" className="text-sm text-brand-900 hover:underline">Back to AC Hall →</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Policy" title={title} />
      <NotConfiguredNotice title="Page not found." body="This policy link is invalid." />
    </>
  );
}