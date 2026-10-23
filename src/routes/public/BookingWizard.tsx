import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getSettings, getPublishedRatePlans, getActiveFamilyPolicy, lookupBooking, getPublicBedMap, type PublicBed } from '../../lib/queries';
import { getQuote, createHold, devConfirmBooking, type QuoteResponse, type HoldSuccess } from '../../lib/booking';
import {
  loadRazorpay, isRazorpayConfigured, isDevManualConfirmAllowed,
  createRazorpayOrder, verifyRazorpayPayment,
} from '../../lib/razorpay';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { NotConfiguredNotice } from '../../components/NotConfiguredNotice';
import { ErrorState } from '../../components/ErrorState';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { PriceBreakdown } from '../../components/PriceBreakdown';
import { PublicBedSelector } from '../../components/PublicBedSelector';
import { formatDateTime } from '../../lib/format';
import type { BookingStatusRow, GuestGender, ProductType } from '../../lib/database.types';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type ConfirmState = 'idle' | 'preparing' | 'polling' | 'confirmed' | 'not-confirmed' | 'error';

const PRODUCT_LABEL: Record<ProductType, string> = {
  ac_individual: 'AC individual bed',
  ac_family_compartment: 'AC family compartment',
  non_ac_space: 'Non-AC sleeping space',
};

