export function NotConfiguredNotice({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="rounded-card border border-dashed border-line bg-bg p-6 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}