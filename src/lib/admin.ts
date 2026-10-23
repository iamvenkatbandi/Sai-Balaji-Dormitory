import { supabase } from './supabase';
import type {
  AdminBookingRow, AdminDashboardMetrics, BedDetail, BedRow, BedStatus,
  BookingStatus, ProductType, RatePlanVersion, AdminBookingDetail,
  CleaningTask, FamilyPolicyRow, FinanceSummary, MaintenanceTicket,
  OccupancyReportRow, PaymentListRow, RevenueReportRow, RoleRow, StaffRow,
  VolumeReportRow, WashroomArea, ProposedSpace, SettlementRow,
} from './database.types';

async function rpcError(err: unknown): Promise<Error> {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message) return new Error(o.message);
  }
  return new Error('An unexpected error occurred.');
}

export async function getMyPermissions(): Promise<string[]> {
  const { data, error } = await supabase.rpc('my_permissions');
  if (error) throw await rpcError(error);
  return (data as string[]) ?? [];
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

export async function blockBed(spaceId: string, fromIso: string, toIso: string, reason: string): Promise<string> {
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

export async function getBookingDetailFull(id: string): Promise<AdminBookingDetail> {
  const { data, error } = await supabase.rpc('admin_booking_detail', { p_booking_id: id });
  if (error) throw await rpcError(error);
  return data as AdminBookingDetail;
}

export async function cancelBookingAdmin(id: string, reason: string | null): Promise<{
  refund_paise: number; refund_percent: number;
}> {
  const { data, error } = await supabase.rpc('cancel_booking', { p_booking_id: id, p_reason: reason });
  if (error) throw await rpcError(error);
  const row = data as any;
  if (!row?.ok) throw new Error(row?.error ?? 'Cancellation failed');
  return { refund_paise: row.refund_paise, refund_percent: row.refund_percent };
}

export async function markNoShow(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_mark_no_show', { p_booking_id: id });
  if (error) throw await rpcError(error);
}

export async function getFinanceSummary(fromIso: string, toIso: string): Promise<FinanceSummary> {
  const { data, error } = await supabase.rpc('admin_finance_summary', { p_from: fromIso, p_to: toIso });
  if (error) throw await rpcError(error);
  return data as FinanceSummary;
}

export async function listPayments(filters: {
  fromIso: string; toIso: string; status?: string | null; limit?: number;
}): Promise<PaymentListRow[]> {
  const { data, error } = await supabase.rpc('admin_list_payments', {
    p_from: filters.fromIso, p_to: filters.toIso,
    p_status: filters.status ?? null, p_limit: filters.limit ?? 100,
  });
  if (error) throw await rpcError(error);
  return (data ?? []) as PaymentListRow[];
}

export async function processRefund(paymentId: string, amountPaise: number, reason: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_process_refund', {
    p_payment_id: paymentId, p_amount_paise: amountPaise, p_reason: reason,
  });
  if (error) throw await rpcError(error);
  return data as string;
}

export async function getOccupancyReport(fromDate: string, toDate: string): Promise<OccupancyReportRow[]> {
  const { data, error } = await supabase.rpc('report_occupancy', { p_from: fromDate, p_to: toDate });
  if (error) throw await rpcError(error);
  return (data ?? []) as OccupancyReportRow[];
}

export async function getRevenueReport(fromDate: string, toDate: string): Promise<RevenueReportRow[]> {
  const { data, error } = await supabase.rpc('report_revenue', { p_from: fromDate, p_to: toDate });
  if (error) throw await rpcError(error);
  return (data ?? []) as RevenueReportRow[];
}

export async function getVolumeReport(fromDate: string, toDate: string): Promise<VolumeReportRow[]> {
  const { data, error } = await supabase.rpc('report_booking_volume', { p_from: fromDate, p_to: toDate });
  if (error) throw await rpcError(error);
  return (data ?? []) as VolumeReportRow[];
}

