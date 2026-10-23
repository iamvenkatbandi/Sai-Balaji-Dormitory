import { useState } from 'react';
import { useAsync } from '../../lib/useAsync';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { formatDateTime } from '../../lib/format';

interface Enquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'new' | 'read' | 'resolved';
  created_at: string;
}

async function loadEnquiries(): Promise<Enquiry[]> {
  const { data, error } = await supabase
    .from('enquiries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Enquiry[];
}

export function AdminEnquiriesPage() {
  const enquiries = useAsync(loadEnquiries, []);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: Enquiry['status']) {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('enquiries').update({ status }).eq('id', id);
      if (error) throw error;
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setUpdatingId(null);
    }
  }

  if (enquiries.status === 'loading') return <Spinner />;
  if (enquiries.status === 'error') return <ErrorState message={enquiries.error.message} />;

  const newCount = enquiries.data.filter((e) => e.status === 'new').length;

  return (
    <>
      <PageHeader 
        eyebrow="Operations" 
        title="Contact Enquiries" 
        intro={`You have ${newCount} unread message${newCount === 1 ? '' : 's'} from the website contact form.`} 
      />

      {enquiries.data.length === 0 ? (
        <EmptyState title="No enquiries yet." body="Messages sent from the Contact page will appear here." />
      ) : (
        <div className="space-y-4">
          {enquiries.data.map((enq) => (
            <div 
              key={enq.id} 
              className={`rounded-card border p-5 shadow-card ${
                enq.status === 'new' ? 'border-[#E8B86D] bg-[#FBF0DC]/20' : 'border-line bg-surface'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink">{enq.name}</h3>
                    {enq.status === 'new' && (
                      <span className="rounded-full bg-[#E8B86D] px-2 py-0.5 text-[10px] font-bold text-ink uppercase tracking-wider">New</span>
                    )}
                    {enq.status === 'resolved' && (
                      <span className="rounded-full bg-[#E6F4ED] px-2 py-0.5 text-[10px] font-bold text-[#2E7D5B] uppercase tracking-wider">Resolved</span>
                    )}
                  </div>
                  <a href={`mailto:${enq.email}`} className="text-sm text-brand-700 hover:underline">
                    {enq.email}
                  </a>
                </div>
                <p className="text-xs text-muted">{formatDateTime(enq.created_at)}</p>
              </div>

              <div className="mt-4 rounded-input border border-line bg-bg p-3 text-sm text-ink whitespace-pre-wrap">
                {enq.message}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a 
                  href={`mailto:${enq.email}?subject=Re: Your enquiry to Sai Balaji Dormitory`}
                  className="inline-flex items-center justify-center rounded-input bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition"
                >
                  Reply via Email
                </a>
                
                {enq.status !== 'resolved' && (
                  <Button 
                    variant="secondary" 
                    onClick={() => updateStatus(enq.id, 'resolved')}
                    loading={updatingId === enq.id}
                  >
                    Mark as Resolved
                  </Button>
                )}
                
                {enq.status === 'new' && (
                  <Button 
                    variant="ghost" 
                    onClick={() => updateStatus(enq.id, 'read')}
                    loading={updatingId === enq.id}
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}