import { useEffect, useState, useRef } from 'react';

type State<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: Error };

// PostgREST errors are plain objects, not Error instances.
// String(obj) gives "[object Object]" — extract the real message.
function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.length > 0) return new Error(o.message);
    if (typeof o.details === 'string' && o.details.length > 0) return new Error(o.details);
    if (typeof o.hint === 'string' && o.hint.length > 0) return new Error(o.hint);
    try {
      const s = JSON.stringify(err);
      if (s && s !== '{}') return new Error(s);
    } catch { /* ignore */ }
  }
  return new Error('An unexpected error occurred.');
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): State<T> {
  const [state, setState] = useState<State<T>>({ status: 'loading', data: null, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    fnRef.current()
      .then((data) => { if (!cancelled) setState({ status: 'success', data, error: null }); })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', data: null, error: toError(err) });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}