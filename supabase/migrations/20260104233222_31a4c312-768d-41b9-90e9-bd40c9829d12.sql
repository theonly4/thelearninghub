-- Allow platform owners to manage (insert, update, delete) training assignments
CREATE POLICY "Platform owners can manage training assignments"
ON public.training_assignments
FOR ALL
USING (has_role(auth.uid(), 'platform_owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'platform_owner'::app_role));

-- Drop the view-only policy for platform owners since we now have full access
DROP POLICY IF EXISTS "Platform owners can view all training assignments" ON public.training_assignments;