-- Fix: Remove RLS policies that allow users to bypass Edge Function validation
-- This prevents users from directly inserting/updating compliance-critical records

-- 1. Drop policy allowing users to insert their own certificates
-- Certificates should ONLY be created by the submit-quiz Edge Function
DROP POLICY IF EXISTS "Users can insert their own certificates" ON certificates;

-- 2. Drop policy allowing users to insert their own quiz attempts
-- Quiz attempts should ONLY be created by authenticated quiz flow
DROP POLICY IF EXISTS "Users can insert their own quiz attempts" ON quiz_attempts;

-- 3. Drop policy allowing unrestricted quiz attempt updates
-- Replace with restricted policy for in-progress attempts only
DROP POLICY IF EXISTS "Users can update their own quiz attempts" ON quiz_attempts;

-- 4. Drop policy allowing users to insert training progress directly
-- Training progress should be validated through proper completion flow
DROP POLICY IF EXISTS "Users can insert their own training progress" ON user_training_progress;

-- 5. Drop policy allowing users to insert audit logs
-- Audit logs should ONLY be created by Edge Functions/service role
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- 6. Add restricted update policy for quiz_attempts
-- Only allow updates to attempts that haven't been completed yet
-- This allows the quiz UI to track answers while preventing score manipulation
CREATE POLICY "Users can update in-progress attempts only"
  ON quiz_attempts FOR UPDATE
  USING (user_id = auth.uid() AND completed_at IS NULL)
  WITH CHECK (user_id = auth.uid() AND completed_at IS NULL);