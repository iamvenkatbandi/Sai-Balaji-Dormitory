import { Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getDashboardMetrics } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { formatCurrencyINR } from '../../lib/format';

export function AdminDashboardPage() {
  const metrics = useAsync(getDashboardMetrics, []);

  if (metrics.status === 'loading') return <Spinner />;
  if (metrics.status === 'error') return <ErrorState message={metrics.error.message} />;

  const m = metrics.data;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total capacity" value={m.capacity.total} sub={`AC ${m.capacity.ac} · Non-AC ${m.capacity.non_ac}`} />
        <Stat label="Occupied now" value={m.occupancy.occupied} accent />
        <Stat label="Available now" value={m.occupancy.available} />
        <Stat label="Reserved (future)" value={m.occupancy.reserved} />
        <Stat label="Maintenance" value={m.occupancy.maintenance} tone="warn" />
        <Stat label="Cleaning" value={m.occupancy.cleaning} tone="warn" />
        <Stat label="Arrivals today" value={m.today.arrivals} />
        <Stat label="Departures today" value={m.today.departures} />
        <Stat label="Overdue" value={m.today.overdue} tone="danger" />
        <Stat label="Open support tickets" value={m.ops.open_support_tickets} />
        <Stat label="Collections" value={formatCurrencyINR(m.finance.collections_paise)} />
        <Stat label="Outstanding" value={formatCurrencyINR(m.finance.outstanding_paise)} tone="warn" />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <SectionCard title="Operations">
          <ul className="space-y-2 text-sm">
            <li><Link to="/admin/reception" className="text-brand-900 hover:underline">Reception — arrivals & departures →</Link></li>
            <li><Link to="/admin/bookings" className="text-brand-900 hover:underline">All bookings →</Link></li>
            <li><Link to="/admin/beds" className="text-brand-900 hover:underline">Bed inventory →</Link></li>
            <li><Link to="/admin/cleaning" className="text-brand-900 hover:underline">Cleaning queue →</Link></li>
            <li><Link to="/admin/maintenance" className="text-brand-900 hover:underline">Maintenance tickets →</Link></li>
          </ul>
        </SectionCard>
        <SectionCard title="Finance & Reports">
          <ul className="space-y-2 text-sm">
            <li><Link to="/admin/finance" className="text-brand-900 hover:underline">Payments & refunds →</Link></li>
            <li><Link to="/admin/reports" className="text-brand-900 hover:underline">Reports & analytics →</Link></li>
            <li><Link to="/admin/rates" className="text-brand-900 hover:underline">Rates & pricing →</Link></li>
          </ul>
        </SectionCard>
        <SectionCard title="Configuration">
          <ul className="space-y-2 text-sm">
            <li><Link to="/admin/settings" className="text-brand-900 hover:underline">Property settings →</Link></li>
            <li><Link to="/admin/policies" className="text-brand-900 hover:underline">Policies →</Link></li>
            <li><Link to="/admin/staff" className="text-brand-900 hover:underline">Staff & roles →</Link></li>
            <li><Link to="/admin/washrooms" className="text-brand-900 hover:underline">Washrooms →</Link></li>
          </ul>
        </SectionCard>
      </div>
    </>
  );
}

function Stat({ label, value, sub, accent, tone }: {
  label: string; value: string | number; sub?: string; accent?: boolean;
  tone?: 'warn' | 'danger';
}) {
  const color = tone === 'danger' ? 'text-[#B3261E]' : tone === 'warn' ? 'text-[#8A5A00]' : accent ? 'text-brand-900' : 'text-ink';
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}