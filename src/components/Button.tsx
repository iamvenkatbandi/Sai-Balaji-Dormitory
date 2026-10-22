import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children?: ReactNode;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-input px-4 py-2.5 text-sm font-medium transition ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-900';

const STYLES: Record<Variant, string> = {
  primary: 'bg-brand-900 text-white hover:bg-brand-700',
  secondary: 'border border-line bg-surface text-ink hover:bg-bg',
  ghost: 'text-ink hover:bg-bg',
  danger: 'bg-[#B3261E] text-white hover:bg-[#8E1E18]',
};

export function Button({ variant = 'primary', loading, disabled, children, className = '', ...rest }: Props) {
  return (
    <button
      className={`${BASE} ${STYLES[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {children}
    </button>
  );
}