export async function createMaintenance(input: {
  title: string; description: string | null;
  spaceId: string | null; bunkUnitId: string | null;
  sectionId: string | null; priority: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_maintenance', {
    p_title: input.title, p_description: input.description,
    p_space_id: input.spaceId, p_bunk_unit_id: input.bunkUnitId,
    p_section_id: input.sectionId, p_priority: input.priority,
  });
  if (error) throw await rpcError(error);
  return data as string;
}

export async function resolveMaintenance(ticketId: string, note: string): Promise<void> {
  const { error } = await supabase.rpc('admin_resolve_maintenance', {
    p_ticket_id: ticketId, p_note: note,
  });
  if (error) throw await rpcError(error);
}

export async function completeCleaning(taskId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_complete_cleaning', { p_task_id: taskId });
  if (error) throw await rpcError(error);
}

export async function listStaff(): Promise<StaffRow[]> {
  const { data, error } = await supabase.rpc('admin_list_staff');
  if (error) throw await rpcError(error);
  return (data ?? []) as StaffRow[];
}

export async function listAllRoles(): Promise<RoleRow[]> {
  const { data, error } = await supabase.rpc('admin_list_all_roles');
  if (error) throw await rpcError(error);
  return (data ?? []) as RoleRow[];
}

export async function findUserByEmail(email: string): Promise<{ user_id: string; email: string; full_name: string | null } | null> {
  const { data, error } = await supabase.rpc('admin_find_user_by_email', { p_email: email });
  if (error) throw await rpcError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

export async function assignRole(userId: string, roleCode: string): Promise<void> {
  const { error } = await supabase.rpc('admin_assign_role', {
    p_user_id: userId, p_role_code: roleCode,
  });
  if (error) throw await rpcError(error);
}

export async function revokeRole(userId: string, roleCode: string): Promise<void> {
  const { error } = await supabase.rpc('admin_revoke_role', {
    p_user_id: userId, p_role_code: roleCode,
  });
  if (error) throw await rpcError(error);
}

export async function getCurrentFamilyPolicy(): Promise<FamilyPolicyRow | null> {
  const { data, error } = await supabase.rpc('admin_current_family_policy');
  if (error) throw await rpcError(error);
  return (data as FamilyPolicyRow | null) ?? null;
}

export async function publishFamilyPolicy(input: {
  eligibility: string; relationships: string; verification: string;
  evidence: string; checkinReview: string; escalation: string;
  legalReviewed: boolean;
}): Promise<string> {
  const { data, error } = await supabase.rpc('admin_publish_family_policy', {
    p_eligibility: input.eligibility, p_relationships: input.relationships,
    p_verification: input.verification, p_evidence: input.evidence,
    p_checkin_review: input.checkinReview, p_escalation: input.escalation,
    p_legal_reviewed: input.legalReviewed,
  });
  if (error) throw await rpcError(error);
  return data as string;
}

export async function unpublishFamilyPolicy(): Promise<void> {
  const { error } = await supabase.rpc('admin_unpublish_family_policy');
  if (error) throw await rpcError(error);
}

export async function publishCancellationPolicy(input: {
  freeCancelMinutes: number; outsidePct: number; insidePct: number; propertyPct: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc('admin_publish_cancellation_policy', {
    p_free_cancel_minutes: input.freeCancelMinutes,
    p_outside_pct: input.outsidePct, p_inside_pct: input.insidePct,
    p_property_pct: input.propertyPct,
  });
  if (error) throw await rpcError(error);
  return data as string;
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

export async function getPropertyId(): Promise<string> {
  const { data } = await supabase.from('property_contact').select('property_id').maybeSingle();
  return (data as any)?.property_id ?? '';
}

export async function updateContact(input: {
  address_line: string | null; locality: string | null; region: string | null;
  postal_code: string | null; phone: string | null; email: string | null;
  map_url: string | null;
}): Promise<void> {
  const { error } = await supabase.from('property_contact').update(input).eq('property_id', await getPropertyId());
  if (error) throw await rpcError(error);
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

export async function proposeWomenReserved(acTarget = 10, naBunkTarget = 30): Promise<ProposedSpace[]> {
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

export async function getSettlements(limit = 100): Promise<SettlementRow[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw await rpcError(error);
  return (data ?? []) as SettlementRow[];
}

export async function assignBedManual(bookingId: string, spaceId: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_assign_bed_manual', {
    p_booking_id: bookingId,
    p_space_id: spaceId,
  });
  if (error) throw await rpcError(error);
  return data as string;
}

export async function transferBooking(bookingId: string, newSpaceId: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_transfer_booking', {
    p_booking_id: bookingId,
    p_new_space_id: newSpaceId,
  });
  if (error) throw await rpcError(error);
  return data as string;
}

export async function toggleBedActive(spaceId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_toggle_bed_active', {
    p_space_id: spaceId,
    p_is_active: isActive,
  });
  if (error) throw await rpcError(error);
}

