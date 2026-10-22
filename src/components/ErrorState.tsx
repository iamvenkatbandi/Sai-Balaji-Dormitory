import { Button } from './Button';

function toDisplayText(message: unknown): string {
  if (typeof message === 'string' && message.length > 0) return message;
  if (message instanceof Error && message.message) return message.message;
  if (message && typeof message === 'object') {
    const m = message as Record<string, unknown>;
    if (typeof m.message === 'string' && m.message) return m.message;
    if (typeof m.details === 'string' && m.details) return m.details;
    if (typeof m.hint === 'string' && m.hint) return m.hint;
    try {
      const s = JSON.stringify(message);
      if (s && s !== '{}') return s;
    } catch { /* ignore */ }
  }
  return 'An unexpected error occurred.';
}

export function ErrorState({ message, onRetry }: { message: unknown; onRetry?: () => void }) {
  const text = toDisplayText(message);
  return (
    <div role="alert" className="rounded-card border border-[#FBEAE8] bg-[#FBEAE8] p-6 text-center">
      <p className="font-medium text-[#B3261E]">Something went wrong</p>
      <p className="mt-1 text-sm text-[#7A1A15]">{text}</p>
      {onRetry && (
        <div className="mt-4"><Button variant="secondary" onClick={onRetry}>Try again</Button></div>
      )}
    </div>
  );
}