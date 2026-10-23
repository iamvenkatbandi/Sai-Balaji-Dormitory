import { useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { listStaff, listAllRoles, findUserByEmail, assignRole, revokeRole } from '../../lib/admin';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Field, inputClass } from '../../components/Field';
import { formatDateTime } from '../../lib/format';

export function AdminStaffPage() {
  const staff = useAsync(listStaff, []);
  const roles = useAsync(listAllRoles, []);
  const [target, setTarget] = useState<{ user_id: string; email: string; full_name: string | null } | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [lookupErr, setLookupErr] = useState<string | null>(null);

  if (staff.status === 'loading' || roles.status === 'loading') return <Spinner />;
  if (staff.status === 'error') return <ErrorState message={staff.error.message} />;
  if (roles.status === 'error') return <ErrorState message={roles.error.message} />;

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupErr(null);
    try {
      const u = await findUserByEmail(searchEmail.trim());
      if (!u) { 
        setLookupErr('No registered user has that email. They must sign up at /register first.'); 
        return; 
      }
      setTarget(u);
    } catch (e) { 
      setLookupErr(e instanceof Error ? e.message : 'Lookup failed'); 
    }
  }

  async function toggleRole(userId: string, roleCode: string, has: boolean) {
    try {
      if (has) await revokeRole(userId, roleCode);
      else await assignRole(userId, roleCode);
      window.location.reload();
    } catch (e) { 
      alert(e instanceof Error ? e.message : 'Failed'); 
    }
  }

  return (
    <>
      <PageHeader eyebrow="Administration" title="Staff & roles" />

      <SectionCard title="Add a staff member" subtitle="The user must have registered at /register first">
        <form onSubmit={lookup} className="flex flex-wrap items-end gap-3">
          <Field label="Email" htmlFor="staff-email" required>
            <input 
              id="staff-email" 
              type="email" 
              className={inputClass} 
              value={searchEmail} 
              onChange={(e) => setSearchEmail(e.target.value)} 
              required 
            />
          </Field>
          <Button type="submit" variant="secondary">Find user</Button>
        </form>
        
        {lookupErr && <p role="alert" className="mt-3 text-sm text-[#B3261E]">{lookupErr}</p>}

        {target && (
          <div className="mt-4 rounded-input border border-line bg-bg p-3">
            <p className="text-sm text-ink">{target.full_name ?? '—'} · {target.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {roles.data.map((r) => (
                <button 
                  key={r.code} 
                  onClick={() => toggleRole(target.user_id, r.code, false)} 
                  className="rounded-full border border-brand-900 bg-brand-900 px-3 py-1 text-xs text-white hover:bg-brand-700"
                >
                  Grant {r.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Staff members" className="mt-6">
        {staff.data.length === 0 ? (
          <EmptyState title="No staff members yet." body="Add a role to a registered user to grant access." />
        ) : (
          <ul className="space-y-3">
            {staff.data.map((s) => (
              <li key={s.user_id} className="rounded-input border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-ink">{s.full_name ?? '—'}</p>
                    <p className="text-xs text-muted">{s.email ?? '—'}</p>
                    {s.granted_at && <p className="text-xs text-muted">Last granted {formatDateTime(s.granted_at)}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.roles.length === 0 && <span className="text-xs text-muted">No roles</span>}
                    {s.roles.map((r) => (
                      <span key={r} className="flex items-center gap-1 rounded-full border border-line bg-bg px-2 py-0.5 text-xs text-ink">
                        {r.replaceAll('_', ' ')}
                        <button 
                          onClick={() => toggleRole(s.user_id, r, true)} 
                          className="text-[#B3261E] hover:underline"
                          aria-label={`Revoke ${r}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}