import { useMemo, useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import {
  getFinanceSummary, getSettlements, getOutstandingDues, getRefundHistory,
  type OutstandingDue, type RefundRecord
} from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';
import type { SettlementRow } from '../../lib/database.types';

type Tab = 'payouts' | 'dues' | 'refunds';

export function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('payouts');
  const [from] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to] = useState(() => new Date().toISOString().slice(0, 10));

  const fromIso = useMemo(() => new Date(`${from}T00:00:00`).toISOString(), [from]);
  const toIso = useMemo(() => new Date(`${to}T23:59:59`).toISOString(), [to]);

  const summary = useAsync(() => getFinanceSummary(fromIso, toIso), [fromIso, toIso]);
  const settlements = useAsync(() => getSettlements(100), []);
  const dues = useAsync(() => getOutstandingDues(), []);
  const refunds = useAsync(() => getRefundHistory(), []);

  if (summary.status === 'loading' || settlements.status === 'loading' || dues.status === 'loading' || refunds.status === 'loading') {
    return <Spinner />;
  }

  return (
    <>
      <PageHeader 
        eyebrow="Finance" 
        title="Cash Flow & Operations" 
        intro="Track Razorpay payouts, chase outstanding balances, and review refunds."
      />

      {/* Summary Cards */}
      {summary.status === 'success' && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Collected (Last 30d)" value={formatCurrencyINR(summary.data.collected_paise)} />
          <Tile label="Net Revenue" value={formatCurrencyINR(summary.data.net_paise)} accent />
          <Tile 
            label="Total Outstanding" 
            value={formatCurrencyINR(dues.status === 'success' ? dues.data.reduce((s, d) => s + d.due_paise, 0) : 0)} 
            tone="warn" 
          />
          <Tile label="Total Refunded" value={formatCurrencyINR(summary.data.refunded_paise)} tone="danger" />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-line">
        <TabButton active={activeTab === 'payouts'} onClick={() => setActiveTab('payouts')}>Razorpay Payouts</TabButton>
        <TabButton active={activeTab === 'dues'} onClick={() => setActiveTab('dues')}>
          Outstanding Dues {dues.status === 'success' && dues.data.length > 0 && <span className="ml-1.5 rounded-full bg-[#FBEAE8] px-2 py-0.5 text-xs text-[#B3261E]">{dues.data.length}</span>}
        </TabButton>
        <TabButton active={activeTab === 'refunds'} onClick={() => setActiveTab('refunds')}>Refund History</TabButton>
      </div>

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <SectionCard title="Bank Settlements" subtitle="Funds transferred by Razorpay to your bank account.">
          {settlements.status === 'error' && <ErrorState message={settlements.error.message} />}
          {settlements.status === 'success' && settlements.data.length === 0 && (
            <EmptyState title="No settlements recorded." body="Settlements appear here once Razorpay transfers funds to your bank." />
          )}
          {settlements.status === 'success' && settlements.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-bg text-xs uppercase tracking-wide text-muted border-b border-line">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Settlement ID</th>
                    <th className="px-3 py-2">UTR (Bank Ref)</th>
                    <th className="px-3 py-2 text-right">Gross</th>
                    <th className="px-3 py-2 text-right">Fees</th>
                    <th className="px-3 py-2 text-right">Net Received</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.data.map((s: SettlementRow) => (
                    <tr key={s.id} className="border-t border-line">
                      <td className="px-3 py-2 text-xs text-muted">{s.created_at ? formatDateTime(s.created_at) : '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.settlement_id}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.utr ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrencyINR(s.amount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#B3261E]">-{formatCurrencyINR(s.fees + s.tax)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-brand-900">{formatCurrencyINR(s.amount - s.fees - s.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* Dues Tab */}
      {activeTab === 'dues' && (
        <SectionCard title="Outstanding Balances" subtitle="Guests who have not paid the full amount.">
          {dues.status === 'error' && <ErrorState message={dues.error.message} />}
          {dues.status === 'success' && dues.data.length === 0 && (
            <EmptyState title="No outstanding balances." body="All active guests are fully paid." />
          )}
          {dues.status === 'success' && dues.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-bg text-xs uppercase tracking-wide text-muted border-b border-line">
                  <tr>
                    <th className="px-3 py-2">Booking Ref</th>
                    <th className="px-3 py-2">Guest Name</th>
                    <th className="px-3 py-2 text-right">Total Bill</th>
                    <th className="px-3 py-2 text-right">Amount Paid</th>
                    <th className="px-3 py-2 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {dues.data.map((d: OutstandingDue) => (
                    <tr key={d.booking_id} className="border-t border-line">
                      <td className="px-3 py-2 font-mono text-xs font-medium">{d.reference}</td>
                      <td className="px-3 py-2">{d.guest_name}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted">{formatCurrencyINR(d.total_paise)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#2E7D5B]">{formatCurrencyINR(d.paid_paise)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-[#B3261E]">{formatCurrencyINR(d.due_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* Refunds Tab */}
      {activeTab === 'refunds' && (
        <SectionCard title="Refund History" subtitle="All processed refunds for cancellations and overpayments.">
          {refunds.status === 'error' && <ErrorState message={refunds.error.message} />}
          {refunds.status === 'success' && refunds.data.length === 0 && (
            <EmptyState title="No refunds issued." body="Refunds you process will appear here." />
          )}
          {refunds.status === 'success' && refunds.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-bg text-xs uppercase tracking-wide text-muted border-b border-line">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Booking Ref</th>
                    <th className="px-3 py-2">Guest Name</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.data.map((r: RefundRecord) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-3 py-2 text-xs text-muted">{formatDateTime(r.processed_at || r.created_at)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.reference}</td>
                      <td className="px-3 py-2">{r.guest_name}</td>
                      <td className="px-3 py-2 text-xs text-muted truncate max-w-[200px]">{r.reason || '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-[#B3261E]">-{formatCurrencyINR(r.amount_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`pb-2 text-sm font-medium transition-colors ${
        active ? 'border-b-2 border-brand-900 text-brand-900' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function Tile({ label, value, accent, tone }: { label: string; value: string; accent?: boolean; tone?: 'warn' | 'danger' }) {
  const color = tone === 'danger' ? 'text-[#B3261E]' : tone === 'warn' ? 'text-[#8A5A00]' : accent ? 'text-brand-900' : 'text-ink';
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}