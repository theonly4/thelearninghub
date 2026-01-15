-- Allow workforce users to view content releases only when they have an active training assignment
CREATE POLICY "Workforce users can view their assigned content releases"
  ON content_releases
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'workforce_user'::app_role) 
    AND organization_id = get_user_organization(auth.uid())
    AND EXISTS (
      SELECT 1 FROM training_assignments ta
      WHERE ta.assigned_to = auth.uid()
      AND ta.organization_id = content_releases.organization_id
    )
  );