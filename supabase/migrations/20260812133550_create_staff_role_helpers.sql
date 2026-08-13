/*
  PPSU Events — Staff Role Helper Functions

  Centralized role checks used by RLS policies and SECURITY DEFINER RPCs.
*/

CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_roles
    WHERE user_id = p_user_id
      AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_roles
    WHERE user_id = p_user_id
      AND role IN ('super_admin', 'event_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_gate_staff(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_roles
    WHERE user_id = p_user_id
      AND role IN ('super_admin', 'event_admin', 'gate_staff')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gate_staff(uuid) TO authenticated;