-- Allow platform owners to insert new organizations
CREATE POLICY "Platform owners can insert organizations"
ON public.organizations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'platform_owner'::app_role));