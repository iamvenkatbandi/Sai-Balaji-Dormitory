import { useEffect, useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { getMyProfile, updateMyProfile } from '../../lib/portal';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime } from '../../lib/format';

export function ProfilePage() {
  const profile = useAsync(getMyProfile, []);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emgName, setEmgName] = useState('');
  const [emgPhone, setEmgPhone] = useState('');
  const [marketing, setMarketing] = useState(false);
  const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile.status === 'success' && profile.data) {
      setFullName(profile.data.full_name ?? '');
      setPhone(profile.data.phone ?? '');
      setEmgName(profile.data.emergency_contact_name ?? '');
      setEmgPhone(profile.data.emergency_contact_phone ?? '');
      setMarketing(profile.data.marketing_opt_in);
    }
  }, [profile.status, profile.status === 'success' ? profile.data?.id : null]);

  if (profile.status === 'loading') return <Spinner />;
  if (profile.status === 'error') return <ErrorState message={profile.error.message} />;
  if (!profile.data) return <ErrorState message="Profile not found." />;

  const p = profile.data;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveState('saving');
    setSaveError(null);
    try {
      await updateMyProfile({
        full_name: fullName || null,
        phone: phone || null,
        emergency_contact_name: emgName || null,
        emergency_contact_phone: emgPhone || null,
        marketing_opt_in: marketing,
      });
      setSaveState('saved');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save');
      setSaveState('error');
    }
  }

  return (
    <>
      <PageHeader eyebrow="Portal" title="Profile" />

      <div className="space-y-6">
        <SectionCard title="Account">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Email</dt><dd className="text-ink">{p.email ?? '—'}</dd></div>
            <div>
              <dt className="text-muted">Email verification</dt>
              <dd className="text-ink">
                {p.email_confirmed_at
                  ? `Verified ${formatDateTime(p.email_confirmed_at)}`
                  : 'Not verified'}
              </dd>
            </div>
            <div><dt className="text-muted">Member since</dt><dd className="text-ink">{formatDateTime(p.created_at)}</dd></div>
          </dl>
        </SectionCard>

        <SectionCard title="Personal details">
          <form onSubmit={onSave} className="space-y-4">
            <Field label="Full name" htmlFor="p-name">
              <input id="p-name" className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Phone" htmlFor="p-phone">
              <input id="p-phone" type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Emergency contact name" htmlFor="p-emg-name">
                <input id="p-emg-name" className={inputClass} value={emgName} onChange={(e) => setEmgName(e.target.value)} />
              </Field>
              <Field label="Emergency contact phone" htmlFor="p-emg-phone">
                <input id="p-emg-phone" type="tel" className={inputClass} value={emgPhone} onChange={(e) => setEmgPhone(e.target.value)} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              I would like to receive occasional updates from Sai Balaji Dormitory.
            </label>
            <Button type="submit" loading={saveState === 'saving'}>
              {saveState === 'saved' ? 'Saved' : 'Save changes'}
            </Button>
            {saveError && <p role="alert" className="text-sm text-[#B3261E]">{saveError}</p>}
          </form>
        </SectionCard>
      </div>
    </>
  );
}