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