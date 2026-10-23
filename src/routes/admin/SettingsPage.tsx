import { useEffect, useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { getContact, getSettings } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import { getPropertyId } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';

export function AdminSettingsPage() {
  const contact = useAsync(getContact, []);
  const settings = useAsync(getSettings, []);

  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [region, setRegion] = useState('');
  const [postal, setPostal] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [contactState, setContactState] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [contactErr, setContactErr] = useState<string | null>(null);

  const [buffer, setBuffer] = useState(30);
  const [horizon, setHorizon] = useState(30);
  const [maxStay, setMaxStay] = useState(30);
  const [minHourly, setMinHourly] = useState(120);
  const [grace, setGrace] = useState(15);
  const [deposits, setDeposits] = useState(false);
  const [enquiries, setEnquiries] = useState(true);
  const [settingsState, setSettingsState] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [settingsErr, setSettingsErr] = useState<string | null>(null);

  useEffect(() => {
    if (contact.status === 'success' && contact.data) {
      setAddress(contact.data.address_line ?? '');
      setLocality(contact.data.locality ?? '');
      setRegion(contact.data.region ?? '');
      setPostal(contact.data.postal_code ?? '');
      setPhone(contact.data.phone ?? '');
      setEmail(contact.data.email ?? '');
      setMapUrl(contact.data.map_url ?? '');
    }
  }, [contact.status, contact.status === 'success' ? contact.data?.property_id : null]);

  useEffect(() => {
    if (settings.status === 'success' && settings.data) {
      setBuffer(settings.data.cleaning_buffer_minutes);
      setHorizon(settings.data.booking_horizon_days);
      setMaxStay(settings.data.max_stay_days);
      setMinHourly(settings.data.min_hourly_minutes);
      setGrace(settings.data.overstay_grace_minutes);
      setDeposits(settings.data.deposits_enabled);
      setEnquiries(settings.data.enquiries_enabled);
    }
  }, [settings.status, settings.status === 'success' ? settings.data?.property_id : null]);

  if (contact.status === 'loading' || settings.status === 'loading') return <Spinner />;
  if (contact.status === 'error') return <ErrorState message={contact.error.message} />;
  if (settings.status === 'error') return <ErrorState message={settings.error.message} />;

  async function saveContact(e: React.FormEvent) {
    e.preventDefault(); setContactState('saving'); setContactErr(null);
    try {
      const id = await getPropertyId();
      const { error } = await supabase.from('property_contact').update({ address_line: address || null, locality: locality || null, region: region || null, postal_code: postal || null, phone: phone || null, email: email || null, map_url: mapUrl || null }).eq('property_id', id);
      if (error) throw error;
      setContactState('saved');
    } catch (e) { setContactErr(e instanceof Error ? e.message : 'Save failed'); setContactState('error'); }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault(); setSettingsState('saving'); setSettingsErr(null);
    try {
      const id = await getPropertyId();
      const { error } = await supabase.from('property_settings').update({ cleaning_buffer_minutes: buffer, booking_horizon_days: horizon, max_stay_days: maxStay, min_hourly_minutes: minHourly, overstay_grace_minutes: grace, deposits_enabled: deposits, enquiries_enabled: enquiries }).eq('property_id', id);
      if (error) throw error;
      setSettingsState('saved');
    } catch (e) { setSettingsErr(e instanceof Error ? e.message : 'Save failed'); setSettingsState('error'); }
  }

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" />

      <div className="space-y-6">
        <SectionCard title="Property contact" subtitle="Leave fields blank to keep the “Contact details are being finalised” placeholder on the public site">
          <form onSubmit={saveContact} className="space-y-3">
            <Field label="Address line" htmlFor="s-addr"><input id="s-addr" className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Locality" htmlFor="s-loc"><input id="s-loc" className={inputClass} value={locality} onChange={(e) => setLocality(e.target.value)} /></Field>
              <Field label="Region / State" htmlFor="s-reg"><input id="s-reg" className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)} /></Field>
              <Field label="Postal code" htmlFor="s-post"><input id="s-post" className={inputClass} value={postal} onChange={(e) => setPostal(e.target.value)} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone" htmlFor="s-phone"><input id="s-phone" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
              <Field label="Email" htmlFor="s-email"><input id="s-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            </div>
            <Field label="Map URL" htmlFor="s-map"><input id="s-map" className={inputClass} value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} /></Field>
            <Button type="submit" loading={contactState === 'saving'}>{contactState === 'saved' ? 'Saved' : 'Save contact'}</Button>
            {contactErr && <p role="alert" className="text-sm text-[#B3261E]">{contactErr}</p>}
          </form>
        </SectionCard>

        <SectionCard title="Property rules" subtitle="Applied to every booking">
          <form onSubmit={saveSettings} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Cleaning buffer (min)" htmlFor="s-buf"><input id="s-buf" type="number" className={inputClass} value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} /></Field>
              <Field label="Booking horizon (days)" htmlFor="s-hor"><input id="s-hor" type="number" className={inputClass} value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} /></Field>
              <Field label="Max continuous stay (days)" htmlFor="s-max"><input id="s-max" type="number" className={inputClass} value={maxStay} onChange={(e) => setMaxStay(Number(e.target.value))} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Minimum hourly booking (min)" htmlFor="s-min"><input id="s-min" type="number" className={inputClass} value={minHourly} onChange={(e) => setMinHourly(Number(e.target.value))} /></Field>
              <Field label="Overstay grace period (min)" htmlFor="s-grace"><input id="s-grace" type="number" className={inputClass} value={grace} onChange={(e) => setGrace(Number(e.target.value))} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={deposits} onChange={(e) => setDeposits(e.target.checked)} />
              Refundable deposits are enabled
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={enquiries} onChange={(e) => setEnquiries(e.target.checked)} />
              Accept online enquiries
            </label>
            <Button type="submit" loading={settingsState === 'saving'}>{settingsState === 'saved' ? 'Saved' : 'Save settings'}</Button>
            {settingsErr && <p role="alert" className="text-sm text-[#B3261E]">{settingsErr}</p>}
          </form>
        </SectionCard>
      </div>
    </>
  );
}