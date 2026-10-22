import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, intro, actions }: {
  eyebrow?: string; title: string; intro?: string; actions?: ReactNode;
}) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="text-xs font-medium uppercase tracking-wider text-brand-700">{eyebrow}</p>}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
        {actions}
      </div>
      {intro && <p className="mt-3 max-w-3xl text-base text-muted">{intro}</p>}
    </div>
  );
}