export interface TransactionLedgerRow {
  transaction_date: string;
  booking_id: string;
  reference: string;
  guest_name: string;
  product_type: string;
  bed_code: string;
  check_in: string;
  check_out: string;
  status: string;
  amount_paid: number;
  amount_refunded: number;
  net_amount: number;
}

export async function getDetailedTransactions(fromIso: string, toIso: string): Promise<TransactionLedgerRow[]> {
  const { data, error } = await supabase.rpc('admin_detailed_transactions', {
    p_from: fromIso,
    p_to: toIso,
  });
  if (error) throw await rpcError(error);
  return (data ?? []) as TransactionLedgerRow[];
}

export interface UnassignedBooking {
  booking_id: string;
  reference: string;
  guest_name: string;
  starts_at: string;
}

export async function getUnassignedBookings(sectionCode: 'AC' | 'NON_AC'): Promise<UnassignedBooking[]> {
  const { data, error } = await supabase.rpc('admin_unassigned_bookings', {
    p_section_code: sectionCode,
  });
  if (error) throw await rpcError(error);
  return (data ?? []) as UnassignedBooking[];
}

export interface CheckoutCalculation {
  booking_id: string;
  original_total_paise: number;
  recalculated_total_paise: number;
  overstay_charge_paise: number;
  manual_charges: Array<{ description: string; amount: number }>;
  manual_total_paise: number;
  grand_total_paise: number;
  balance_due_paise: number;
}

export async function calculateCheckout(bookingId: string, actualCheckoutTime: string): Promise<CheckoutCalculation> {
  const { data, error } = await supabase.rpc('admin_calculate_checkout', {
    p_booking_id: bookingId,
    p_actual_checkout_time: actualCheckoutTime,
  });
  if (error) throw await rpcError(error);
  return data as CheckoutCalculation;
}

export async function addBookingCharge(bookingId: string, description: string, amountPaise: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('booking_charges').insert({
    booking_id: bookingId,
    description,
    amount_paise: amountPaise,
    created_by: user?.id,
  });
  if (error) throw await rpcError(error);
}

export async function processCheckout(bookingId: string, actualCheckoutTime: string): Promise<void> {
  const { error } = await supabase.rpc('admin_check_out', {
    p_booking_id: bookingId,
    p_actual_checkout_time: actualCheckoutTime,
  });
  if (error) throw await rpcError(error);
}

export interface OutstandingDue {
  booking_id: string;
  reference: string;
  guest_name: string;
  total_paise: number;
  paid_paise: number;
  due_paise: number;
}

export async function getOutstandingDues(): Promise<OutstandingDue[]> {
  const { data, error } = await supabase.rpc('admin_get_outstanding_dues');
  if (error) throw await rpcError(error);
  return data as OutstandingDue[];
}

export interface RefundRecord {
  id: string;
  booking_id: string;
  reference: string;
  guest_name: string;
  amount_paise: number;
  reason: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
}

export async function getRefundHistory(): Promise<RefundRecord[]> {
  const { data, error } = await supabase.rpc('admin_get_refunds');
  if (error) throw await rpcError(error);
  return data as RefundRecord[];
}