export function AvailabilityBadge({ free, total }: { free: number; total: number }) {
  const tone =
    total === 0 ? 'bg-bg text-muted border-line'
    : free === 0 ? 'bg-[#FBEAE8] text-[#B3261E] border-[#FBEAE8]'
    : free < total / 4 ? 'bg-[#FBF0DC] text-[#8A5A00] border-[#FBF0DC]'
    : 'bg-[#E6F4ED] text-[#2E7D5B] border-[#E6F4ED]';
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tabular-nums ${tone}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {total === 0 ? 'No inventory configured' : free === 0 ? 'Fully booked' : `${free} of ${total} available`}
    </span>
  );
}