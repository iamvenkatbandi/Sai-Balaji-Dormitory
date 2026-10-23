import { useMemo, useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { getFinanceSummary, listPayments, processRefund, getSettlements } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';
import type { PaymentListRow } from '../../lib/database.types';

type Tab = 'transactions' | 'settlements';

export function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<string>('');

  const fromIso = useMemo(() => new Date(`${from}T00:00:00`).toISOString(), [from]);
  const toIso = useMemo(() => new Date(`${to}T23:59:59`).toISOString(), [to]);

  const summary = useAsync(() => getFinanceSummary(fromIso, toIso), [fromIso, toIso]);
  const payments = useAsync(() => listPayments({ fromIso, toIso, status: status || null }), [fromIso, toIso, status]);
  const settlements = useAsync(() => getSettlements(100), []); // Settlements don't filter by date in this simple view

  const [refunding, setRefunding] = useState<PaymentListRow | null>(null);

  return (
    <>
      <PageHeader eyebrow="Finance" title="Payments & Settlements" />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-line">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === 'transactions'
              ? 'border-brand-900 text-brand-900'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === 'settlements'
              ? 'border-brand-900 text-brand-900'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Settlements
        </button>
      </div>

      {activeTab === 'transactions' && (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Field label="From" htmlFor="fin-from"><input id="fin-from" type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To" htmlFor="fin-to"><input id="fin-to" type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            <Field label="Status" htmlFor="fin-status">
              <select id="fin-status" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="succeeded">Succeeded</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </Field>
          </div>

          {summary.status === 'loading' && <Spinner />}
          {summary.status === 'error' && <ErrorState message={summary.error.message} />}
          {summary.status === 'success' && (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Tile label="Collected" value={formatCurrencyINR(summary.data.collected_paise)} />
              <Tile label="Refunded" value={formatCurrencyINR(summary.data.refunded_paise)} />
              <Tile label="Net" value={formatCurrencyINR(summary.data.net_paise)} accent />
              <Tile label="Outstanding" value={formatCurrencyINR(summary.data.outstanding_paise)} tone="warn" />
            </div>
          )}

          <SectionCard title="Payment Transactions" >
            {payments.status === 'loading' && <Spinner />}
            {payments.status === 'error' && <ErrorState message={payments.error.message} />}
            {payments.status === 'success' && payments.data.length === 0 && (
              <EmptyState title="No payments in this range." body="Adjust the date range or status filter." />
            )}
            {payments.status === 'success' && payments.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-bg text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Booking</th>
                      <th className="px-3 py-2">Guest</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.data.map((p) => (
                      <tr key={p.id} className="border-t border-line">
                        <td className="px-3 py-2 text-xs text-muted">{formatDateTime(p.created_at)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{p.booking_reference}</td>
                        <td className="px-3 py-2 text-xs">{p.guest_name ?? '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{formatCurrencyINR(p.amount_paise)}</td>
                        <td className="px-3 py-2 text-xs">{p.status}</td>
                        <td className="px-3 py-2 text-right">
                          {p.status === 'succeeded' && (
                            <button onClick={() => setRefunding(p)} className="text-xs font-medium text-brand-900 hover:underline">Refund</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}

      {activeTab === 'settlements' && (
        <SectionCard title="Bank Settlements" subtitle="Funds transferred by Razorpay to your bank account">
          {settlements.status === 'loading' && <Spinner />}
          {settlements.status === 'error' && <ErrorState message={settlements.error.message} />}
          {settlements.status === 'success' && settlements.data.length === 0 && (
            <EmptyState title="No settlements recorded." body="Settlements appear here once Razorpay transfers funds to your bank." />
          )}
          {settlements.status === 'success' && settlements.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Settlement ID</th>
                    <th className="px-3 py-2">UTR</th>
                    <th className="px-3 py-2">Gross</th>
                    <th className="px-3 py-2">Fees & Tax</th>
                    <th className="px-3 py-2">Net Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.data.map((s) => (
                    <tr key={s.id} className="border-t border-line">
                      <td className="px-3 py-2 text-xs text-muted">
                        {s.created_at ? formatDateTime(s.created_at) : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{s.settlement_id}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.utr ?? '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{formatCurrencyINR(s.amount)}</td>
                      <td className="px-3 py-2 tabular-nums text-[#B3261E]">
                        - {formatCurrencyINR(s.fees + s.tax)}
                      </td>
                      <td className="px-3 py-2 tabular-nums font-medium text-brand-900">
                        {formatCurrencyINR(s.amount - s.fees - s.tax)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {refunding && (
        <RefundDialog payment={refunding} onClose={() => setRefunding(null)} onDone={() => { setRefunding(null); window.location.reload(); }} />
      )}
    </>
  );
}

function Tile({ label, value, accent, tone }: { label: string; value: string; accent?: boolean; tone?: 'warn' }) {
  const color = tone === 'warn' ? 'text-[#8A5A00]' : accent ? 'text-brand-900' : 'text-ink';
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function RefundDialog({ payment, onClose, onDone }: { payment: PaymentListRow; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(payment.amount_paise / 100);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSaving(true); setErr(null);
    try {
      await processRefund(payment.id, Math.round(amount * 100), reason);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Refund failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-card bg-surface p-6 shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ink">Refund payment</h2>
        <p className="mt-1 text-sm text-muted">
          {formatCurrencyINR(payment.amount_paise)} · booking {payment.booking_reference}
        </p>
        <div className="mt-4 space-y-3">
          <Field label="Amount (₹)" htmlFor="refund-amount" required>
            <input id="refund-amount" type="number" min={1} max={payment.amount_paise / 100}
              className={inputClass} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </Field>
          <Field label="Reason" htmlFor="refund-reason">
            <input id="refund-reason" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        {err && <p role="alert" className="mt-3 text-sm text-[#B3261E]">{err}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Process refund</Button>
        </div>
      </div>
    </div>
  );
}