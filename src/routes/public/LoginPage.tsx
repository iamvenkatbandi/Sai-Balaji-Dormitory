import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next') || '/portal';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resendState, setResendState] =
    useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Already signed in → leave the login page immediately.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        navigate(next, { replace: true });
      }
    });
    return () => { cancelled = true; };
  }, [next, navigate]);

  function describeAuthError(msg: string): string {
    const m = msg.toLowerCase();
    if (m.includes('invalid login')) return 'Email or password is incorrect.';
    if (m.includes('email not confirmed'))
      return 'Your email is not yet confirmed. Check your inbox or request a new confirmation link below.';
    if (m.includes('too many'))
      return 'Too many attempts. Please wait a moment and try again.';
    return msg;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsConfirm(false);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (authError) {
      setError(describeAuthError(authError.message));
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        setNeedsConfirm(true);
      }
      return;
    }
    navigate(next, { replace: true });
  }

  async function resendConfirmation() {
    if (!email.trim()) {
      setError('Enter your email address first, then click resend.');
      return;
    }
    setResendState('sending');
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${next}` },
    });
    if (err) {
      setError(err.message);
      setResendState('error');
    } else {
      setResendState('sent');
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-muted">
        Access your bookings, payments and account.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-card border border-line bg-surface p-6">
        <Field label="Email" htmlFor="login-email" required>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" htmlFor="login-password" required>
          <div className="relative">
            <input
              id="login-password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              className={`${inputClass} pr-16`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-input px-2 py-1 text-xs text-muted hover:bg-bg"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>
        {error && <p role="alert" className="text-sm text-[#B3261E]">{error}</p>}
        {needsConfirm && (
          <div className="rounded-input border border-[#FBF0DC] bg-[#FBF0DC] p-3 text-sm text-[#8A5A00]">
            {resendState === 'sent' ? (
              <p>Confirmation email sent — check your inbox.</p>
            ) : (
              <button
                type="button"
                onClick={resendConfirmation}
                disabled={resendState === 'sending'}
                className="underline hover:no-underline disabled:opacity-60"
              >
                {resendState === 'sending' ? 'Sending…' : 'Resend confirmation email'}
              </button>
            )}
          </div>
        )}
        <Button type="submit" loading={loading} className="w-full">Sign in</Button>
        <div className="flex justify-between text-sm">
          <Link to="/forgot-password" className="text-brand-900 hover:underline">Forgot password?</Link>
          <Link to="/register" className="text-brand-900 hover:underline">Create account</Link>
        </div>
      </form>
    </div>
  );
}