const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export function BookingWizard() {
  const [params] = useSearchParams();
  const urlProduct = (params.get('product') as ProductType | null) ?? 'ac_individual';
  const urlFrom = params.get('from');
  const urlTo = params.get('to');

  const plans = useAsync(getPublishedRatePlans, []);
  const family = useAsync(getActiveFamilyPolicy, []);
  const settings = useAsync(getSettings, []);

  const [step, setStep] = useState<Step>(urlFrom && urlTo ? 4 : 2);
  const [product, setProduct] = useState<ProductType>(urlProduct);

  const initialDate = urlFrom ? new Date(urlFrom) : null;
  const initialHour = initialDate ? (initialDate.getHours() % 12 || 12) : 10;
  const initialMinute = initialDate ? initialDate.getMinutes() : 0;
  const initialPeriod = initialDate ? (initialDate.getHours() >= 12 ? 'PM' : 'AM') : 'AM';

  const [startDate, setStartDate] = useState(initialDate ? initialDate.toISOString().slice(0, 10) : '');
  const [startHour, setStartHour] = useState(initialHour.toString().padStart(2, '0'));
  const [startMinute, setStartMinute] = useState(initialMinute.toString().padStart(2, '0'));
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>(initialPeriod as 'AM' | 'PM');
  const [hours, setHours] = useState(1);

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState('');
  const [guestGender, setGuestGender] = useState<GuestGender>('undisclosed');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Bed Selection State
  const [bedMap, setBedMap] = useState<PublicBed[] | null>(null);
  const [bedMapError, setBedMapError] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  const [hold, setHold] = useState<HoldSuccess | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [holdLoading, setHoldLoading] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmedRow, setConfirmedRow] = useState<BookingStatusRow | null>(null);

  const startsAt = useMemo(() => {
    if (!startDate) return '';
    let h = parseInt(startHour, 10);
    if (startPeriod === 'PM' && h !== 12) h += 12;
    if (startPeriod === 'AM' && h === 12) h = 0;
    return new Date(`${startDate}T${h.toString().padStart(2, '0')}:${startMinute}:00`).toISOString();
  }, [startDate, startHour, startMinute, startPeriod]);

  const endsAt = useMemo(
    () => (startsAt ? new Date(new Date(startsAt).getTime() + hours * 3600 * 1000).toISOString() : ''),
    [startsAt, hours],
  );

  const familyPublished = family.status === 'success' && !!family.data;
  const blockedByFamily = product === 'ac_family_compartment' && !familyPublished;
  const minHours = product === 'ac_family_compartment' ? 12 : Math.max(1, Math.ceil((settings.status === 'success' && settings.data?.min_hourly_minutes ? settings.data.min_hourly_minutes : 60) / 60));

  // Fetch Quote (Step 4)
  useEffect(() => {
    if (step !== 4 || !startsAt || !endsAt) return;
    setQuoteError(null); setQuote(null);
    getQuote(product, startsAt, endsAt)
      .then((q) => setQuote(q))
      .catch((err: Error) => setQuoteError(err.message));
  }, [step, product, startsAt, endsAt]);

  // Fetch Bed Map (Step 5)
  useEffect(() => {
    if (step !== 5 || !startsAt || !endsAt) return;
    setBedMap(null); setBedMapError(null);
    
    const section = product === 'non_ac_space' ? 'NON_AC' : 'AC';
    
    getPublicBedMap(section, startsAt, endsAt)
      .then((beds) => setBedMap(beds))
      .catch((err: Error) => setBedMapError(err.message));
  }, [step, product, startsAt, endsAt]);

  async function handleCreateHold() {
    setHoldLoading(true); setHoldError(null);
    try {
      const res = await createHold({
        product, startsAt, endsAt,
        guestName, guestGender,
        contactEmail,
        contactPhone,
      });
      if (!res.ok) { setHoldError(res.detail ? `${res.error}: ${res.detail}` : res.error); return; }
      setHold(res);
      setStep(8); // Proceed to payment
    } catch (err) {
      setHoldError(err instanceof Error ? err.message : 'Hold creation failed.');
    } finally {
      setHoldLoading(false);
    }
  }

  async function pollForConfirmation(reference: string, contact: string, attempts = 15) {
    setConfirmState('polling'); setConfirmError(null);
    for (let i = 0; i < attempts; i++) {
      try {
        const row = await lookupBooking(reference, contact);
        if (row && row.status === 'confirmed') {
          setConfirmedRow(row); setConfirmState('confirmed'); setStep(9); return;
        }
      } catch { /* ignore */ }
      await new Promise((r) => setTimeout(r, 2000));
    }
    setConfirmState('not-confirmed'); setStep(9);
  }

  async function handleDevConfirm() {
    if (!hold) return;
    setConfirmedRow({ reference: hold.reference, status: 'confirmed', starts_at: startsAt, ends_at: endsAt, product_type: product, total_paise: hold.total_paise });
    setConfirmState('confirmed'); setStep(9);
    try { await devConfirmBooking(hold.booking_id); } catch (err) { setConfirmError('Confirmation failed.'); setConfirmState('error'); }
  }

  async function handleRazorpay() {
    if (!hold) return;
    if (!isRazorpayConfigured()) { setConfirmError('Razorpay is not configured.'); setConfirmState('error'); return; }
    setConfirmError(null); setConfirmState('preparing');

    try {
      const order = await createRazorpayOrder(hold.booking_id);
      await loadRazorpay();
      const rzp = new window.Razorpay!({
        key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
        name: 'Sai Balaji Dormitory', description: `Booking ${hold.reference}`,
        prefill: { name: guestName, email: contactEmail, contact: contactPhone },
        handler: async (response) => {
          setConfirmedRow({ reference: hold.reference, status: 'confirmed', starts_at: startsAt, ends_at: endsAt, product_type: product, total_paise: hold.total_paise });
          setConfirmState('confirmed'); setStep(9);
          try { await verifyRazorpayPayment(hold.booking_id, response); } catch (err) { setConfirmError('Verification failed.'); setConfirmState('error'); }
        },
        modal: { ondismiss: () => setConfirmState('idle') },
        theme: { color: '#173B35' },
      });
      rzp.open();
      setConfirmState('idle');
    } catch (err) { setConfirmError('Could not open Checkout.'); setConfirmState('error'); }
  }

  if (plans.status === 'loading' || family.status === 'loading' || settings.status === 'loading') return <Spinner />;
  if (plans.status === 'error') return <ErrorState message={plans.error.message} />;
  if (family.status === 'error') return <ErrorState message={family.error.message} />;
  if (settings.status === 'error') return <ErrorState message={settings.error.message} />;

  const plan = plans.data.find((p) => p.plan.product_type === product);

  if (blockedByFamily) return <div className="p-8"><NotConfiguredNotice title="Family compartment reservations are not yet available." body="Please check back later." /></div>;
  if (!plan?.published) return <div className="p-8"><NotConfiguredNotice title="Rates not yet published." body="Online booking is disabled." /></div>;

  return (
    <>
      <PageHeader eyebrow="Booking" title={`Book a ${PRODUCT_LABEL[product].toLowerCase()}`} intro={`Step ${step} of 9 — ${stepLabel(step)}`} />
      <StepBar step={step} />

      <div className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {step === 1 && (
            <SectionCard title="Choose accommodation">
              <div className="space-y-3">
                {(['ac_individual','ac_family_compartment','non_ac_space'] as ProductType[]).map((p) => (
                  <label key={p} className="flex cursor-pointer items-start gap-3 rounded-input border border-line bg-surface p-4 hover:bg-bg">
                    <input type="radio" name="product" checked={product === p} onChange={() => setProduct(p)} className="mt-1" />
                    <div><p className="text-sm font-medium text-ink">{PRODUCT_LABEL[p]}</p></div>
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-end"><Button onClick={() => setStep(2)}>Continue</Button></div>
            </SectionCard>
          )}

          {step === 2 && (
            <SectionCard title="Select check-in time">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Check-in date" htmlFor="wiz-date" required>
                  <input id="wiz-date" type="date" className={`${inputClass} cursor-pointer`} value={startDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setStartDate(e.target.value)} onClick={(e) => { try { (e.target as HTMLInputElement).showPicker?.(); } catch {} }} required />
                </Field>
                <Field label="Check-in time" required>
                  <div className="flex gap-1.5">
                    <select className={`${inputClass} flex-1 px-2 cursor-pointer`} value={startHour} onChange={(e) => setStartHour(e.target.value)}>{HOURS.map((h) => <option key={h} value={h}>{h}</option>)}</select>
                    <select className={`${inputClass} flex-1 px-2 cursor-pointer`} value={startMinute} onChange={(e) => setStartMinute(e.target.value)}>{MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}</select>
                    <select className={`${inputClass} flex-1 px-2 cursor-pointer`} value={startPeriod} onChange={(e) => setStartPeriod(e.target.value as 'AM' | 'PM')}><option value="AM">AM</option><option value="PM">PM</option></select>
                  </div>
                </Field>
                <Field label="Duration (hours)" htmlFor="wiz-hours" hint={`Minimum ${minHours} hour(s)`} required>
                  <input id="wiz-hours" type="number" min={minHours} step={1} className={inputClass} value={hours} onChange={(e) => setHours(Math.max(minHours, Number(e.target.value)))} />
                </Field>
              </div>
              <div className="mt-6 flex justify-between"><Button variant="secondary" onClick={() => setStep(1)}>Back</Button><Button onClick={() => setStep(3)} disabled={!startDate || hours < minHours}>Continue</Button></div>
            </SectionCard>
          )}

          {step === 3 && (
            <SectionCard title="Guest details">
              <div className="space-y-4">
                <Field label="Primary guest name" htmlFor="wiz-name" required><input id="wiz-name" className={inputClass} value={guestName} onChange={(e) => setGuestName(e.target.value)} /></Field>
                <Field label="Declared gender" htmlFor="wiz-gender" required hint="Required for allocation policy (women-reserved spaces, bunk co-occupancy).">
                  <select id="wiz-gender" className={inputClass} value={guestGender} onChange={(e) => setGuestGender(e.target.value as GuestGender)}>
                    <option value="undisclosed">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Contact email" htmlFor="wiz-email" required><input id="wiz-email" type="email" className={inputClass} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></Field>
                
                {/* PHONE NUMBER FIX: Only numbers allowed */}
                <Field label="Contact phone" htmlFor="wiz-phone" required>
                  <input 
                    id="wiz-phone" 
                    type="tel" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={inputClass} 
                    value={contactPhone} 
                    onChange={(e) => setContactPhone(e.target.value.replace(/[^0-9]/g, ''))} 
                  />
                </Field>
              </div>
              <div className="mt-6 flex justify-between"><Button variant="secondary" onClick={() => setStep(2)}>Back</Button><Button onClick={() => setStep(4)} disabled={!guestName.trim() || !contactEmail.trim() || !contactPhone.trim()}>Continue</Button></div>
            </SectionCard>
          )}

          {step === 4 && (
            <SectionCard title="Availability and price">
              {quoteError && <div className="mb-4"><ErrorState message={quoteError} onRetry={() => setStep(2)} /></div>}
              {!quoteError && !quote && <Spinner label="Calculating price…" />}
              {quote && (
                <>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-muted">Check-in</dt><dd className="text-ink">{formatDateTime(startsAt)}</dd></div>
                    <div><dt className="text-muted">Checkout</dt><dd className="text-ink">{formatDateTime(endsAt)}</dd></div>
                    <div><dt className="text-muted">Accommodation</dt><dd className="text-ink">{PRODUCT_LABEL[product]}</dd></div>
                    <div><dt className="text-muted">Minimum booking</dt><dd className="text-ink">{quote.min_booking_minutes ?? '—'} minutes</dd></div>
                  </dl>
                  <div className="mt-6 flex justify-between"><Button variant="secondary" onClick={() => setStep(2)}>Back</Button><Button onClick={() => setStep(5)}>Select your bed</Button></div>
                </>
              )}
            </SectionCard>
          )}

          {/* STEP 5: SELECT BED */}
          {step === 5 && (
            <SectionCard title="Select your bed" subtitle="Click an available bed below. (Note: Your bed is not locked until payment succeeds).">
              {bedMapError && <ErrorState message={bedMapError} onRetry={() => setStep(4)} />}
              {!bedMap && !bedMapError && <Spinner label="Loading floor plan..." />}
              {bedMap && (
                <>
                  <PublicBedSelector 
                    beds={bedMap} 
                    selectedBedId={selectedSpaceId} 
                    onSelect={(id) => setSelectedSpaceId(id)}
                    gender={guestGender}
                  />
                  <div className="mt-6 flex justify-between">
                    <Button variant="secondary" onClick={() => setStep(4)}>Back</Button>
                    <Button onClick={() => setStep(6)} disabled={!selectedSpaceId && product !== 'ac_family_compartment'}>
                      Review & Pay
                    </Button>
                  </div>
                </>
              )}
            </SectionCard>
          )}

          {step === 6 && (
            <SectionCard title="Review and Payment">
              <p className="text-sm text-muted">
                Your preferred bed is highlighted below. It will be secured the moment payment succeeds.
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">Guest</dt><dd className="text-ink">{guestName}</dd></div>
                <div><dt className="text-muted">Email</dt><dd className="text-ink">{contactEmail}</dd></div>
                <div><dt className="text-muted">Phone</dt><dd className="text-ink">{contactPhone}</dd></div>
                <div><dt className="text-muted">Check-in</dt><dd className="text-ink">{formatDateTime(startsAt)}</dd></div>
                <div><dt className="text-muted">Checkout</dt><dd className="text-ink">{formatDateTime(endsAt)}</dd></div>
                {selectedSpaceId && (
                  <div><dt className="text-muted">Selected Bed</dt><dd className="font-mono font-bold text-brand-900">{bedMap?.find(b => b.space_id === selectedSpaceId)?.code}</dd></div>
                )}
              </dl>
              {holdError && <div className="mt-4"><ErrorState message={holdError} /></div>}
              <div className="mt-6 flex justify-between">
                <Button variant="secondary" onClick={() => setStep(5)} disabled={holdLoading}>Back</Button>
                <Button onClick={handleCreateHold} loading={holdLoading}>Proceed to Payment</Button>
              </div>
            </SectionCard>
          )}

          {step === 7 && hold && (
            <SectionCard title="Payment">
              <p className="text-sm text-muted">
                Reference <span className="font-mono text-ink">{hold.reference}</span> — total <span className="font-semibold text-ink">{formatINR(hold.total_paise)}</span>.
              </p>
              <div className="mt-2 rounded-input border border-[#FBF0DC] bg-[#FBF0DC] p-3 text-xs text-[#8A5A00]">
                Note: Your bed is not reserved yet. It will be assigned instantly upon successful payment.
              </div>
              {confirmError && <div className="mt-4"><ErrorState message={confirmError} /></div>}
              <div className="mt-6 flex flex-wrap gap-3">
                {isRazorpayConfigured() ? (
                  <Button onClick={handleRazorpay} loading={confirmState === 'preparing'} disabled={confirmState === 'preparing' || confirmState === 'polling'}>
                    {confirmState === 'preparing' ? 'Preparing payment…' : 'Pay with Razorpay'}
                  </Button>
                ) : (
                  <p className="rounded-input border border-dashed border-line bg-bg px-4 py-3 text-sm text-muted">
                    Razorpay is not configured. Set <code className="font-mono">VITE_RAZORPAY_KEY_ID</code> to enable payment.
                  </p>
                )}
                {isDevManualConfirmAllowed() && <Button variant="secondary" onClick={handleDevConfirm}>Development: confirm without payment</Button>}
              </div>
              <p className="mt-6 text-xs text-muted">Checkout session expires at {formatDateTime(hold.expires_at)}.</p>
            </SectionCard>
          )}

          {step === 8 && (
             <SectionCard title="Processing Payment">
               <Spinner label="Finalizing your booking..." />
               {confirmError && <ErrorState message={confirmError} />}
             </SectionCard>
          )}

          {step === 9 && (
            <SectionCard title="Confirmation">
              {confirmState === 'polling' && <Spinner label="Waiting for payment confirmation…" />}
              {confirmState === 'confirmed' && confirmedRow && (
                <>
                  <p className="text-sm text-ink">Booking <span className="font-mono">{confirmedRow.reference}</span> is confirmed.</p>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-muted">Status</dt><dd className="text-ink font-medium text-brand-900">Confirmed & Reserved</dd></div>
                    <div><dt className="text-muted">Check-in</dt><dd className="text-ink">{formatDateTime(confirmedRow.starts_at)}</dd></div>
                    <div><dt className="text-muted">Checkout</dt><dd className="text-ink">{formatDateTime(confirmedRow.ends_at)}</dd></div>
                  </dl>
                  <p className="mt-4 text-xs text-muted">
                    Your selected bed has been secured. Please bring government-issued photo ID at check-in.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {hold && <Link to={`/booking/receipt/${hold.booking_id}`} className="inline-flex items-center justify-center rounded-input bg-brand-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Download Receipt</Link>}
                    <Link to={`/booking/status?ref=${encodeURIComponent(confirmedRow.reference)}`} className="inline-flex items-center justify-center rounded-input border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:bg-bg">Check booking status</Link>
                  </div>
                </>
              )}
              {confirmState === 'not-confirmed' && (
                <>
                  <p className="text-sm text-ink">We haven't received payment confirmation yet.</p>
                  <p className="mt-2 text-sm text-muted">If you completed payment, wait a moment then check via Booking Status.</p>
                  <div className="mt-6"><Link to={`/booking/status?ref=${encodeURIComponent(hold?.reference || '')}`} className="inline-flex items-center justify-center rounded-input border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:bg-bg">Check booking status</Link></div>
                </>
              )}
              {confirmState === 'error' && confirmError && <div className="mt-4"><ErrorState message={confirmError} /></div>}
            </SectionCard>
          )}
        </div>

        {quote && step >= 4 && step < 9 && (
          <div><PriceBreakdown items={quote.line_items.map((li) => ({ label: li.label, detail: li.detail, amountPaise: li.amountPaise }))} total={quote.total_paise} /></div>
        )}
      </div>
    </>
  );
}

function stepLabel(step: Step): string {
  return {
    1: 'Section', 2: 'Time', 3: 'Details', 4: 'Price', 5: 'Select Bed',
    6: 'Review', 7: 'Payment', 8: 'Processing', 9: 'Done',
  }[step];
}

function StepBar({ step }: { step: Step }) {
  const labels = ['Section','Time','Details','Price','Bed','Review','Payment','Wait','Done'];
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Booking progress">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const state = n < step ? 'done' : n === step ? 'current' : 'todo';
        return (
          <li key={label} className={`rounded-full border px-3 py-1 text-xs ${state === 'current' ? 'border-brand-900 bg-brand-900 text-white' : state === 'done' ? 'border-brand-100 bg-brand-100 text-brand-900' : 'border-line bg-surface text-muted'}`}>
            {i + 1}. {label}
          </li>
        );
      })}
    </ol>
  );
}

function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100);
}