import { NavLink, Outlet, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AdminOutletContext } from '../components/Guards';

interface NavItem { to: string; label: string; perm: string; end?: boolean; }

const NAV: NavItem[] = [
  // Overview
  { to: '/admin',                 label: 'Dashboard',     perm: 'bookings.read', end: true },
  
  // Operations
  { to: '/admin/reception',       label: 'Reception',     perm: 'reception.operate' },
  { to: '/admin/beds',            label: 'Bed inventory', perm: 'inventory.read' },
  { to: '/admin/bookings',        label: 'Bookings',      perm: 'bookings.read' },
  { to: '/admin/cleaning',        label: 'Cleaning',      perm: 'reception.operate' },
  { to: '/admin/maintenance',     label: 'Maintenance',   perm: 'support.manage' },
  { to: '/admin/enquiries',       label: 'Enquiries',     perm: 'support.manage' },
  { to: '/admin/washrooms',       label: 'Washrooms',     perm: 'inventory.read' },
  
  // Finance & Analytics
  { to: '/admin/finance',         label: 'Finance',       perm: 'finance.read' },
  { to: '/admin/receipts',        label: 'Receipts',      perm: 'finance.read' },
  { to: '/admin/reports',         label: 'Reports',       perm: 'reports.read' },
  
  // Configuration
  { to: '/admin/rates',           label: 'Rates',         perm: 'rates.read' },
  { to: '/admin/policies',        label: 'Policies',      perm: 'policies.manage' },
  { to: '/admin/staff',           label: 'Staff & roles', perm: 'staff.manage' },
  { to: '/admin/settings',        label: 'Settings',      perm: 'settings.manage' },
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
    <div className="min-h-screen bg-bg print:bg-white">
      {/* Header - Hidden on Print */}
      <header className="print-hidden border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/admin" className="flex items-center gap-2">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-md bg-brand-900 text-sm font-semibold text-white">SB</span>
            <span className="text-base font-semibold text-ink">Admin Control Room</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-muted hover:text-ink transition">Public site</Link>
            <span className="hidden text-muted sm:inline">{email}</span>
            <button onClick={signOut} className="rounded-input border border-line bg-surface px-3 py-1.5 hover:bg-bg transition">Sign out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr] print:block print:max-w-none print:p-0">
        {/* Sidebar - Hidden on Print */}
        <nav aria-label="Admin" className="print-hidden rounded-card border border-line bg-surface p-2 md:sticky md:top-6 md:self-start">
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {visible.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end}
                  className={({ isActive }) =>
                    `block rounded-input px-3 py-2 text-sm transition ${
                      isActive ? 'bg-brand-900 text-white font-medium' : 'text-ink hover:bg-bg'
                    }`}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Main Content - Full width on Print */}
        <main className="min-w-0 print:block print:w-full">
          <Outlet context={{ permissions } satisfies AdminOutletContext} />
        </main>
      </div>
    </div>
  );
}