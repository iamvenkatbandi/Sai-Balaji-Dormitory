export function PlaceholderPhoto({
  label, caption, aspect = 'aspect-[4/3]',
}: { label: string; caption?: string; aspect?: string }) {
  return (
    <figure className="overflow-hidden rounded-card border border-line bg-bg">
      <div
        className={`relative flex ${aspect} w-full items-center justify-center bg-brand-100`}
        role="img"
        aria-label={`${label} — representative placeholder image`}
      >
        <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
          {label}
        </span>
      </div>
      {caption && (
        <figcaption className="border-t border-line bg-surface px-3 py-2 text-xs text-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}