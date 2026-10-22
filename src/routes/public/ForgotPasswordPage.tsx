import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Reset password</h1>
      <p className="mt-1 text-sm text-muted">We'll email a reset link if the address is registered.</p>
      {sent ? (
        <div className="mt-6 rounded-card border border-line bg-surface p-6">
          <p className="text-sm text-ink">Check your inbox for the reset link.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-card border border-line bg-surface p-6">
          <Field label="Email" htmlFor="fp-email" required>
            <input id="fp-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          {error && <p role="alert" className="text-sm text-[#B3261E]">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
        </form>
      )}
    </div>
  );
}