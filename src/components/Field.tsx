import type { ReactNode } from 'react';

interface Props {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, required, children }: Props) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-[#B3261E]"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-[#B3261E]" role="alert">{error}</p>}
    </div>
  );
}

export const inputClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink ' +
  'placeholder:text-muted focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100 ' +
  'disabled:bg-bg disabled:text-muted';