import { NavLink, Outlet, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AdminOutletContext } from '../components/Guards';

interface NavItem {
  to: string;
  label: string;
  perm: string;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/admin',                label: 'Dashboard',     perm: 'bookings.read', end: true },
  { to: '/admin/reception',      label: 'Reception',     perm: 'reception.operate' },
  { to: '/admin/beds',           label: 'Bed inventory', perm: 'inventory.read' },
  { to: '/admin/bookings',       label: 'Bookings',      perm: 'bookings.read' },
  { to: '/admin/rates',          label: 'Rates',         perm: 'rates.read' },
  { to: '/admin/settings',       label: 'Settings',      perm: 'settings.manage' },
];

export function AdminLayout() {
  const { permissions } = useOutletContext<AdminOutletContext>();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const visible = NAV.filter((n) => permissions.includes(n.perm));

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/admin" className="flex items-center gap-2">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-md bg-brand-900 text-sm font-semibold text-white">
              SB
            </span>
            <span className="text-base font-semibold text-ink">Admin Control Room</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-muted hover:text-ink">Public site</Link>
            <span className="hidden text-muted sm:inline">{email}</span>
            <button onClick={signOut} className="rounded-input border border-line bg-surface px-3 py-1.5 hover:bg-bg">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <nav aria-label="Admin" className="rounded-card border border-line bg-surface p-2 md:sticky md:top-6 md:self-start">
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {visible.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block rounded-input px-3 py-2 text-sm ${
                      isActive ? 'bg-brand-900 text-white' : 'text-ink hover:bg-bg'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0">
          <Outlet context={{ permissions } satisfies AdminOutletContext} />
        </main>
      </div>
    </div>
  );
}