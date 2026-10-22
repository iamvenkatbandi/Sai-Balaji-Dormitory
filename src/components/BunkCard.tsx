import { StatusChip } from './StatusChip';

type SpaceStatus = 'available' | 'reserved' | 'occupied' | 'cleaning' | 'maintenance' | 'inactive';

export interface BunkSpace { id: string; code: string; status: SpaceStatus; }
export interface BunkCardProps {
  unitCode: string;
  upper: BunkSpace;
  lower: BunkSpace;
  unitUnderMaintenance?: boolean;
  onSelectSpace: (id: string) => void;
}

export function BunkCard({ unitCode, upper, lower, unitUnderMaintenance, onSelectSpace }: BunkCardProps) {
  return (
    <div className="rounded-card border border-line bg-surface p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs font-medium text-muted">{unitCode}</span>
        {unitUnderMaintenance && (
          <span className="rounded-full bg-[#FBEAE8] px-2 py-0.5 text-[10px] font-medium text-[#B3261E]">
            Unit blocked
          </span>
        )}
      </div>
      {[
        { label: 'U', space: upper },
        { label: 'L', space: lower },
      ].map(({ label, space }) => (
        <button
          key={space.id}
          onClick={() => onSelectSpace(space.id)}
          className="mb-1 flex w-full items-center justify-between rounded-md border border-line px-2 py-1.5 text-left hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-900"
          aria-label={`${label === 'U' ? 'Upper' : 'Lower'} bed ${space.code}`}
        >
          <span className="font-mono text-xs text-ink">{space.code}</span>
          <StatusChip status={space.status} />
        </button>
      ))}
    </div>
  );
}