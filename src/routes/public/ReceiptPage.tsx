import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { useAsync } from '../../lib/useAsync';
import { getReceiptData } from '../../lib/queries';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { formatDateTime, formatCurrencyINR } from '../../lib/format';

export function ReceiptPage() {
  const { id = '' } = useParams();
  const data = useAsync(() => getReceiptData(id), [id]);

  // Apply isolation class to body for perfect printing
  useEffect(() => {
    document.body.classList.add('print-isolate');
    return () => document.body.classList.remove('print-isolate');
  }, []);

  if (data.status === 'loading') return <div className="p-12"><Spinner /></div>;
  if (data.status === 'error') return <div className="p-12"><ErrorState message={data.error.message} /></div>;

  const { booking, guest_name, payments, property } = data.data;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paise, 0);
  const isFullyPaid = totalPaid >= booking.total_paise;
  const balanceDue = booking.total_paise - totalPaid;

  // The URL encoded in the QR code
  const verifyUrl = `${window.location.origin}/verify-receipt/${booking.id}`;

  return (
    <div className="min-h-screen bg-bg py-12 px-4 print:bg-white print:py-0 print:px-0">
      
      {/* Action Buttons (Hidden when printing) */}
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <Link to={-1 as any} className="text-sm font-medium text-brand-900 hover:underline">
          ← Back
        </Link>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.print()}>Print / Save as PDF</Button>
        </div>
      </div>

      {/* The A4 Receipt Area */}
      <div className="print-area mx-auto max-w-3xl rounded-card border border-line bg-surface p-8 shadow-card print:border-none print:shadow-none print:max-w-none">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-brand-900 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-brand-900">{property.name}</h1>
            <div className="mt-2 text-sm text-muted">
              {property.address_line && <p>{property.address_line}</p>}
              {property.phone && <p>Phone: {property.phone}</p>}
              {property.email && <p>Email: {property.email}</p>}
              {!property.address_line && <p>Contact details pending.</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold uppercase tracking-wider text-ink">Receipt</h2>
            <p className="mt-1 font-mono text-sm text-muted">{booking.reference}</p>
            <p className="mt-2 text-sm text-muted">Date Issued: {formatDateTime(booking.created_at)}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Billed To</h3>
            <p className="font-medium text-ink">{guest_name}</p>
            {booking.primary_contact_email && <p className="text-sm text-muted">{booking.primary_contact_email}</p>}
            {booking.primary_contact_phone && <p className="text-sm text-muted">{booking.primary_contact_phone}</p>}
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Stay Details</h3>
            <p className="text-sm text-ink"><span className="font-medium">Check-in:</span> {formatDateTime(booking.starts_at)}</p>
            <p className="text-sm text-ink"><span className="font-medium">Checkout:</span> {formatDateTime(booking.ends_at)}</p>
            <p className="text-sm text-ink capitalize"><span className="font-medium">Type:</span> {booking.product_type.replaceAll('_', ' ')}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mt-10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg/50">
                <th className="py-3 px-4 text-left font-semibold text-muted">Description</th>
                <th className="py-3 px-4 text-right font-semibold text-muted">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-4 px-4">
                  <p className="font-medium text-ink">Accommodation Charges</p>
                  <p className="text-xs text-muted mt-1">Booking Ref: {booking.reference}</p>
                </td>
                <td className="py-4 px-4 text-right tabular-nums">
                  {formatCurrencyINR(booking.total_paise)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrencyINR(booking.total_paise)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Tax</span>
              <span className="tabular-nums">Included</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrencyINR(booking.total_paise)}</span>
            </div>
            <div className="flex justify-between text-brand-900 font-medium pt-2">
              <span>Amount Paid</span>
              <span className="tabular-nums">{formatCurrencyINR(totalPaid)}</span>
            </div>
            {balanceDue > 0 && (
              <div className="flex justify-between text-[#B3261E] font-bold border-t border-[#FBEAE8] pt-2">
                <span>Balance Due</span>
                <span className="tabular-nums">{formatCurrencyINR(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Stamp and QR Code */}
        <div className="mt-12 flex justify-between items-end border-t border-line pt-6">
          <div className="flex items-center gap-6">
            
            {/* QR Code Block */}
            <div className="text-center print:block bg-white p-2 rounded border border-gray-200">
              <QRCode
                size={90}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                value={verifyUrl}
                viewBox={`0 0 256 256`}
              />
              <p className="mt-1 text-[10px] font-medium text-muted uppercase tracking-wider">Scan to verify</p>
            </div>

            <div className="text-xs text-muted">
              <p>Thank you for choosing {property.name}.</p>
              <p className="mt-1">Please present this receipt at the reception during check-in.</p>
            </div>
          </div>
          
          <div className={`rounded-md border-2 px-4 py-2 text-lg font-bold uppercase tracking-wider ${
            isFullyPaid 
              ? 'border-[#2E7D5B] text-[#2E7D5B] opacity-80 transform -rotate-3' 
              : 'border-[#8A5A00] text-[#8A5A00] opacity-80'
          }`}>
            {isFullyPaid ? 'Paid' : 'Pending'}
          </div>
        </div>

      </div>
    </div>
  );
}