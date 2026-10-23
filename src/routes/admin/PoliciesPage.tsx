import { useEffect, useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { getCurrentFamilyPolicy, publishFamilyPolicy, unpublishFamilyPolicy, publishCancellationPolicy } from '../../lib/admin';
import { getActiveCancellationPolicy } from '../../lib/queries';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime } from '../../lib/format';

export function AdminPoliciesPage() {
  const family = useAsync(getCurrentFamilyPolicy, []);
  const cancellation = useAsync(getActiveCancellationPolicy, []);

  const [eligibility, setEligibility] = useState('');
  const [relationships, setRelationships] = useState('');
  const [verification, setVerification] = useState('');
  const [evidence, setEvidence] = useState('');
  const [checkinReview, setCheckinReview] = useState('');
  const [escalation, setEscalation] = useState('');
  const [legalReviewed, setLegalReviewed] = useState(false);
  const [familySaving, setFamilySaving] = useState(false);
  const [familyErr, setFamilyErr] = useState<string | null>(null);

  const [freeCancel, setFreeCancel] = useState(1440);
  const [outsidePct, setOutsidePct] = useState(100);
  const [insidePct, setInsidePct] = useState(0);
  const [propertyPct, setPropertyPct] = useState(100);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelErr, setCancelErr] = useState<string | null>(null);

  useEffect(() => {
    if (family.status === 'success' && family.data) {
      setEligibility(family.data.eligibility_criteria ?? '');
      setRelationships(family.data.qualifying_relationships ?? '');
      setVerification(family.data.verification_process ?? '');
      setEvidence(family.data.accepted_evidence ?? '');
      setCheckinReview(family.data.checkin_review_process ?? '');
      setEscalation(family.data.escalation_process ?? '');
      setLegalReviewed(family.data.legal_review_confirmed ?? false);
    }
  }, [family.status, family.status === 'success' ? family.data?.id : null]);

  useEffect(() => {
    if (cancellation.status === 'success' && cancellation.data) {
      setFreeCancel(cancellation.data.free_cancel_before_minutes);
      setOutsidePct(cancellation.data.refund_percent_outside_window);
      setInsidePct(cancellation.data.refund_percent_inside_window);
      setPropertyPct(cancellation.data.refund_percent_property_cancelled);
    }
  }, [cancellation.status, cancellation.status === 'success' ? cancellation.data?.id : null]);

  if (family.status === 'loading' || cancellation.status === 'loading') return <Spinner />;
  if (family.status === 'error') return <ErrorState message={family.error.message} />;
  if (cancellation.status === 'error') return <ErrorState message={cancellation.error.message} />;

  const familyPublished = !!family.data?.is_published;

  async function submitFamily(e: React.FormEvent) {
    e.preventDefault();
    setFamilySaving(true); setFamilyErr(null);
    try {
      await publishFamilyPolicy({ eligibility, relationships, verification, evidence, checkinReview, escalation, legalReviewed });
      window.location.reload();
    } catch (e) { setFamilyErr(e instanceof Error ? e.message : 'Publish failed'); } 
    finally { setFamilySaving(false); }
  }

  async function unpublishFamily() {
    if (!confirm('Unpublish the family policy? Family compartment bookings will close immediately.')) return;
    try { await unpublishFamilyPolicy(); window.location.reload(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  }

  async function submitCancellation(e: React.FormEvent) {
    e.preventDefault();
    setCancelSaving(true); setCancelErr(null);
    try {
      await publishCancellationPolicy({ freeCancelMinutes: freeCancel, outsidePct, insidePct, propertyPct });
      window.location.reload();
    } catch (e) { setCancelErr(e instanceof Error ? e.message : 'Publish failed'); } 
    finally { setCancelSaving(false); }
  }

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Policies" />

      <SectionCard title="Family eligibility policy" subtitle={familyPublished ? `Published ${family.data?.effective_from ? formatDateTime(family.data.effective_from) : ''}` : 'Not published — family compartment online bookings are closed'}>
        {familyPublished && (
          <div className="mb-4 rounded-input border border-[#E6F4ED] bg-[#E6F4ED] p-3 text-sm text-[#2E7D5B]">
            This policy is live. Publishing a new version closes this one.
            <button onClick={unpublishFamily} className="ml-3 underline">Unpublish</button>
          </div>
        )}
        <form onSubmit={submitFamily} className="space-y-3">
          <Field label="Eligibility criteria" htmlFor="fp-elig" required><textarea id="fp-elig" rows={3} className={inputClass} value={eligibility} onChange={(e) => setEligibility(e.target.value)} required /></Field>
          <Field label="Qualifying relationships" htmlFor="fp-rel" required><textarea id="fp-rel" rows={2} className={inputClass} value={relationships} onChange={(e) => setRelationships(e.target.value)} required /></Field>
          <Field label="Verification process" htmlFor="fp-ver" required><textarea id="fp-ver" rows={2} className={inputClass} value={verification} onChange={(e) => setVerification(e.target.value)} required /></Field>
          <Field label="Accepted evidence" htmlFor="fp-ev" required><textarea id="fp-ev" rows={2} className={inputClass} value={evidence} onChange={(e) => setEvidence(e.target.value)} required /></Field>
          <Field label="Check-in review process" htmlFor="fp-ci" required><textarea id="fp-ci" rows={2} className={inputClass} value={checkinReview} onChange={(e) => setCheckinReview(e.target.value)} required /></Field>
          <Field label="Escalation process" htmlFor="fp-esc" required><textarea id="fp-esc" rows={2} className={inputClass} value={escalation} onChange={(e) => setEscalation(e.target.value)} required /></Field>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" className="mt-1" checked={legalReviewed} onChange={(e) => setLegalReviewed(e.target.checked)} />
            I confirm that the property has completed appropriate legal and operational review of this policy.
          </label>
          {familyErr && <p role="alert" className="text-sm text-[#B3261E]">{familyErr}</p>}
          <Button type="submit" loading={familySaving}>{familyPublished ? 'Publish new version' : 'Publish policy'}</Button>
        </form>
      </SectionCard>

      <SectionCard title="Cancellation policy" className="mt-6">
        <form onSubmit={submitCancellation} className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Free window (min)" htmlFor="cp-free"><input id="cp-free" type="number" className={inputClass} value={freeCancel} onChange={(e) => setFreeCancel(Number(e.target.value))} /></Field>
            <Field label="Outside %" htmlFor="cp-out"><input id="cp-out" type="number" min={0} max={100} className={inputClass} value={outsidePct} onChange={(e) => setOutsidePct(Number(e.target.value))} /></Field>
            <Field label="Inside %" htmlFor="cp-in"><input id="cp-in" type="number" min={0} max={100} className={inputClass} value={insidePct} onChange={(e) => setInsidePct(Number(e.target.value))} /></Field>
            <Field label="Property-cancel %" htmlFor="cp-prop"><input id="cp-prop" type="number" min={0} max={100} className={inputClass} value={propertyPct} onChange={(e) => setPropertyPct(Number(e.target.value))} /></Field>
          </div>
          {cancelErr && <p role="alert" className="text-sm text-[#B3261E]">{cancelErr}</p>}
          <Button type="submit" loading={cancelSaving}>Publish new version</Button>
        </form>
      </SectionCard>
    </>
  );
}