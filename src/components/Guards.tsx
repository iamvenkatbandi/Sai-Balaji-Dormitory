import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Spinner } from './Spinner';

type Role = 'guest' | 'staff' | 'admin';

function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'no-user' | 'user-lacks-role' | 'ok'>('checking');
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) { setState('no-user'); return; }
        if (role === 'guest') { setState('ok'); return; }
        // Role tables are populated in Phase 4. Until then, an authenticated
        // user hitting /staff or /admin sees a clear notice rather than a
        // redirect loop back to /login.
        setState('user-lacks-role');
      } catch {
        if (!cancelled) setState('no-user');
      }
    })();
    return () => { cancelled = true; };
  }, [role]);

  if (state === 'checking') return <Spinner label="Checking access…" />;
  if (state === 'no-user') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (state === 'user-lacks-role') {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <h1 className="text-2xl font-semibold text-ink">Access pending</h1>
        <p className="mt-2 text-sm text-muted">
          This section requires a staff or admin role. Role-based access is being configured in Phase 4.
          Contact the property administrator if you believe you should have access.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export const GuestGuard = ({ children }: { children: ReactNode }) => <Guard role="guest">{children}</Guard>;
export const StaffGuard = ({ children }: { children: ReactNode }) => <Guard role="staff">{children}</Guard>;
export const AdminGuard = ({ children }: { children: ReactNode }) => <Guard role="admin">{children}</Guard>;