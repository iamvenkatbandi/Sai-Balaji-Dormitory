import { supabase } from './supabase';
import type { GuestGender, ProductType, BookingStatus } from './database.types';

export interface QuoteLineItem {
  label: string;
  detail?: string;
  amountPaise: number;
}

export interface QuoteResponse {
  total_paise: number;
  line_items: QuoteLineItem[];
  rate_plan_version_id: string;
  min_booking_minutes: number | null;
  section_code: 'AC' | 'NON_AC';
}

export interface HoldSuccess {
  ok: true;
  booking_id: string;
  reference: string;
  expires_at: string;
  total_paise: number;
  quote: QuoteResponse;
}

export interface HoldFailure {
  ok: false;
  error: string;
  detail?: string;
}

export type HoldResponse = HoldSuccess | HoldFailure;

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message) return new Error(o.message);
  }
  return new Error('An unexpected error occurred.');
}

export async function getQuote(
  product: ProductType,
  startsAt: string,
  endsAt: string,
): Promise<QuoteResponse> {
  const { data, error } = await supabase.rpc('booking_quote', {
    p_product_type: product,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
  });
  if (error) throw toError(error);
  if (!data) throw new Error('No quote was returned.');
  return data as QuoteResponse;
}

export async function createHold(input: {
  product: ProductType;
  startsAt: string;
  endsAt: string;
  guestName: string;
  guestGender: GuestGender;
  contactEmail: string;
  contactPhone: string | null;
}): Promise<HoldResponse> {
  const { data, error } = await supabase.rpc('create_booking_hold', {
    p_product_type: input.product,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_primary_guest_name: input.guestName,
    p_primary_guest_gender: input.guestGender,
    p_contact_email: input.contactEmail,
    p_contact_phone: input.contactPhone,
  });
  if (error) throw toError(error);
  return data as HoldResponse;
}

export async function devConfirmBooking(bookingId: string): Promise<BookingStatus> {
  const { data, error } = await supabase.rpc('dev_confirm_booking', {
    p_booking_id: bookingId,
  });
  if (error) throw toError(error);
  return (data as { status: BookingStatus }).status;
}