import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';

const STEPS = [
  'Choose an accommodation section — AC individual bed, AC family compartment (subject to family policy), or a Non-AC single sleeping space.',
  'Select a check-in time and a booking duration or eligible pricing plan.',
  'Review the final price, including any deposit, taxes and additional charges that apply.',
  'Submit your booking details.',
  'Complete any required verification and payment.',
  'Receive a confirmation with your booking reference.',
  'Check in at the property. Staff assign the exact sleeping space at check-in according to the physical layout and allocation policy.',
  'Check out at the confirmed time. A cleaning buffer runs before the space becomes bookable again.',
];

export function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        title="Booking from start to checkout"
        intro="Eight steps from choosing a hall to checking out of your allocated bed."
      />

      <ol className="space-y-4">
        {STEPS.map((text, i) => (
          <li key={i} className="flex gap-4 rounded-card border border-line bg-surface p-5">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brand-900 text-sm font-medium text-white">
              {i + 1}
            </span>
            <p className="text-sm text-ink">{text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-card border border-line bg-surface p-5">
        <p className="text-sm text-ink">
          <strong>Important:</strong> the exact bed is assigned by staff at check-in. Bed IDs, numeric ordering and proximity do not by themselves indicate physical adjacency or safety.
        </p>
      </div>

      <div className="mt-6">
        <Link to="/book" className="text-sm font-medium text-brand-900 hover:underline">
          Start a booking →
        </Link>
      </div>
    </>
  );
}