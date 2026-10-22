import { supabase } from './supabase';
import type {
  PropertyContact, PropertySettings, RatePlan, RatePlanVersion,
  FamilyPolicy, CancellationPolicy, BookingStatusRow, ProductType,
} from './database.types';

export async function getContact(): Promise<PropertyContact | null> {
  const { data, error } = await supabase.from('property_contact').select('*').maybeSingle();
  if (error) throw error;
  return (data as PropertyContact | null) ?? null;
}

export async function getSettings(): Promise<PropertySettings | null> {
  const { data, error } = await supabase.from('property_settings').select('*').maybeSingle();
  if (error) throw error;
  return (data as PropertySettings | null) ?? null;
}

export interface PlanWithVersion { plan: RatePlan; published: RatePlanVersion | null; }

export async function getPublishedRatePlans(): Promise<PlanWithVersion[]> {
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
}

export async function getActiveFamilyPolicy(): Promise<FamilyPolicy | null> {
  const { data, error } = await supabase
    .from('family_policies')
    .select('id,is_published,effective_from')
    .eq('is_published', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as FamilyPolicy | null) ?? null;
}

export async function getActiveCancellationPolicy(): Promise<CancellationPolicy | null> {
  const { data, error } = await supabase
    .from('cancellation_policies')
    .select('*')
    .eq('is_published', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CancellationPolicy | null) ?? null;
}

export async function getCancellationPolicyDraft(): Promise<CancellationPolicy | null> {
  const { data, error } = await supabase
    .from('cancellation_policies')
    .select('*')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CancellationPolicy | null) ?? null;
}

export async function lookupBooking(
  reference: string, contact: string,
): Promise<BookingStatusRow | null> {
  const { data, error } = await supabase.rpc('public_booking_status', {
    p_reference: reference.trim().toUpperCase(),
    p_contact: contact.trim().toLowerCase(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as BookingStatusRow | null) ?? null;
}

export async function publicAvailability(
  sectionCode: 'AC' | 'NON_AC', fromIso: string, toIso: string, productType: ProductType,
): Promise<{ free: number; total: number }> {
  const { data, error } = await supabase.rpc('public_availability', {
    p_section_code: sectionCode,
    p_from: fromIso,
    p_to: toIso,
    p_product_type: productType,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { free: Number(row?.free_count ?? 0), total: Number(row?.total_count ?? 0) };
}