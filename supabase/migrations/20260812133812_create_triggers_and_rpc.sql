/*
# PPSU Events — Triggers & Booking RPC

1. updated_at triggers
   Auto-updates updated_at on row update for all tables with that column.

2. create_booking RPC
   Atomically reserves seats and creates a booking + self attendee in a single
   transaction. Prevents overselling by checking capacity with FOR UPDATE lock.
   Generates a unique booking number server-side.
*/

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','events','bookings','attendees','attendee_approvals','payments','waitlists'])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated ON public.%s;
       CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%s
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic booking creation RPC
CREATE OR REPLACE FUNCTION public.create_booking(
  p_event_id uuid,
  p_user_id uuid,
  p_attendee_count integer,
  p_total_amount numeric,
  p_self_name text,
  p_self_student_id text,
  p_self_email text
)
RETURNS TABLE (
  booking_id uuid,
  booking_number text,
  status text,
  total_amount numeric,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_booking_id uuid;
  v_booking_number text;
  v_new_sold integer;
  v_expires_at timestamptz;
BEGIN
  -- Lock the event row to prevent concurrent overselling
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.status NOT IN ('active') THEN
    RAISE EXCEPTION 'Event is not available for booking';
  END IF;

  v_new_sold := v_event.tickets_sold + p_attendee_count;

  IF v_new_sold > v_event.capacity THEN
    RAISE EXCEPTION 'Not enough seats available';
  END IF;

  -- Generate unique booking number
  v_booking_number := 'BK' || lpad(floor(random() * 90000000 + 10000000)::text, 8, '0');

  v_expires_at := now() + (v_event.reservation_expiry_hours || ' hours')::interval;

  -- Create the booking
  INSERT INTO public.bookings (booking_number, event_id, user_id, status, attendee_count, total_amount, expires_at)
  VALUES (v_booking_number, p_event_id, p_user_id, 'payment_pending', p_attendee_count, p_total_amount, v_expires_at)
  RETURNING id INTO v_booking_id;

  -- Create self attendee
  INSERT INTO public.attendees (booking_id, event_id, full_name, student_id, email, is_self, approval_status)
  VALUES (v_booking_id, p_event_id, p_self_name, p_self_student_id, p_self_email, true, 'not_required');

  -- Update tickets_sold atomically
  UPDATE public.events
  SET tickets_sold = v_new_sold,
      status = CASE WHEN v_new_sold >= capacity THEN 'sold_out' ELSE status END
  WHERE id = p_event_id;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, 'booking_created', 'booking', v_booking_id::text,
    jsonb_build_object('booking_number', v_booking_number, 'event_id', p_event_id, 'attendee_count', p_attendee_count));

  RETURN QUERY
  SELECT v_booking_id, v_booking_number, 'payment_pending'::text, p_total_amount, v_expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, integer, numeric, text, text, text) TO authenticated;

-- Add guest attendee RPC
CREATE OR REPLACE FUNCTION public.add_guest_attendee(
  p_booking_id uuid,
  p_event_id uuid,
  p_full_name text,
  p_student_id text,
  p_email text,
  p_inviter_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attendee_id uuid;
  v_token text;
  v_event public.events%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR v_booking.user_id <> p_inviter_id THEN
    RAISE EXCEPTION 'Booking not found or not owned by you';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  v_event.tickets_sold := v_event.tickets_sold + 1;
  IF v_event.tickets_sold > v_event.capacity THEN
    RAISE EXCEPTION 'Not enough seats available';
  END IF;

  INSERT INTO public.attendees (booking_id, event_id, full_name, student_id, email, is_self, approval_status)
  VALUES (p_booking_id, p_event_id, p_full_name, p_student_id, p_email, false, 'pending')
  RETURNING id INTO v_attendee_id;

  v_token := gen_random_uuid()::text || '-' || gen_random_uuid()::text;

  INSERT INTO public.attendee_approvals (attendee_id, booking_id, event_id, inviter_id, invitee_email, approval_token, status, expires_at)
  VALUES (v_attendee_id, p_booking_id, p_event_id, p_inviter_id, p_email, v_token, 'pending',
    now() + interval '7 days');

  UPDATE public.events SET tickets_sold = v_event.tickets_sold,
    status = CASE WHEN v_event.tickets_sold >= v_event.capacity THEN 'sold_out' ELSE status END
  WHERE id = p_event_id;

  UPDATE public.bookings SET attendee_count = attendee_count + 1 WHERE id = p_booking_id;

  RETURN v_attendee_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_guest_attendee(uuid, uuid, text, text, text, uuid) TO authenticated;
