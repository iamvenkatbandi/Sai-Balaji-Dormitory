import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';

export function RegisterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next') || '/portal';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [resendState, setResendState] =
    useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Already signed in → leave register.
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
    if (m.includes('already registered') || m.includes('user already')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (m.includes('password') && m.includes('least')) {
      return 'Password is too short. Use at least 8 characters.';
    }
    if (m.includes('invalid email')) return 'Please enter a valid email address.';
    if (m.includes('too many'))
      return 'Too many attempts. Please wait a moment and try again.';
    return msg;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() || undefined },
        emailRedirectTo: `${window.location.origin}${next}`,
      },
    });
    setLoading(false);

    if (authError) {
      setError(describeAuthError(authError.message));
      return;
    }

    // Email confirmation disabled on the project → session returned → auto sign-in.
    if (data.session) {
      navigate(next, { replace: true });
      return;
    }

    // Email confirmation enabled → success screen.
    setSent(true);
  }

  async function resendConfirmation() {
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

  if (sent) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold text-ink">Check your email</h1>
        <p className="mt-1 text-sm text-muted">
          We've sent a confirmation link to <span className="text-ink">{email}</span>.
          Click the link to finish creating your account.
        </p>
        <div className="mt-6 space-y-4 rounded-card border border-line bg-surface p-6">
          <p className="text-sm text-ink">
            After confirming, you can sign in to access your bookings and portal.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/login"><Button>Go to sign in</Button></Link>
            <Button
              variant="secondary"
              onClick={resendConfirmation}
              loading={resendState === 'sending'}
              disabled={resendState === 'sent'}
            >
              {resendState === 'sent' ? 'Confirmation resent' : 'Resend confirmation email'}
            </Button>
          </div>
          {error && <p role="alert" className="text-sm text-[#B3261E]">{error}</p>}
          <p className="text-xs text-muted">
            Check your spam folder if the email doesn't arrive within a few minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Create account</h1>
      <p className="mt-1 text-sm text-muted">
        An account is required to hold a confirmed booking and view it in your portal.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-card border border-line bg-surface p-6">
        <Field label="Full name" htmlFor="reg-name" required>
          <input
            id="reg-name"
            className={inputClass}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </Field>
        <Field label="Email" htmlFor="reg-email" required>
          <input
            id="reg-email"
            type="email"
            className={inputClass}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" htmlFor="reg-password" hint="At least 8 characters." required>
          <div className="relative">
            <input
              id="reg-password"
              type={showPw ? 'text' : 'password'}
              className={`${inputClass} pr-16`}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
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
        <Field label="Confirm password" htmlFor="reg-confirm" required>
          <input
            id="reg-confirm"
            type={showPw ? 'text' : 'password'}
            className={inputClass}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </Field>
        {error && <p role="alert" className="text-sm text-[#B3261E]">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">Create account</Button>
        <p className="text-center text-sm text-muted">
          Already have an account? <Link to="/login" className="text-brand-900 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}