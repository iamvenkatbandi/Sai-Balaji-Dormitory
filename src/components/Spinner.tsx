export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-sm text-muted">
      <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-brand-900 border-r-transparent" />
      <span>{label}</span>
    </div>
  );
}