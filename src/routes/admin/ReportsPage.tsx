import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { useAsync } from '../../lib/useAsync';
import { getOccupancyReport, getRevenueReport, getVolumeReport } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Field, inputClass } from '../../components/Field';
import { formatCurrencyINR } from '../../lib/format';

export function AdminReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  // Pass YYYY-MM-DD directly to match the Postgres `date` type
  const occupancy = useAsync(() => getOccupancyReport(from, to), [from, to]);
  const revenue = useAsync(() => getRevenueReport(from, to), [from, to]);
  const volume = useAsync(() => getVolumeReport(from, to), [from, to]);

  return (
    <>
      <PageHeader eyebrow="Analytics" title="Reports" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="From" htmlFor="rep-from">
          <input id="rep-from" type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To" htmlFor="rep-to">
          <input id="rep-to" type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-6">
        <SectionCard title="Occupancy %">
          {occupancy.status === 'loading' && <Spinner />}
          {occupancy.status === 'error' && <ErrorState message={occupancy.error.message} />}
          {occupancy.status === 'success' && (
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={occupancy.data.map((r) => ({ ...r, day: r.day.slice(0, 10) }))}>
                  <CartesianGrid stroke="#E2E6E3" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="occupancy_pct" stroke="#173B35" strokeWidth={2} dot={false} name="Occupancy" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Revenue (₹)">
          {revenue.status === 'loading' && <Spinner />}
          {revenue.status === 'error' && <ErrorState message={revenue.error.message} />}
          {revenue.status === 'success' && (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={revenue.data.map((r) => ({ day: r.day.slice(0, 10), revenue: r.revenue_paise / 100, refunds: r.refunds_paise / 100, net: r.net_paise / 100 }))}>
                  <CartesianGrid stroke="#E2E6E3" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrencyINR(v * 100)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#173B35" name="Collected" />
                  <Bar dataKey="refunds" fill="#B3261E" name="Refunded" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Booking volume">
          {volume.status === 'loading' && <Spinner />}
          {volume.status === 'error' && <ErrorState message={volume.error.message} />}
          {volume.status === 'success' && (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={volume.data.map((r) => ({ ...r, day: r.day.slice(0, 10) }))}>
                  <CartesianGrid stroke="#E2E6E3" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bookings" fill="#173B35" name="Bookings" />
                  <Bar dataKey="cancellations" fill="#8A5A00" name="Cancellations" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}