import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

const LINKS = [
  { to: '/accommodation/ac', label: 'AC Hall' },
  { to: '/accommodation/non-ac', label: 'Non-AC Hall' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/facilities', label: 'Facilities' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userInitial = session?.user?.email ? session.user.email.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-md bg-brand-900 text-sm font-semibold text-white">
            SB
          </span>
          <span className="text-base font-semibold text-ink">Sai Balaji Dormitory</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-sm ${isActive ? 'font-medium text-brand-900' : 'text-muted hover:text-ink'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-bg" />
          ) : session ? (
            <Link
              to="/portal"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-sm font-bold text-white hover:bg-brand-700 transition"
              title="Profile"
              aria-label="Profile"
            >
              {userInitial}
            </Link>
          ) : (
            <Link to="/login" className="rounded-input px-4 py-2 text-sm font-medium text-ink border border-line hover:bg-bg transition">
              Sign in
            </Link>
          )}
        </div>

        <button
          className="rounded-input p-2 text-ink lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Toggle navigation</span>
          <span aria-hidden>☰</span>
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-line bg-surface px-4 py-3 lg:hidden">
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-input px-3 py-2 text-sm text-ink hover:bg-bg"
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-line pt-4 flex items-center justify-end">
            {session ? (
              <Link
                to="/portal"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-900 text-sm font-bold text-white hover:bg-brand-700 transition"
                title="Profile"
                aria-label="Profile"
              >
                {userInitial}
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="w-full rounded-input border border-line px-3 py-2 text-center text-sm font-medium text-ink hover:bg-bg"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}