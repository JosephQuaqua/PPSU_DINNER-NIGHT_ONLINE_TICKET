/*
  Fix ambiguous ticket_number reference in check_in_ticket.

  The lookup must qualify ticket columns explicitly when checking both
  qr_token and ticket_number. Using a table alias prevents PostgreSQL from
  treating ticket_number as an ambiguous column when other joined or selected
  tables contain the same column name.
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
  v_attendee public.attendees%ROWTYPE;
  v_event public.events%ROWTYPE;
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
    INTO v_attendee
    FROM public.attendees AS a
    WHERE a.id = v_ticket.attendee_id;

    SELECT e.title
    INTO v_event
    FROM public.events AS e
    WHERE e.id = v_ticket.event_id;

    RETURN QUERY SELECT false, v_ticket.ticket_number, v_attendee.full_name, v_event.title, 'Already used'::text;
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
  INTO v_attendee
  FROM public.attendees AS a
  WHERE a.id = v_ticket.attendee_id;

  SELECT e.title
  INTO v_event
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

  RETURN QUERY SELECT true, v_ticket.ticket_number, v_attendee.full_name, v_event.title, 'Checked in'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in_ticket(text, uuid) TO authenticated;
