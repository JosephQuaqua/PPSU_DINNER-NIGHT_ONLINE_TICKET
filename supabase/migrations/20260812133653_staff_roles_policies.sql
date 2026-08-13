/*
# PPSU Events — Staff Roles RLS Policies

Adds RLS policies to staff_roles. Users can read their own roles; super_admins
can read all roles and insert/delete roles.
*/

DROP POLICY IF EXISTS "staff_roles_select" ON public.staff_roles;
CREATE POLICY "staff_roles_select" ON public.staff_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "staff_roles_insert_admin" ON public.staff_roles;
CREATE POLICY "staff_roles_insert_admin" ON public.staff_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "staff_roles_delete_admin" ON public.staff_roles;
CREATE POLICY "staff_roles_delete_admin" ON public.staff_roles
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
