import { useParams, Link } from 'react-router-dom';
import { useAsync } from '../../lib/useAsync';
import { getReceiptData } from '../../lib/queries';
import { Spinner } from '../../components/Spinner';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

export function VerifyReceiptPage() {
  const { id = '' } = useParams();
  const data = useAsync(() => getReceiptData(id), [id]);

  if (data.status === 'loading') {
    return <div className="min-h-screen bg-bg flex items-center justify-center"><Spinner /></div>;
  }

  if (data.status === 'error' || !data.data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-card border border-[#FBEAE8] bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FBEAE8] text-[#B3261E]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-[#B3261E]">Invalid Receipt</h1>
          <p className="mt-2 text-sm text-muted">The receipt you are trying to verify does not exist or has been removed.</p>
          <Link to="/" className="mt-6 inline-block text-sm font-medium text-brand-900 hover:underline">Return to Home</Link>
        </div>
      </div>
    );
  }

  const { booking, guest_name, payments, property } = data.data;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paise, 0);
  const isFullyPaid = totalPaid >= booking.total_paise;

  return (
    <div className="min-h-screen bg-bg py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full rounded-card border border-line bg-surface p-8 shadow-card">
        
        {/* Brand Header */}
        <div className="text-center border-b border-line pb-6">
          <h1 className="text-2xl font-bold text-brand-900">{property.name}</h1>
          <p className="text-sm text-muted mt-1">Official Receipt Verification</p>
        </div>

        {/* Status Stamp */}
        <div className={`mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full border-4 ${
          isFullyPaid 
            ? 'border-[#2E7D5B] bg-[#E6F4ED] text-[#2E7D5B]' 
            : 'border-[#8A5A00] bg-[#FBF0DC] text-[#8A5A00]'
        }`}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {isFullyPaid ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="10" />}
          </svg>
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-lg font-bold text-ink">{isFullyPaid ? 'Verified & Paid' : 'Verified & Pending'}</h2>
          <p className="text-sm text-muted">This is a genuine receipt issued by {property.name}.</p>
        </div>

        {/* Receipt Details */}
        <dl className="mt-8 space-y-3 rounded-card border border-line bg-bg p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Receipt Ref</dt>
            <dd className="font-mono font-medium text-ink">{booking.reference}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Guest Name</dt>
            <dd className="text-ink">{guest_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Stay Dates</dt>
            <dd className="text-right text-ink">{formatDateTime(booking.starts_at).split(',')[0]} to {formatDateTime(booking.ends_at).split(',')[0]}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3">
            <dt className="font-medium text-ink">Total Amount</dt>
            <dd className="font-bold text-brand-900">{formatCurrencyINR(booking.total_paise)}</dd>
          </div>
        </dl>

        <div className="mt-8 text-center text-xs text-muted">
          <p>Issued on {formatDateTime(booking.created_at)}</p>
          <p className="mt-1">If you suspect fraud, please contact {property.phone || 'the property'}.</p>
        </div>
      </div>
    </div>
  );
}