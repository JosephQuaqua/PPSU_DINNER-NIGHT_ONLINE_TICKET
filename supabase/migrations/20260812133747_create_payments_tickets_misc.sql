/*
# PPSU Events — Payments, Tickets, Waitlists, Check-ins, Audit Logs

1. New Tables
   - payments: manual UPI payment records with proof + admin review status
   - tickets: issued tickets with QR token + check-in status
   - waitlists: users waiting for sold-out events
   - check_ins: gate check-in records
   - audit_logs: append-only audit trail

2. Security
   - RLS on all tables.
   - Payments: user sees own; staff sees all; user+staff can update.
   - Tickets: owner (via booking) + gate_staff can see; gate_staff can update.
   - Waitlists: user sees own; staff sees all; staff can update.
   - Check-ins: gate_staff only.
   - Audit logs: staff read; any authenticated can insert.
*/

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  payment_method text DEFAULT 'upi',
  transaction_reference text,
  proof_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected')),
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_event_admin(auth.uid()));

DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
CREATE POLICY "payments_insert_own" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "payments_update_own" ON public.payments;
CREATE POLICY "payments_update_own" ON public.payments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_event_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_event_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;

CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_number text NOT NULL UNIQUE,
  qr_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','used','cancelled')),
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_booking ON public.tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr ON public.tickets(qr_token);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select_own" ON public.tickets;
CREATE POLICY "tickets_select_own" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = tickets.booking_id AND bookings.user_id = auth.uid())
    OR public.is_event_admin(auth.uid())
    OR public.is_gate_staff(auth.uid())
  );

DROP POLICY IF EXISTS "tickets_update_staff" ON public.tickets;
CREATE POLICY "tickets_update_staff" ON public.tickets
  FOR UPDATE TO authenticated
  USING (public.is_gate_staff(auth.uid()))
  WITH CHECK (public.is_gate_staff(auth.uid()));

GRANT SELECT, UPDATE ON public.tickets TO authenticated;

CREATE TABLE IF NOT EXISTS public.waitlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','notified','converted','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.waitlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlists_select_own" ON public.waitlists;
CREATE POLICY "waitlists_select_own" ON public.waitlists
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_event_admin(auth.uid()));

DROP POLICY IF EXISTS "waitlists_insert_own" ON public.waitlists;
CREATE POLICY "waitlists_insert_own" ON public.waitlists
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "waitlists_update_staff" ON public.waitlists;
CREATE POLICY "waitlists_update_staff" ON public.waitlists
  FOR UPDATE TO authenticated
  USING (public.is_event_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.waitlists TO authenticated;

CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  checked_in_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkins_ticket ON public.check_ins(ticket_id);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkins_select_staff" ON public.check_ins;
CREATE POLICY "checkins_select_staff" ON public.check_ins
  FOR SELECT TO authenticated
  USING (public.is_gate_staff(auth.uid()));

DROP POLICY IF EXISTS "checkins_insert_staff" ON public.check_ins;
CREATE POLICY "checkins_insert_staff" ON public.check_ins
  FOR INSERT TO authenticated
  WITH CHECK (public.is_gate_staff(auth.uid()));

GRANT SELECT, INSERT ON public.check_ins TO authenticated;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_staff" ON public.audit_logs;
CREATE POLICY "audit_select_staff" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_event_admin(auth.uid()));

DROP POLICY IF EXISTS "audit_insert_any" ON public.audit_logs;
CREATE POLICY "audit_insert_any" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
