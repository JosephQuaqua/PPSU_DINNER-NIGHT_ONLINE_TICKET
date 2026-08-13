export type EventStatus = 'draft' | 'active' | 'sold_out' | 'completed' | 'cancelled';
export type BookingStatus =
  | 'payment_pending'
  | 'payment_submitted'
  | 'payment_rejected'
  | 'confirmed'
  | 'cancelled'
  | 'expired';
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'submitted' | 'approved' | 'rejected';
export type TicketStatus = 'valid' | 'used' | 'cancelled';
export type WaitlistStatus = 'waiting' | 'notified' | 'converted' | 'expired';
export type StaffRole = 'super_admin' | 'event_admin' | 'gate_staff';

export interface EventRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  venue: string;
  address: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  tickets_sold: number;
  ticket_price: number;
  upi_id: string | null;
  upi_qr_url: string | null;
  banner_url: string | null;
  reservation_expiry_hours: number;
  status: EventStatus;
  is_featured: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  full_name: string | null;
  student_id: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffRoleRow {
  id: string;
  user_id: string;
  role: StaffRole;
  created_at: string;
}

export interface BookingRow {
  id: string;
  booking_number: string;
  event_id: string;
  user_id: string;
  status: BookingStatus;
  attendee_count: number;
  total_amount: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendeeRow {
  id: string;
  booking_id: string;
  event_id: string;
  full_name: string;
  student_id: string;
  email: string;
  is_self: boolean;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface AttendeeApprovalRow {
  id: string;
  attendee_id: string;
  booking_id: string;
  event_id: string;
  inviter_id: string;
  invitee_email: string;
  approval_token: string;
  status: ApprovalStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  payment_method: string | null;
  transaction_reference: string | null;
  proof_url: string | null;
  status: PaymentStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketRow {
  id: string;
  booking_id: string;
  attendee_id: string;
  event_id: string;
  ticket_number: string;
  qr_token: string;
  status: TicketStatus;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
}

export interface WaitlistRow {
  id: string;
  event_id: string;
  user_id: string;
  status: WaitlistStatus;
  created_at: string;
  updated_at: string;
}

export interface CheckInRow {
  id: string;
  ticket_id: string;
  event_id: string;
  checked_in_by: string;
  checked_in_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface BookingWithDetails extends BookingRow {
  events?: EventRow | null;
  attendees?: AttendeeRow[];
  payments?: PaymentRow[];
  tickets?: TicketRow[];
}

export interface EventWithStats extends EventRow {
  bookings_count?: number;
  confirmed_bookings_count?: number;
  pending_payments_count?: number;
  revenue?: number;
  attendance?: number;
}
