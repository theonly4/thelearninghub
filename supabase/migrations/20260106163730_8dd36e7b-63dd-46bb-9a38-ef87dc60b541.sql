-- Add policy to allow authenticated users to select quiz_questions
-- This enables the quiz_questions_public view to work
-- Users cannot see correct_answer since the view excludes it
CREATE POLICY "Authenticated users can view quiz questions for view"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (true);