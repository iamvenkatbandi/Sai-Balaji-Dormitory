export type ProductType = 'ac_individual' | 'ac_family_compartment' | 'non_ac_space';

export type BookingStatus =
  | 'draft'
  | 'pending_payment'
  | 'pending_approval'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired';

export type GuestGender = 'female' | 'male' | 'other' | 'undisclosed';

export interface PropertyContact {
  property_id: string;
  address_line: string | null;
  locality: string | null;
  region: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  map_url: string | null;
}

export interface PropertySettings {
  property_id: string;
  cleaning_buffer_minutes: number;
  booking_horizon_days: number;
  max_stay_days: number;
  min_hourly_minutes: number;
  overstay_grace_minutes: number;
  overstay_escalation_hours: number;
  deposits_enabled: boolean;
  enquiries_enabled: boolean;
  hold_ttl_minutes: number;
  washroom_counts_confirmed: boolean;
  dev_allow_manual_confirm: boolean;
}

export interface RatePlan {
  id: string;
  product_type: ProductType;
  name: string;
  is_active: boolean;
}

export interface RatePlanVersion {
  id: string;
  rate_plan_id: string;
  version: number;
  effective_from: string;
  effective_to: string | null;
  hourly_rate_paise: number | null;
  extra_hour_rate_paise: number | null;
  overnight_rate_paise: number | null;
  overnight_minutes: number | null;
  extended_stay_rate_paise: number | null;
  extended_stay_minutes: number | null;
  min_booking_minutes: number | null;
  deposit_paise: number | null;
  is_published: boolean;
}

export interface FamilyPolicy {
  id: string;
  is_published: boolean;
  effective_from: string | null;
}

export interface CancellationPolicy {
  id: string;
  version: number;
  free_cancel_before_minutes: number;
  refund_percent_outside_window: number;
  refund_percent_inside_window: number;
  refund_percent_property_cancelled: number;
  is_published: boolean;
  effective_from: string | null;
}

export interface BookingStatusRow {
  reference: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  product_type: ProductType;
  total_paise: number | null;
}

export interface SupportTicket {
  id: string;
  profile_id: string;
  booking_id: string | null;
  category: 'booking' | 'facility' | 'safety' | 'billing' | 'other';
  subject: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  author_profile_id: string | null;
  author_kind: 'guest' | 'staff';
  body: string;
  created_at: string;
}

export interface ExtensionRequest {
  id: string;
  booking_id: string;
  requested_by_profile_id: string;
  requested_new_end: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string | null;
  quoted_extra_paise: number | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
}

export interface AdminDashboardMetrics {
  capacity: { total: number; ac: number; non_ac: number };
  occupancy: { occupied: number; available: number; reserved: number; maintenance: number; cleaning: number };
  today: { arrivals: number; departures: number; overdue: number };
  finance: { collections_paise: number; outstanding_paise: number };
  ops: { open_support_tickets: number };
}

export type BedStatus = 'available' | 'reserved' | 'occupied' | 'cleaning' | 'maintenance' | 'inactive';

export interface BedRow {
  space_id: string;
  code: string;
  product_type: ProductType;
  position: string;
  section_code: 'AC' | 'NON_AC';
  zone_name: string;
  bunk_unit_code: string | null;
  family_compartment_code: string | null;
  women_reserved: boolean;
  is_active: boolean;
  status: BedStatus;
  current_booking_id: string | null;
  current_booking_reference: string | null;
  current_booking_ends_at: string | null;
  current_booking_guest_name: string | null;
  upcoming_booking_id: string | null;
  upcoming_booking_reference: string | null;
  upcoming_booking_starts_at: string | null;
}

export interface BedDetail {
  space: {
    id: string; code: string; product_type: ProductType; position: string;
    section_code: 'AC' | 'NON_AC'; zone_name: string;
    bunk_unit_code: string | null; family_compartment_code: string | null;
    women_reserved: boolean; is_active: boolean;
  };
  current_booking: {
    id: string; reference: string; status: BookingStatus;
    starts_at: string; ends_at: string;
    guest_name: string | null; guest_gender: GuestGender | null;
  } | null;
  upcoming_bookings: Array<{
    id: string; reference: string; status: BookingStatus;
    starts_at: string; ends_at: string; guest_name: string | null;
  }>;
  maintenance_history: Array<{
    id: string; kind: string; blocked_from: string; blocked_to: string; reason: string | null;
  }>;
  cleaning_history: Array<{ id: string; blocked_from: string; blocked_to: string }>;
}

