import { Link } from 'react-router-dom';
import { useAsync } from '../lib/useAsync';
import { getContact } from '../lib/queries';

export function Footer() {
  const contact = useAsync(getContact, []);
  const c = contact.status === 'success' ? contact.data : null;
  const hasAddress = !!c?.address_line && !!c?.phone;

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-ink">Sai Balaji Dormitory</p>
          <p className="mt-2 text-sm text-muted">
            Two-hall accommodation — AC and Non-AC — with separate washroom groups and flexible
            hourly, overnight and extended-stay bookings.
          </p>
          <div className="mt-4 text-sm text-muted">
            {hasAddress ? (
              <>
                <p>{c.address_line}</p>
                {c.locality && <p>{c.locality}</p>}
                {c.phone && <p>Phone: {c.phone}</p>}
                {c.email && <p>Email: {c.email}</p>}
              </>
            ) : (
              <p className="rounded-input border border-dashed border-line bg-bg px-3 py-2">
                Contact details are being finalised.
              </p>
            )}
          </div>
        </div>

        <nav aria-label="Site" className="text-sm">
          <p className="mb-2 font-medium text-ink">Explore</p>
          <ul className="space-y-1 text-muted">
            <li><Link to="/accommodation/ac">AC Hall</Link></li>
            <li><Link to="/accommodation/non-ac">Non-AC Hall</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
            <li><Link to="/facilities">Facilities</Link></li>
            <li><Link to="/how-it-works">How it works</Link></li>
            <li><Link to="/booking/status">Booking status</Link></li>
          </ul>
        </nav>

        <nav aria-label="Legal" className="text-sm">
          <p className="mb-2 font-medium text-ink">Policies</p>
          <ul className="space-y-1 text-muted">
            <li><Link to="/legal/privacy">Privacy Policy</Link></li>
            <li><Link to="/legal/terms">Terms &amp; Conditions</Link></li>
            <li><Link to="/legal/cancellation-refund">Cancellation &amp; Refund</Link></li>
            <li><Link to="/legal/guest-rules">Guest Rules</Link></li>
            <li><Link to="/legal/family-policy">Family Eligibility</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} Sai Balaji Dormitory. All rates, facilities and policies are
        published only after verification by the property.
      </div>
    </footer>
  );
}