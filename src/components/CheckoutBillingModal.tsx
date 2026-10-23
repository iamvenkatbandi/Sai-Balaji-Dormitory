import { useState, useEffect } from 'react';
import { calculateCheckout, addBookingCharge, processCheckout, type CheckoutCalculation } from '../lib/admin';
import { Button } from './Button';
import { Field, inputClass } from './Field';
import { Spinner } from './Spinner';
import { formatCurrencyINR } from '../lib/format';

export function CheckoutBillingModal({ bookingId, onClose, onSuccess }: { bookingId: string, onClose: () => void, onSuccess: () => void }) {
  const [calc, setCalc] = useState<CheckoutCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Manual Charge State
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmt, setChargeAmt] = useState('');
  const [addingCharge, setAddingCharge] = useState(false);

  // Actual Checkout Time
  const [checkoutTime, setCheckoutTime] = useState(new Date().toISOString().slice(0, 16));

  async function loadCalculation() {
    setLoading(true);
    try {
      const res = await calculateCheckout(bookingId, new Date(checkoutTime).toISOString());
      setCalc(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to calculate');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCalculation(); }, [checkoutTime, bookingId]);

  async function handleAddCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!chargeDesc || !chargeAmt) return;
    setAddingCharge(true);
    try {
      await addBookingCharge(bookingId, chargeDesc, Math.round(Number(chargeAmt) * 100));
      setChargeDesc('');
      setChargeAmt('');
      await loadCalculation();
    } catch (e) {
      alert('Failed to add charge');
    } finally {
      setAddingCharge(false);
    }
  }

  async function handleFinalCheckout() {
    setLoading(true);
    try {
      await processCheckout(bookingId, new Date(checkoutTime).toISOString());
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-card bg-surface shadow-overlay" onClick={e => e.stopPropagation()}>
        <div className="border-b border-line px-5 py-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-ink">Guest Checkout & Billing</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && <div className="p-3 bg-[#FBEAE8] text-[#B3261E] text-sm rounded">{error}</div>}
          
          <Field label="Actual Checkout Time" htmlFor="checkout-time">
            <input 
              id="checkout-time" 
              type="datetime-local" 
              className={inputClass} 
              value={checkoutTime} 
              onChange={(e) => setCheckoutTime(e.target.value)} 
            />
            <p className="text-xs text-muted mt-1">Change this to calculate early checkout or overstays.</p>
          </Field>

          {loading && !calc && <Spinner label="Calculating final bill..." />}

          {calc && (
            <>
              <div className="rounded border border-line bg-bg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Original Booking Amount</span>
                  <span className="font-medium">{formatCurrencyINR(calc.original_total_paise)}</span>
                </div>
                <div className="flex justify-between text-brand-900">
                  <span>Recalculated Stay Cost</span>
                  <span className="font-medium">{formatCurrencyINR(calc.recalculated_total_paise)}</span>
                </div>
                {calc.overstay_charge_paise > 0 && (
                  <div className="flex justify-between text-[#B3261E]">
                    <span>Overstay / Extra Hours</span>
                    <span className="font-medium">+{formatCurrencyINR(calc.overstay_charge_paise)}</span>
                  </div>
                )}
                
                {calc.manual_charges.map((c, i) => (
                  <div key={i} className="flex justify-between text-[#B3261E]">
                    <span>{c.description}</span>
                    <span className="font-medium">+{formatCurrencyINR(c.amount)}</span>
                  </div>
                ))}

                <div className="flex justify-between border-t border-line pt-2 text-base font-bold mt-2">
                  <span>Final Total</span>
                  <span>{formatCurrencyINR(calc.grand_total_paise)}</span>
                </div>
                <div className="flex justify-between bg-[#FBF0DC] text-[#8A5A00] p-2 rounded mt-2 font-bold">
                  <span>Balance to Collect</span>
                  <span>{formatCurrencyINR(calc.balance_due_paise)}</span>
                </div>
              </div>

              {/* Add manual charge */}
              <div className="border-t border-line pt-4">
                <p className="text-sm font-semibold mb-2">Add Extra Charge</p>
                <form onSubmit={handleAddCharge} className="flex gap-2">
                  <input className={`${inputClass} flex-1`} placeholder="e.g. Lost Key" value={chargeDesc} onChange={e => setChargeDesc(e.target.value)} />
                  <input className={`${inputClass} w-24`} type="number" placeholder="₹" value={chargeAmt} onChange={e => setChargeAmt(e.target.value)} />
                  <Button type="submit" variant="secondary" loading={addingCharge}>Add</Button>
                </form>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-line px-5 py-3 flex justify-end gap-3 bg-bg rounded-b-card">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleFinalCheckout} disabled={loading || !calc}>Confirm & Checkout</Button>
        </div>
      </div>
    </div>
  );
}