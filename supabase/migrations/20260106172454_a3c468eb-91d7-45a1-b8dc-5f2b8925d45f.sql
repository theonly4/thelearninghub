-- Allow platform owners to view all user roles
CREATE POLICY "Platform owners can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'platform_owner'::app_role));