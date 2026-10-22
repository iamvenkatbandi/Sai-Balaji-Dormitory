import { PageHeader } from '../../components/PageHeader';
import { FaqItem } from '../../components/FaqItem';

const FAQS: { q: string; a: string }[] = [
  { q: 'What accommodation types can I book?', a: 'Three booking types: AC individual beds, AC family compartments (once family policy is published) and Non-AC individual sleeping spaces. Each Non-AC space is a single bed on a bunk unit.' },
  { q: 'Do I select a specific bed?', a: 'No. You choose a hall and a time window. Staff assign the exact sleeping space at check-in, respecting the property’s allocation policy and the real layout.' },
  { q: 'How is pricing calculated?', a: 'Prices come from the property’s published rate plans. Hourly, extra-hour, overnight and extended-stay rates apply as configured. Deposits, taxes and additional charges are itemised before confirmation.' },
  { q: 'What if no rate is published for my dates?', a: 'The site will show "Rates not yet published — please enquire." You can submit an enquiry; online payment stays disabled until a rate is available.' },
  { q: 'Can a family book a private compartment?', a: 'Yes, once the property has published its family-eligibility policy. Until then, family compartment bookings are disabled and shown as enquiry-only.' },
  { q: 'Are women-reserved beds available?', a: 'The property designates specific sleeping spaces as women-reserved inside each hall. Availability depends on the actual layout and the property’s published allocation rules.' },
  { q: 'How do I cancel?', a: 'See the Cancellation & Refund policy page for the current published terms. The exact policy that applied to your booking is preserved and shown at confirmation.' },
  { q: 'Can I extend my stay?', a: 'Extension requests are reviewed against current availability and the configured extension rate. Once approved, the extension is added to the booking and the block is extended atomically.' },
  { q: 'How do I know my booking is confirmed?', a: 'A confirmed booking returns a reference and is visible through Booking Status. Payments are verified server-side; a browser redirect on its own does not confirm payment.' },
  { q: 'How do I contact the property?', a: 'The Contact page shows the property’s verified details. If those have not been published yet, the page displays "Contact details are being finalised."' },
];

export function FaqPage() {
  return (
    <>
      <PageHeader eyebrow="FAQ" title="Frequently asked questions" />
      <div className="space-y-3">
        {FAQS.map((f) => (
          <FaqItem key={f.q} question={f.q} answer={f.a} />
        ))}
      </div>
    </>
  );
}