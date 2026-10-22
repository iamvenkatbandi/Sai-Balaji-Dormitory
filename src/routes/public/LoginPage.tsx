import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    const next = params.get('next') || '/portal';
    navigate(next, { replace: true });
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-muted">
        Access your bookings, payments and account.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-card border border-line bg-surface p-6">
        <Field label="Email" htmlFor="login-email" required>
          <input id="login-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" htmlFor="login-password" required>
          <input id="login-password" type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p role="alert" className="text-sm text-[#B3261E]">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">Sign in</Button>
        <div className="flex justify-between text-sm">
          <Link to="/forgot-password" className="text-brand-900 hover:underline">Forgot password?</Link>
          <Link to="/register" className="text-brand-900 hover:underline">Create account</Link>
        </div>
      </form>
    </div>
  );
}