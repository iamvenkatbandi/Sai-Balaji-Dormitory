import { supabase } from './supabase';
import type {
  AdminBookingRow, AdminDashboardMetrics, BedDetail, BedRow, BedStatus,
  BookingStatus, ProductType, RatePlanVersion,
} from './database.types';

async function rpcError(err: unknown): Promise<Error> {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message) return new Error(o.message);
  }
  return new Error('An unexpected error occurred.');
}

export async function getMyPermissions(): Promise<{ permissions: string[]; error: Error | null }> {
  const { data, error } = await supabase.rpc('my_permissions');
  if (error) {
    const message = (error as { message?: string }).message ?? String(error);
    return { permissions: [], error: new Error(message) };
  }
  const perms = Array.isArray(data) ? (data as string[]) : [];
  return { permissions: perms, error: null };
}

export async function getDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const { data, error } = await supabase.rpc('admin_dashboard_metrics');
  if (error) throw await rpcError(error);
  return data as AdminDashboardMetrics;
}

export async function getBedsStatus(filters: {
  section?: 'AC' | 'NON_AC' | null;
  status?: BedStatus | null;
  search?: string | null;
}): Promise<BedRow[]> {
  const { data, error } = await supabase.rpc('admin_beds_status', {
    p_section_code: filters.section ?? null,
    p_status_filter: filters.status ?? null,
    p_search: filters.search ?? null,
  });
  if (error) throw await rpcError(error);
  return (data ?? []) as BedRow[];
}

export async function getBedDetail(spaceId: string): Promise<BedDetail> {
  const { data, error } = await supabase.rpc('admin_bed_detail', { p_space_id: spaceId });
  if (error) throw await rpcError(error);
  return data as BedDetail;
}

export async function blockBed(
  spaceId: string, fromIso: string, toIso: string, reason: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_block_bed', {
    p_space_id: spaceId, p_from: fromIso, p_to: toIso, p_reason: reason,
  });
  if (error) throw await rpcError(error);
  return data as string;
}

export async function releaseBlock(blockId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_release_block', { p_block_id: blockId });
  if (error) throw await rpcError(error);
}

export async function checkInBooking(bookingId: string): Promise<{ status: BookingStatus }> {
  const { data, error } = await supabase.rpc('admin_check_in', { p_booking_id: bookingId });
  if (error) throw await rpcError(error);
  return data as { status: BookingStatus };
}

export async function checkOutBooking(bookingId: string): Promise<{ status: BookingStatus }> {
  const { data, error } = await supabase.rpc('admin_check_out', { p_booking_id: bookingId });
  if (error) throw await rpcError(error);
  return data as { status: BookingStatus };
}

export async function getBookingsList(filters: {
  status?: string | null;
  search?: string | null;
  limit?: number;
}): Promise<AdminBookingRow[]> {
  const { data, error } = await supabase.rpc('admin_bookings_list', {
    p_status: filters.status ?? null,
    p_search: filters.search ?? null,
    p_limit: filters.limit ?? 50,
  });
  if (error) throw await rpcError(error);
  return (data ?? []) as AdminBookingRow[];
}

export async function getBookingDetail(id: string): Promise<{
  booking: Record<string, unknown>;
  guests: Array<Record<string, unknown>>;
  payments: Array<{ id: string; amount_paise: number; status: string; gateway_payment_id: string | null; created_at: string }>;
  spaces: Array<{ space_id: string; code: string; position: string }>;
}> {
  const { data, error } = await supabase.rpc('admin_booking_detail', { p_booking_id: id });
  if (error) throw await rpcError(error);
  return data as any;
}

export interface RatePlanWithVersion {
  id: string;
  product_type: ProductType;
  name: string;
  is_active: boolean;
  current_version: RatePlanVersion | null;
  next_version_number: number;
}

