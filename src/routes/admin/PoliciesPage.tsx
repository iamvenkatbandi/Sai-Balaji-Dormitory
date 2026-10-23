import { useEffect, useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import {
  getCurrentFamilyPolicy, publishFamilyPolicy, unpublishFamilyPolicy,
  publishCancellationPolicy,
} from '../../lib/admin';
import { getActiveCancellationPolicy } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime } from '../../lib/format';

type Tab = 'legal' | 'family' | 'cancellation';

export function AdminPoliciesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('legal');

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Policies & Legal" />
      
      <div className="mb-6 flex gap-4 border-b border-line">
        <button onClick={() => setActiveTab('legal')} className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'legal' ? 'border-b-2 border-brand-900 text-brand-900' : 'text-muted hover:text-ink'}`}>Legal Pages</button>
        <button onClick={() => setActiveTab('family')} className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'family' ? 'border-b-2 border-brand-900 text-brand-900' : 'text-muted hover:text-ink'}`}>Family Eligibility</button>
        <button onClick={() => setActiveTab('cancellation')} className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'cancellation' ? 'border-b-2 border-brand-900 text-brand-900' : 'text-muted hover:text-ink'}`}>Cancellation Policy</button>
      </div>

      {activeTab === 'legal' && <LegalEditor />}
      {activeTab === 'family' && <FamilyEditor />}
      {activeTab === 'cancellation' && <CancellationEditor />}
    </>
  );
}

// ─── 1. Legal Pages Editor ─────────────────────────────────────────
function LegalEditor() {
  const [doc, setDoc] = useState<'privacy' | 'terms' | 'guest-rules'>('privacy');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase.from('legal_policies').select('content').eq('slug', doc).maybeSingle()
      .then(({ data }) => {
        setContent(data?.content || '');
        setLoading(false);
      });
  }, [doc]);

  async function save() {
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from('legal_policies').update({ content, updated_at: new Date().toISOString() }).eq('slug', doc);
      if (error) throw error;
      alert('Policy saved successfully.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Legal Document Editor" subtitle="Edit the content shown on the public website.">
      <div className="mb-4 flex gap-2">
        <button onClick={() => setDoc('privacy')} className={`px-3 py-1.5 text-sm rounded border ${doc === 'privacy' ? 'bg-brand-900 text-white border-brand-900' : 'bg-surface text-ink border-line hover:bg-bg'}`}>Privacy Policy</button>
        <button onClick={() => setDoc('terms')} className={`px-3 py-1.5 text-sm rounded border ${doc === 'terms' ? 'bg-brand-900 text-white border-brand-900' : 'bg-surface text-ink border-line hover:bg-bg'}`}>Terms & Conditions</button>
        <button onClick={() => setDoc('guest-rules')} className={`px-3 py-1.5 text-sm rounded border ${doc === 'guest-rules' ? 'bg-brand-900 text-white border-brand-900' : 'bg-surface text-ink border-line hover:bg-bg'}`}>Guest Rules</button>
      </div>

      {loading ? <Spinner /> : (
        <div className="space-y-4">
          <Field label="Content" htmlFor="legal-content">
            <textarea 
              id="legal-content" 
              rows={15} 
              className={`${inputClass} font-mono text-sm`} 
              value={content} 
              onChange={e => setContent(e.target.value)} 
            />
          </Field>
          {err && <p className="text-sm text-[#B3261E]">{err}</p>}
          <Button onClick={save} loading={saving}>Save & Publish</Button>
        </div>
      )}
    </SectionCard>
  );
}

// ─── 2. Family Eligibility Editor (Existing) ───────────────────────
function FamilyEditor() {
  const family = useAsync(getCurrentFamilyPolicy, []);
  const [eligibility, setEligibility] = useState('');
  const [relationships, setRelationships] = useState('');
  const [verification, setVerification] = useState('');
  const [evidence, setEvidence] = useState('');
  const [checkinReview, setCheckinReview] = useState('');
  const [escalation, setEscalation] = useState('');
  const [legalReviewed, setLegalReviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
  }, [family.status]);

  if (family.status === 'loading') return <Spinner />;
  if (family.status === 'error') return <ErrorState message={family.error.message} />;

  const isPublished = !!family.data?.is_published;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      await publishFamilyPolicy({ eligibility, relationships, verification, evidence, checkinReview, escalation, legalReviewed });
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Publish failed');
    } finally { setSaving(false); }
  }

  async function unpublish() {
    if (!confirm('Unpublish the family policy? Family compartment bookings will close.')) return;
    try { await unpublishFamilyPolicy(); window.location.reload(); } catch (e) { alert('Failed'); }
  }

  return (
    <SectionCard title="Family Eligibility Policy" subtitle={isPublished ? 'Currently published live.' : 'Not published — compartments are closed.'}>
      {isPublished && (
        <div className="mb-4 rounded-input border border-[#E6F4ED] bg-[#E6F4ED] p-3 text-sm text-[#2E7D5B]">
          This policy is live. Publishing a new version closes this one.
          <button onClick={unpublish} className="ml-3 underline">Unpublish</button>
        </div>
      )}
      <form onSubmit={submit} className="space-y-3">
        <Field label="Eligibility criteria" htmlFor="fp-elig" required><textarea id="fp-elig" rows={2} className={inputClass} value={eligibility} onChange={e => setEligibility(e.target.value)} required /></Field>
        <Field label="Qualifying relationships" htmlFor="fp-rel" required><textarea id="fp-rel" rows={2} className={inputClass} value={relationships} onChange={e => setRelationships(e.target.value)} required /></Field>
        <Field label="Verification process" htmlFor="fp-ver" required><textarea id="fp-ver" rows={2} className={inputClass} value={verification} onChange={e => setVerification(e.target.value)} required /></Field>
        <Field label="Accepted evidence" htmlFor="fp-ev" required><textarea id="fp-ev" rows={2} className={inputClass} value={evidence} onChange={e => setEvidence(e.target.value)} required /></Field>
        <Field label="Check-in review process" htmlFor="fp-ci" required><textarea id="fp-ci" rows={2} className={inputClass} value={checkinReview} onChange={e => setCheckinReview(e.target.value)} required /></Field>
        <Field label="Escalation process" htmlFor="fp-esc" required><textarea id="fp-esc" rows={2} className={inputClass} value={escalation} onChange={e => setEscalation(e.target.value)} required /></Field>
        
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" className="mt-1" checked={legalReviewed} onChange={e => setLegalReviewed(e.target.checked)} />
          I confirm that the property has completed appropriate legal and operational review of this policy.
        </label>
        
        {err && <p className="text-sm text-[#B3261E]">{err}</p>}
        <Button type="submit" loading={saving}>{isPublished ? 'Publish new version' : 'Publish policy'}</Button>
      </form>
    </SectionCard>
  );
}

// ─── 3. Cancellation Policy Editor (Existing) ─────────────────────
function CancellationEditor() {
  const cancellation = useAsync(getActiveCancellationPolicy, []);
  const [freeCancel, setFreeCancel] = useState(1440);
  const [outsidePct, setOutsidePct] = useState(100);
  const [insidePct, setInsidePct] = useState(0);
  const [propertyPct, setPropertyPct] = useState(100);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (cancellation.status === 'success' && cancellation.data) {
      setFreeCancel(cancellation.data.free_cancel_before_minutes);
      setOutsidePct(cancellation.data.refund_percent_outside_window);
      setInsidePct(cancellation.data.refund_percent_inside_window);
      setPropertyPct(cancellation.data.refund_percent_property_cancelled);
    }
  }, [cancellation.status]);

  if (cancellation.status === 'loading') return <Spinner />;
  if (cancellation.status === 'error') return <ErrorState message={cancellation.error.message} />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      await publishCancellationPolicy({ freeCancelMinutes: freeCancel, outsidePct, insidePct, propertyPct });
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Publish failed');
    } finally { setSaving(false); }
  }

  return (
    <SectionCard title="Cancellation Policy">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Free window (min)" htmlFor="cp-free"><input id="cp-free" type="number" className={inputClass} value={freeCancel} onChange={e => setFreeCancel(Number(e.target.value))} /></Field>
          <Field label="Outside %" htmlFor="cp-out"><input id="cp-out" type="number" min={0} max={100} className={inputClass} value={outsidePct} onChange={e => setOutsidePct(Number(e.target.value))} /></Field>
          <Field label="Inside %" htmlFor="cp-in"><input id="cp-in" type="number" min={0} max={100} className={inputClass} value={insidePct} onChange={e => setInsidePct(Number(e.target.value))} /></Field>
          <Field label="Property-cancel %" htmlFor="cp-prop"><input id="cp-prop" type="number" min={0} max={100} className={inputClass} value={propertyPct} onChange={e => setPropertyPct(Number(e.target.value))} /></Field>
        </div>
        {err && <p className="text-sm text-[#B3261E]">{err}</p>}
        <Button type="submit" loading={saving}>Publish new version</Button>
      </form>
    </SectionCard>
  );
}