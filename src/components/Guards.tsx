import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getMyPermissions } from '../lib/admin';
import { Spinner } from './Spinner';

export interface AdminOutletContext {
  permissions: string[];
}

type CheckState =
  | { kind: 'checking' }
  | { kind: 'no-user' }
  | { kind: 'no-role' }
  | { kind: 'rpc-error'; message: string }
  | { kind: 'ok'; permissions: string[] };

function useAuthCheck(role: 'guest' | 'staff' | 'admin'): CheckState {
  const [state, setState] = useState<CheckState>({ kind: 'checking' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) { setState({ kind: 'no-user' }); return; }

        if (role === 'guest') {
          setState({ kind: 'ok', permissions: [] });
          return;
        }

        const permissions = await getMyPermissions();
        if (cancelled) return;

        if (permissions.length === 0) {
          setState({ kind: 'no-role' });
          return;
        }
        setState({ kind: 'ok', permissions });
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: 'rpc-error',
            message: err instanceof Error ? err.message : 'Unexpected failure checking access.',
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [role]);

  return state;
}

function AccessPending() {
  return (
    <div className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-semibold text-ink">Access pending</h1>
      <p className="mt-2 text-sm text-muted">
        Your account is signed in, but no staff role has been granted yet.
      </p>
      <div className="mt-6 rounded-card border border-line bg-surface p-4 text-sm">
        <p className="font-medium text-ink">How to grant yourself a role</p>
        <p className="mt-2 text-muted">
          In the Supabase SQL Editor, run:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-input bg-bg p-3 font-mono text-xs text-ink">{`insert into user_roles (user_id, role_id)
values (
  (select id from auth.users where email = 'YOUR_EMAIL'),
  (select id from roles where code = 'super_admin')
)
on conflict do nothing;`}</pre>
        <p className="mt-2 text-muted">
          Then sign out and sign back in.
        </p>
      </div>
    </div>
  );
}

function RpcError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-semibold text-ink">Admin check failed</h1>
      <p className="mt-2 text-sm text-muted">
        The browser could not verify your admin permissions. This usually means a migration
        has not been applied, or the permissions function is not granted to signed-in users.
      </p>
      <div role="alert" className="mt-4 rounded-card border border-[#FBEAE8] bg-[#FBEAE8] p-4 text-sm text-[#7A1A15]">
        <p className="font-medium">Error reported by the database</p>
        <p className="mt-1 font-mono text-xs">{message}</p>
      </div>
      <p className="mt-4 text-sm text-muted">
        Common fixes:
      </p>
      <ul className="mt-2 list-disc pl-6 text-sm text-muted">
        <li>Confirm migrations <code className="font-mono">0019</code> and <code className="font-mono">0020</code> (or <code className="font-mono">0021</code>) ran without errors.</li>
        <li>Confirm <code className="font-mono">my_permissions()</code> exists in the SQL editor.</li>
        <li>Check that <code className="font-mono">authenticated</code> has execute on <code className="font-mono">my_permissions()</code>.</li>
      </ul>
      <div className="mt-6">
        <Link to="/" className="text-sm text-brand-900 hover:underline">Return to home →</Link>
      </div>
    </div>
  );
}

export function GuestGuard() {
  const state = useAuthCheck('guest');
  const location = useLocation();
  if (state.kind === 'checking') return <Spinner label="Checking access…" />;
  if (state.kind === 'no-user') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <Outlet />;
}

export function AdminGuard() {
  const state = useAuthCheck('admin');
  const location = useLocation();

  if (state.kind === 'checking') return <Spinner label="Loading admin…" />;
  if (state.kind === 'no-user') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (state.kind === 'no-role') return <AccessPending />;
  if (state.kind === 'rpc-error') return <RpcError message={state.message} />;
  return <Outlet context={{ permissions: state.permissions } satisfies AdminOutletContext} />;
}

export function StaffGuard({ children }: { children: ReactNode }) {
  const state = useAuthCheck('staff');
  const location = useLocation();

  if (state.kind === 'checking') return <Spinner label="Checking access…" />;
  if (state.kind === 'no-user') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (state.kind === 'no-role') return <AccessPending />;
  if (state.kind === 'rpc-error') return <RpcError message={state.message} />;
  return <>{children}</>;
}