export async function getRatePlans(): Promise<RatePlanWithVersion[]> {
  const { data: plans, error: pErr } = await supabase
    .from('rate_plans')
    .select('id, product_type, name, is_active')
    .order('product_type');
  if (pErr) throw await rpcError(pErr);

  const { data: versions, error: vErr } = await supabase
    .from('rate_plan_versions')
    .select('*')
    .order('version', { ascending: false });
  if (vErr) throw await rpcError(vErr);

  return (plans ?? []).map((p: any) => {
    const planVersions = (versions ?? []).filter((v: any) => v.rate_plan_id === p.id);
    const current = planVersions.find((v: any) => v.is_published) ?? null;
    const maxVersion = planVersions.reduce((m: number, v: any) => Math.max(m, v.version ?? 0), 0);
    return {
      id: p.id, product_type: p.product_type, name: p.name, is_active: p.is_active,
      current_version: current, next_version_number: maxVersion + 1,
    };
  });
}

export async function publishRateVersion(planId: string, input: {
  hourly_rate_paise: number | null;
  extra_hour_rate_paise: number | null;
  overnight_rate_paise: number | null;
  overnight_minutes: number | null;
  extended_stay_rate_paise: number | null;
  extended_stay_minutes: number | null;
  min_booking_minutes: number;
  deposit_paise: number | null;
}): Promise<void> {
  const { data: existing } = await supabase
    .from('rate_plan_versions')
    .select('version').eq('rate_plan_id', planId)
    .order('version', { ascending: false }).limit(1).maybeSingle();

  const nextVersion = (existing?.version ?? 0) + 1;
  const { data: { user } } = await supabase.auth.getUser();

  // Close the currently published version
  const { error: uErr } = await supabase
    .from('rate_plan_versions')
    .update({ effective_to: new Date().toISOString() })
    .eq('rate_plan_id', planId)
    .eq('is_published', true)
    .is('effective_to', null);
  if (uErr) throw await rpcError(uErr);

  const { error: iErr } = await supabase.from('rate_plan_versions').insert({
    rate_plan_id: planId,
    version: nextVersion,
    effective_from: new Date().toISOString(),
    ...input,
    is_published: true,
    published_by: user?.id ?? null,
    published_at: new Date().toISOString(),
  });
  if (iErr) throw await rpcError(iErr);
}

export async function updateContact(input: {
  address_line: string | null; locality: string | null; region: string | null;
  postal_code: string | null; phone: string | null; email: string | null;
  map_url: string | null;
}): Promise<void> {
  const { error } = await supabase.from('property_contact').update(input).eq('property_id', input.phone === undefined ? '' : (await getPropertyId()));
  if (error) throw await rpcError(error);
}

export async function getPropertyId(): Promise<string> {
  const { data } = await supabase.from('property_contact').select('property_id').maybeSingle();
  return (data as any)?.property_id ?? '';
}

export async function updateSettings(input: {
  cleaning_buffer_minutes: number;
  booking_horizon_days: number;
  max_stay_days: number;
  min_hourly_minutes: number;
  overstay_grace_minutes: number;
  deposits_enabled: boolean;
  enquiries_enabled: boolean;
}): Promise<void> {
  const id = await getPropertyId();
  const { error } = await supabase.from('property_settings').update(input).eq('property_id', id);
  if (error) throw await rpcError(error);
}

export interface ProposedSpace {
  space_id: string;
  code: string;
  product_type: ProductType;
  bed_position: string;
  rationale: string;
}

export async function proposeWomenReserved(
  acTarget = 10,
  naBunkTarget = 30,
): Promise<ProposedSpace[]> {
  const { data, error } = await supabase.rpc('admin_propose_women_reserved', {
    p_ac_target: acTarget,
    p_na_bunk_target: naBunkTarget,
  });
  if (error) throw await rpcError(error);
  return (data ?? []) as ProposedSpace[];
}

export async function applyWomenReserved(spaceIds: string[]): Promise<number> {
  const { data, error } = await supabase.rpc('admin_apply_women_reserved', {
    p_space_ids: spaceIds,
  });
  if (error) throw await rpcError(error);
  return data as number;
}

export async function revokeWomenReserved(spaceIds: string[]): Promise<number> {
  const { data, error } = await supabase.rpc('admin_revoke_women_reserved', {
    p_space_ids: spaceIds,
  });
  if (error) throw await rpcError(error);
  return data as number;
}