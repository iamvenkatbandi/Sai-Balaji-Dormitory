import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const NAV = [
  { to: '/portal', label: 'Dashboard', end: true },
  { to: '/portal/bookings', label: 'My bookings' },
  { to: '/portal/accommodation', label: 'My accommodation' },
  { to: '/portal/payments', label: 'Payments' },
  { to: '/portal/support', label: 'Support' },
  { to: '/portal/profile', label: 'Profile' },
];

interface UserInfo {
  email: string;
  fullName: string | null;
}

export function PortalLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load user data (email from auth, name from profiles)
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        setUser({
          email: user.email ?? '',
          fullName: profile?.full_name ?? null,
        });
      }
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';
  const displayName = user?.fullName || 'Guest';

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-md bg-brand-900 text-sm font-semibold text-white">
              SB
            </span>
            <span className="text-base font-semibold text-ink">Sai Balaji Dormitory</span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Profile Dropdown Container */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-sm font-bold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                aria-label="Account menu"
              >
                {initial}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-card border border-line bg-surface shadow-overlay">
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-sm font-semibold text-ink">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-muted" title={user?.email}>
                      {user?.email}
                    </p>
                  </div>
                  <div className="p-1">
                    <Link
                      to="/portal/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block w-full rounded-input px-3 py-2 text-left text-sm text-ink hover:bg-bg"
                    >
                      Edit profile
                    </Link>
                    <button
                      onClick={signOut}
                      className="block w-full rounded-input px-3 py-2 text-left text-sm text-[#B3261E] hover:bg-[#FBEAE8]"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[220px_1fr]">
        <nav aria-label="Portal" className="rounded-card border border-line bg-surface p-2 md:sticky md:top-24 md:self-start">
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {NAV.map((item) => (
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}