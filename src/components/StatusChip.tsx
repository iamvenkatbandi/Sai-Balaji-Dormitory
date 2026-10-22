type Status = 'available' | 'reserved' | 'occupied' | 'cleaning' | 'maintenance' | 'inactive';

const STYLES: Record<Status, { label: string; fg: string; bg: string }> = {
  available:   { label: 'Available',   fg: '#2E7D5B', bg: '#E6F4ED' },
  reserved:    { label: 'Reserved',    fg: '#8A5A00', bg: '#FBF0DC' },
  occupied:    { label: 'Occupied',    fg: '#173B35', bg: '#DCE6E2' },
  cleaning:    { label: 'Cleaning',    fg: '#5B4A8F', bg: '#EDEAF7' },
  maintenance: { label: 'Maintenance', fg: '#B3261E', bg: '#FBEAE8' },
  inactive:    { label: 'Inactive',    fg: '#69736D', bg: '#EFF1EF' },
};

export function StatusChip({ status }: { status: Status }) {
  const s = STYLES[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums"
      style={{ color: s.fg, backgroundColor: s.bg }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.fg }} />
      {s.label}
    </span>
  );
}