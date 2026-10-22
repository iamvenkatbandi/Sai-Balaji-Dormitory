import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getMyPermissions } from '../lib/admin';
import { Spinner } from './Spinner';

export interface AdminOutletContext {
  permissions: string[];
}

function useAuthCheck(role: 'guest' | 'staff' | 'admin') {
  const [state, setState] = useState<'checking' | 'no-user' | 'no-role' | 'ok'>('checking');
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) { setState('no-user'); return; }

        if (role === 'guest') { setState('ok'); return; }

        const perms = await getMyPermissions();
        if (cancelled) return;
        if (perms.length === 0) { setState('no-role'); return; }
        setPermissions(perms);
        setState('ok');
      } catch {
        if (!cancelled) setState('no-user');
      }
    })();
    return () => { cancelled = true; };
  }, [role]);

  return { state, permissions };
}

function AccessPending() {
  return (
    <div className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-semibold text-ink">Access pending</h1>
      <p className="mt-2 text-sm text-muted">
        Your account is signed in, but no staff role has been granted yet. Contact the property
        administrator to request access.
      </p>
    </div>
  );
}

export function GuestGuard() {
  const { state } = useAuthCheck('guest');
  const location = useLocation();
  if (state === 'checking') return <Spinner label="Checking access…" />;
  if (state === 'no-user') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <Outlet />;
}

export function AdminGuard() {
  const { state, permissions } = useAuthCheck('admin');
  const location = useLocation();
  if (state === 'checking') return <Spinner label="Loading admin…" />;
  if (state === 'no-user') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (state === 'no-role') return <AccessPending />;
  return <Outlet context={{ permissions } satisfies AdminOutletContext} />;
}

export function StaffGuard({ children }: { children: ReactNode }) {
  const { state } = useAuthCheck('staff');
  const location = useLocation();
  if (state === 'checking') return <Spinner label="Checking access…" />;
  if (state === 'no-user') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (state === 'no-role') return <AccessPending />;
  return <>{children}</>;
}