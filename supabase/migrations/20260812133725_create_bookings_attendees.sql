/*
# PPSU Events — Bookings, Attendees & Approvals

1. New Tables
   - bookings: a user's booking for an event (status, attendee count, total)
   - attendees: individual attendees (self or guest) with approval status
   - attendee_approvals: approval tokens for guest attendees

2. Security
   - RLS on all three.
   - Users see/update only their own bookings and attendees.
   - Staff can see all bookings/attendees; staff can update attendees.
   - Approval rows visible to inviter, invitee (by email match), and staff.
*/

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text NOT NULL UNIQUE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'payment_pending' CHECK (status IN ('payment_pending','payment_submitted','payment_rejected','confirmed','cancelled','expired')),
  attendee_count integer NOT NULL DEFAULT 1 CHECK (attendee_count >= 1),
  total_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_event ON public.bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_own" ON public.bookings;
CREATE POLICY "bookings_select_own" ON public.bookings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_event_admin(auth.uid()));

DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
CREATE POLICY "bookings_insert_own" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "bookings_update_own" ON public.bookings;
CREATE POLICY "bookings_update_own" ON public.bookings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_event_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_event_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;

CREATE TABLE IF NOT EXISTS public.attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  student_id text NOT NULL,
  email text NOT NULL,
  is_self boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'not_required' CHECK (approval_status IN ('not_required','pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendees_booking ON public.attendees(booking_id);
CREATE INDEX IF NOT EXISTS idx_attendees_event ON public.attendees(event_id);

ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendees_select_own" ON public.attendees;
CREATE POLICY "attendees_select_own" ON public.attendees
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = attendees.booking_id AND bookings.user_id = auth.uid())
    OR public.is_event_admin(auth.uid())
  );

DROP POLICY IF EXISTS "attendees_insert_own" ON public.attendees;
CREATE POLICY "attendees_insert_own" ON public.attendees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = attendees.booking_id AND bookings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "attendees_update_own" ON public.attendees;
CREATE POLICY "attendees_update_own" ON public.attendees
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = attendees.booking_id AND bookings.user_id = auth.uid())
    OR public.is_event_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = attendees.booking_id AND bookings.user_id = auth.uid())
    OR public.is_event_admin(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON public.attendees TO authenticated;

CREATE TABLE IF NOT EXISTS public.attendee_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  approval_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('not_required','pending','approved','rejected')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendee_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approvals_select_own" ON public.attendee_approvals;
CREATE POLICY "approvals_select_own" ON public.attendee_approvals
  FOR SELECT TO authenticated
  USING (
    inviter_id = auth.uid()
    OR invitee_email = (SELECT email FROM public.profiles WHERE profiles.id = auth.uid())
    OR public.is_event_admin(auth.uid())
  );

DROP POLICY IF EXISTS "approvals_insert_own" ON public.attendee_approvals;
CREATE POLICY "approvals_insert_own" ON public.attendee_approvals
  FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid());

DROP POLICY IF EXISTS "approvals_update_own" ON public.attendee_approvals;
CREATE POLICY "approvals_update_own" ON public.attendee_approvals
  FOR UPDATE TO authenticated
  USING (
    inviter_id = auth.uid()
    OR invitee_email = (SELECT email FROM public.profiles WHERE profiles.id = auth.uid())
    OR public.is_event_admin(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON public.attendee_approvals TO authenticated;
