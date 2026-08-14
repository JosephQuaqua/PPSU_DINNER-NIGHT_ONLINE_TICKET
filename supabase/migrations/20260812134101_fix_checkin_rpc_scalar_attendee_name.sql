/*
# PPSU Events — Fix check_in_ticket RPC scalar attendee and event name handling

The previous migration contained a type mismatch:
- v_attendee was declared as public.attendees%ROWTYPE (a complete row)
- but we were selecting a.full_name (text) INTO v_attendee
- PostgreSQL tried to assign text to the first field (id, a UUID), causing:
  "invalid input syntax for type uuid: 'Joseph Y M Quaqua'"

Fix: Replace row-type variables with scalar text variables for attendee_name and event_title.
This is the minimal safe correction that preserves all existing behavior and validation logic.
*/

DROP FUNCTION IF EXISTS public.check_in_ticket(text, uuid);

CREATE FUNCTION public.check_in_ticket(p_input text, p_staff_id uuid)
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
  v_attendee_name text;
  v_event_title text;
BEGIN
  IF NOT public.is_gate_staff(p_staff_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT t.*
  INTO v_ticket
  FROM public.tickets AS t
  WHERE t.qr_token = p_input
     OR t.ticket_number = p_input
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ''::text, ''::text, ''::text, 'Invalid ticket'::text;
    RETURN;
  END IF;

  IF v_ticket.status = 'used' THEN
    SELECT a.full_name
    INTO v_attendee_name
    FROM public.attendees AS a
    WHERE a.id = v_ticket.attendee_id;

    SELECT e.title
    INTO v_event_title
    FROM public.events AS e
    WHERE e.id = v_ticket.event_id;

    RETURN QUERY SELECT false, v_ticket.ticket_number, v_attendee_name, v_event_title, 'Already used'::text;
    RETURN;
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RETURN QUERY SELECT false, v_ticket.ticket_number, ''::text, ''::text, 'Ticket cancelled'::text;
    RETURN;
  END IF;

  UPDATE public.tickets
  SET status = 'used', checked_in_at = now(), checked_in_by = p_staff_id
  WHERE id = v_ticket.id;

  INSERT INTO public.check_ins (ticket_id, event_id, checked_in_by)
  VALUES (v_ticket.id, v_ticket.event_id, p_staff_id);

  SELECT a.full_name
  INTO v_attendee_name
  FROM public.attendees AS a
  WHERE a.id = v_ticket.attendee_id;

  SELECT e.title
  INTO v_event_title
  FROM public.events AS e
  WHERE e.id = v_ticket.event_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    p_staff_id,
    'ticket_checked_in',
    'ticket',
    v_ticket.id::text,
    jsonb_build_object('ticket_number', v_ticket.ticket_number)
  );

  RETURN QUERY SELECT true, v_ticket.ticket_number, v_attendee_name, v_event_title, 'Checked in'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in_ticket(text, uuid) TO authenticated;