export interface AdminBookingRow {
  id: string;
  reference: string;
  status: BookingStatus;
  product_type: ProductType;
  starts_at: string;
  ends_at: string;
  total_paise: number | null;
  guest_name: string | null;
  guest_email: string | null;
  space_code: string | null;
}

export interface AdminBookingDetail {
  booking: {
    id: string; reference: string; status: BookingStatus; product_type: ProductType;
    starts_at: string; ends_at: string; total_paise: number | null;
    primary_contact_email: string | null; primary_contact_phone: string | null;
    created_at: string;
  };
  guests: Array<{ id: string; full_name: string; gender: GuestGender; is_primary: boolean; age_years: number | null }>;
  payments: Array<{ id: string; amount_paise: number; status: string; gateway_payment_id: string | null; created_at: string }>;
  spaces: Array<{ space_id: string; code: string; position: string }>;
}

export interface WashroomArea {
  id: string;
  section_id: string;
  name: string;
  toilet_count: number | null;
  basin_count: number | null;
  shower_count: number | null;
  notes: string | null;
  last_inspection_at: string | null;
  next_cleaning_at: string | null;
  status: 'operational' | 'cleaning' | 'maintenance' | 'inactive';
  last_cleaned_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MaintenanceTicket {
  id: string;
  title: string;
  description: string | null;
  space_id: string | null;
  bunk_unit_id: string | null;
  family_compartment_id: string | null;
  section_id: string | null;
  washroom_area_id: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  opened_by: string | null;
  assigned_to: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface CleaningTask {
  id: string;
  space_block_id: string;
  space_id: string;
  assigned_to: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'inspected';
  checklist: unknown[];
  completed_at: string | null;
  inspected_at: string | null;
  created_at: string;
}

export interface FinanceSummary {
  collected_paise: number;
  refunded_paise: number;
  outstanding_paise: number;
  failed_paise: number;
  transaction_count: number;
  net_paise: number;
}

export interface PaymentListRow {
  id: string;
  booking_id: string;
  booking_reference: string;
  guest_name: string | null;
  amount_paise: number;
  status: string;
  gateway_payment_id: string | null;
  created_at: string;
}

export interface StaffRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  roles: string[];
  granted_at: string | null;
}

export interface RoleRow {
  code: string;
  name: string;
}

export interface OccupancyReportRow {
  day: string;
  occupied: number;
  total: number;
  occupancy_pct: number;
}

export interface RevenueReportRow {
  day: string;
  revenue_paise: number;
  refunds_paise: number;
  net_paise: number;
}

export interface VolumeReportRow {
  day: string;
  bookings: number;
  cancellations: number;
}

export interface FamilyPolicyRow {
  id: string;
  version: number;
  eligibility_criteria: string;
  qualifying_relationships: string;
  verification_process: string;
  accepted_evidence: string;
  checkin_review_process: string;
  escalation_process: string;
  legal_review_confirmed: boolean;
  is_published: boolean;
  effective_from: string | null;
}

export interface SettlementRow {
  id: string;
  settlement_id: string;
  amount: number;
  fees: number;
  tax: number;
  utr: string | null;
  status: string | null;
  created_at: string | null;
  recorded_at: string;
}

export interface ProposedSpace {
  space_id: string;
  code: string;
  product_type: ProductType;
  position: string;
  rationale: string;
}

export interface WashroomFixture {
  id: string;
  washroom_area_id: string;
  fixture_type: 'toilet' | 'basin' | 'shower';
  label: string;
  status: 'operational' | 'cleaning' | 'maintenance' | 'inactive';
  last_cleaned_at: string | null;
  created_at: string;
}

export interface LegalPolicy {
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  updated_at: string;
}

export interface LegalPolicy {
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  updated_at: string;
}

export interface FamilyPolicy {
  id: string;
  version: number;
  is_published: boolean;
  effective_from: string | null;
  eligibility_criteria: string | null;
  qualifying_relationships: string | null;
  verification_process: string | null;
  accepted_evidence: string | null;
  checkin_review_process: string | null;
  escalation_process: string | null;
  legal_review_confirmed: boolean;
}