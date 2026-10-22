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