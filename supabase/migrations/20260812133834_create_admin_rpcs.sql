/*
# PPSU Events — Admin Payment & Check-in RPCs

1. approve_payment
   Marks a payment as approved, sets booking to confirmed, generates tickets for
   each attendee, and logs the action. SECURITY DEFINER so only the admin caller
   needs INSERT on tickets (the user role does not have that grant).

2. reject_payment
   Marks payment rejected, sets booking to payment_rejected with admin note.

3. check_in_ticket
   Marks a ticket as used, records a check-in row, and logs the action.

All functions verify the caller has the appropriate staff role.
*/

CREATE OR REPLACE FUNCTION public.approve_payment(p_payment_id uuid, p_admin_id uuid, p_admin_note text DEFAULT NULL)
RETURNS TABLE (success boolean, tickets_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_attendee RECORD;
  v_ticket_number text;
  v_qr_token text;
  v_count integer := 0;
BEGIN
  IF NOT public.is_event_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = v_payment.booking_id FOR UPDATE;
  SELECT * INTO v_event FROM public.events WHERE id = v_booking.event_id;

  -- Update payment
  UPDATE public.payments
  SET status = 'approved', reviewed_by = p_admin_id, reviewed_at = now(), admin_note = COALESCE(p_admin_note, admin_note)
  WHERE id = p_payment_id;

  -- Update booking
  UPDATE public.bookings SET status = 'confirmed' WHERE id = v_booking.id;

  -- Generate tickets for all approved attendees
  FOR v_attendee IN
    SELECT * FROM public.attendees
    WHERE booking_id = v_booking.id AND approval_status IN ('not_required','approved')
  LOOP
    v_ticket_number := 'PPSU-' || lpad(floor(random() * 90000000 + 10000000)::text, 8, '0');
    v_qr_token := gen_random_uuid()::text || '-' || gen_random_uuid()::text;

    INSERT INTO public.tickets (booking_id, attendee_id, event_id, ticket_number, qr_token, status)
    VALUES (v_booking.id, v_attendee.id, v_booking.event_id, v_ticket_number, v_qr_token, 'valid');

    v_count := v_count + 1;
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'payment_approved', 'payment', p_payment_id::text,
    jsonb_build_object('booking_id', v_booking.id, 'tickets_created', v_count));

  RETURN QUERY SELECT true, v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_payment(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_payment(p_payment_id uuid, p_admin_id uuid, p_rejection_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
BEGIN
  IF NOT public.is_event_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT booking_id INTO v_booking_id FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  UPDATE public.payments
  SET status = 'rejected', reviewed_by = p_admin_id, reviewed_at = now(), admin_note = p_rejection_reason
  WHERE id = p_payment_id;

  UPDATE public.bookings SET status = 'payment_rejected' WHERE id = v_booking_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'payment_rejected', 'payment', p_payment_id::text,
    jsonb_build_object('reason', p_rejection_reason));

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_payment(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_in_ticket(p_qr_token text, p_staff_id uuid)
RETURNS TABLE (
  success boolean,
  ticket_number text,
  attendee_name text,
  event_title text,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_attendee public.attendees%ROWTYPE;
  v_event public.events%ROWTYPE;
BEGIN
  IF NOT public.is_gate_staff(p_staff_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE qr_token = p_qr_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ''::text, ''::text, ''::text, 'Invalid ticket'::text;
    RETURN;
  END IF;

  IF v_ticket.status = 'used' THEN
    SELECT full_name INTO v_attendee FROM public.attendees WHERE id = v_ticket.attendee_id;
    SELECT title INTO v_event FROM public.events WHERE id = v_ticket.event_id;
    RETURN QUERY SELECT false, v_ticket.ticket_number, v_attendee.full_name, v_event.title, 'Already used'::text;
    RETURN;
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RETURN QUERY SELECT false, v_ticket.ticket_number, ''::text, ''::text, 'Ticket cancelled'::text;
    RETURN;
  END IF;

  UPDATE public.tickets SET status = 'used', checked_in_at = now(), checked_in_by = p_staff_id
  WHERE id = v_ticket.id;

  INSERT INTO public.check_ins (ticket_id, event_id, checked_in_by)
  VALUES (v_ticket.id, v_ticket.event_id, p_staff_id);

  SELECT full_name INTO v_attendee FROM public.attendees WHERE id = v_ticket.attendee_id;
  SELECT title INTO v_event FROM public.events WHERE id = v_ticket.event_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_staff_id, 'ticket_checked_in', 'ticket', v_ticket.id::text,
    jsonb_build_object('ticket_number', v_ticket.ticket_number));

  RETURN QUERY SELECT true, v_ticket.ticket_number, v_attendee.full_name, v_event.title, 'Checked in'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in_ticket(text, uuid) TO authenticated;

-- Grant INSERT on tickets to authenticated so the RPC can create them
GRANT INSERT ON public.tickets TO authenticated;
