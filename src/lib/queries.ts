import { supabase, isSupabaseConfigured } from './supabase';
import type {
  PropertyContact, PropertySettings, RatePlan, RatePlanVersion,
  FamilyPolicy, CancellationPolicy, BookingStatusRow, ProductType,
} from './database.types';

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Database not configured. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server (npm run dev).'
    );
  }
}

function handleFetchError(err: unknown): never {
  const e = err as any;
  if (e?.message === 'Failed to fetch') {
    throw new Error(
      'Could not connect to the database. If you are running Supabase locally, make sure it is running (npx supabase start). If using the cloud, check your internet connection.'
    );
  }
  throw err;
}

export async function getContact(): Promise<PropertyContact | null> {
  assertConfigured();
  try {
    const { data, error } = await supabase.from('property_contact').select('*').maybeSingle();
    if (error) throw error;
    return (data as PropertyContact | null) ?? null;
  } catch (err) {
    handleFetchError(err);
  }
}

export async function getSettings(): Promise<PropertySettings | null> {
  assertConfigured();
  try {
    const { data, error } = await supabase.from('property_settings').select('*').maybeSingle();
    if (error) throw error;
    return (data as PropertySettings | null) ?? null;
  } catch (err) {
    handleFetchError(err);
  }
}

export interface PlanWithVersion { plan: RatePlan; published: RatePlanVersion | null; }

export async function getPublishedRatePlans(): Promise<PlanWithVersion[]> {
  assertConfigured();
  try {
    const { data, error } = await supabase
      .from('rate_plans')
      .select('id,product_type,name,is_active,versions:rate_plan_versions(*)')
      .eq('is_active', true);
    if (error) throw error;
    return (data ?? []).map((row: any) => {
      const versions: RatePlanVersion[] = row.versions ?? [];
      const published = versions.find((v) => v.is_published) ?? null;
      return {
        plan: { id: row.id, product_type: row.product_type, name: row.name, is_active: row.is_active },
        published,
      };
    });
  } catch (err) {
    handleFetchError(err);
  }
}

export async function getActiveFamilyPolicy(): Promise<FamilyPolicy | null> {
  assertConfigured();
  try {
    const { data, error } = await supabase
      .from('family_policies')
      .select('id,is_published,effective_from')
      .eq('is_published', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as FamilyPolicy | null) ?? null;
  } catch (err) {
    handleFetchError(err);
  }
}

export async function getActiveCancellationPolicy(): Promise<CancellationPolicy | null> {
  assertConfigured();
  try {
    const { data, error } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('is_published', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as CancellationPolicy | null) ?? null;
  } catch (err) {
    handleFetchError(err);
  }
}

export async function getCancellationPolicyDraft(): Promise<CancellationPolicy | null> {
  assertConfigured();
  try {
    const { data, error } = await supabase
      .from('cancellation_policies')
      .select('*')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as CancellationPolicy | null) ?? null;
  } catch (err) {
    handleFetchError(err);
  }
}

export async function lookupBooking(
  reference: string, contact: string,
): Promise<BookingStatusRow | null> {
  assertConfigured();
  try {
    const { data, error } = await supabase.rpc('public_booking_status', {
      p_reference: reference.trim().toUpperCase(),
      p_contact: contact.trim().toLowerCase(),
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return (row as BookingStatusRow | null) ?? null;
  } catch (err) {
    handleFetchError(err);
  }
}

export async function publicAvailability(
  sectionCode: 'AC' | 'NON_AC', fromIso: string, toIso: string, productType: ProductType,
): Promise<{ free: number; total: number }> {
  assertConfigured();
  try {
    const { data, error } = await supabase.rpc('public_availability', {
      p_section_code: sectionCode,
      p_from: fromIso,
      p_to: toIso,
      p_product_type: productType,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { free: Number(row?.free_count ?? 0), total: Number(row?.total_count ?? 0) };
  } catch (err) {
    handleFetchError(err);
  }
}

export interface ReceiptData {
  booking: {
    id: string;
    reference: string;
    status: string;
    starts_at: string;
    ends_at: string;
    total_paise: number;
    product_type: string;
    primary_contact_email: string | null;
    primary_contact_phone: string | null;
    created_at: string;
  };
  guest_name: string;
  payments: Array<{
    id: string;
    amount_paise: number;
    status: string;
    created_at: string;
  }>;
  property: {
    name: string;
    address_line: string | null;
    phone: string | null;
    email: string | null;
  };
}

export async function getReceiptData(bookingId: string): Promise<ReceiptData> {
  const { data, error } = await supabase.rpc('get_public_receipt', {
    p_booking_id: bookingId,
  });
  if (error) throw error;
  return data as ReceiptData;
}