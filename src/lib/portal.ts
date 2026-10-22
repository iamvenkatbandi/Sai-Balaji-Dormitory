import { supabase } from './supabase';
import type {
  BookingStatus, ExtensionRequest, ProductType,
  SupportTicket, SupportTicketMessage,
} from './database.types';

export interface MyBooking {
  id: string;
  reference: string;
  product_type: ProductType;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  total_paise: number | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  created_at: string;
}

export interface MyProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  marketing_opt_in: boolean;
  terms_accepted_at: string | null;
  is_staff: boolean;
  created_at: string;
  email_confirmed_at: string | null;
}

export interface MyPayment {
  id: string;
  booking_reference: string;
  amount_paise: number;
  status: string;
  gateway_payment_id: string | null;
  created_at: string;
  verified_at: string | null;
}

export interface MySpace {
  space_code: string;
  position: string;
  section_name: string;
  assigned_at: string;
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,email,phone,emergency_contact_name,emergency_contact_phone,marketing_opt_in,terms_accepted_at,is_staff,created_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, email_confirmed_at: user.email_confirmed_at ?? null } as MyProfile;
}

export async function updateMyProfile(input: {
  full_name: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  marketing_opt_in: boolean;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('profiles').update(input).eq('id', user.id);
  if (error) throw error;
}

export async function getMyBookings(): Promise<MyBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id,reference,product_type,status,starts_at,ends_at,total_paise,primary_contact_email,primary_contact_phone,created_at')
    .order('starts_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MyBooking[];
}

export async function getMyBooking(id: string): Promise<MyBooking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id,reference,product_type,status,starts_at,ends_at,total_paise,primary_contact_email,primary_contact_phone,created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as MyBooking | null) ?? null;
}

export async function getMySpace(bookingId: string): Promise<MySpace | null> {
  const { data, error } = await supabase.rpc('guest_my_booking_space', { p_booking_id: bookingId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as MySpace | null) ?? null;
}

export async function getMyPayments(): Promise<MyPayment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id,booking_id,amount_paise,status,gateway_payment_id,created_at,verified_at,bookings!inner(reference)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    booking_reference: row.bookings?.reference ?? '—',
    amount_paise: row.amount_paise,
    status: row.status,
    gateway_payment_id: row.gateway_payment_id,
    created_at: row.created_at,
    verified_at: row.verified_at,
  }));
}

export async function getMyTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupportTicket[];
}

export async function getMyTicket(id: string): Promise<{
  ticket: SupportTicket | null;
  messages: SupportTicketMessage[];
}> {
  const { data: ticket, error: tErr } = await supabase
    .from('support_tickets').select('*').eq('id', id).maybeSingle();
  if (tErr) throw tErr;
  if (!ticket) return { ticket: null, messages: [] };

  const { data: messages, error: mErr } = await supabase
    .from('support_ticket_messages').select('*')
    .eq('ticket_id', id).order('created_at');
  if (mErr) throw mErr;
  return { ticket: ticket as SupportTicket, messages: (messages ?? []) as SupportTicketMessage[] };
}

export async function createTicket(input: {
  category: SupportTicket['category'];
  subject: string;
  priority: SupportTicket['priority'];
  body: string;
  booking_id: string | null;
}): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      profile_id: user.id,
      booking_id: input.booking_id,
      category: input.category,
      subject: input.subject,
      priority: input.priority,
    })
    .select('id').single();
  if (error) throw error;

  const { error: msgErr } = await supabase.from('support_ticket_messages').insert({
    ticket_id: ticket.id,
    author_profile_id: user.id,
    author_kind: 'guest',
    body: input.body,
  });
  if (msgErr) throw msgErr;

  return ticket.id as string;
}

export async function addTicketMessage(ticketId: string, body: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('support_ticket_messages').insert({
    ticket_id: ticketId,
    author_profile_id: user.id,
    author_kind: 'guest',
    body,
  });
  if (error) throw error;
}

export async function getMyExtensionRequests(bookingId: string): Promise<ExtensionRequest[]> {
  const { data, error } = await supabase
    .from('extension_requests').select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExtensionRequest[];
}

export async function requestExtension(input: {
  booking_id: string;
  requested_new_end: string;
  reason: string | null;
}): Promise<{ id: string; extra_paise: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: qData, error: qErr } = await supabase.rpc('compute_extension_quote', {
    p_booking_id: input.booking_id,
    p_new_end: input.requested_new_end,
  });
  if (qErr) throw new Error(qErr.message ?? 'Could not compute extension quote');
  const extraPaise = Number((qData as any)?.extra_paise ?? 0);

  const { data, error } = await supabase.from('extension_requests').insert({
    booking_id: input.booking_id,
    requested_by_profile_id: user.id,
    requested_new_end: input.requested_new_end,
    reason: input.reason,
    quoted_extra_paise: extraPaise,
  }).select('id').single();
  if (error) throw error;

  return { id: data.id as string, extra_paise: extraPaise };
}

export async function cancelMyBooking(bookingId: string, reason: string | null): Promise<{
  refund_paise: number;
  refund_percent: number;
}> {
  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message ?? 'Cancellation failed');
  const row = data as any;
  if (!row?.ok) throw new Error(row?.error ?? 'Cancellation failed');
  return { refund_paise: row.refund_paise, refund_percent: row.refund_percent };
}

export async function claimBooking(reference: string, email: string): Promise<string> {
  const { data, error } = await supabase.rpc('claim_booking', {
    p_reference: reference,
    p_email: email,
  });
  if (error) throw new Error(error.message ?? 'Could not link booking');
  return data as string;
}