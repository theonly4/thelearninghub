-- Drop the restrictive SELECT policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can view quiz questions" ON public.quiz_questions;

CREATE POLICY "Authenticated users can view quiz questions" 
ON public.quiz_questions 
FOR SELECT 
TO authenticated
USING (true);