import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Create account</h1>
      <p className="mt-1 text-sm text-muted">
        An account is required to hold a confirmed booking and view it in your portal.
      </p>
      {sent ? (
        <div className="mt-6 rounded-card border border-line bg-surface p-6">
          <p className="text-sm text-ink">Check your email to confirm your account, then sign in.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-card border border-line bg-surface p-6">
          <Field label="Full name" htmlFor="reg-name" required>
            <input id="reg-name" className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Email" htmlFor="reg-email" required>
            <input id="reg-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password" htmlFor="reg-password" hint="At least 8 characters." required>
            <input id="reg-password" type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </Field>
          {error && <p role="alert" className="text-sm text-[#B3261E]">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Create account</Button>
          <p className="text-center text-sm text-muted">
            Already have an account? <Link to="/login" className="text-brand-900 hover:underline">Sign in</Link>
          </p>
        </form>
      )}
    </div>
  );
}