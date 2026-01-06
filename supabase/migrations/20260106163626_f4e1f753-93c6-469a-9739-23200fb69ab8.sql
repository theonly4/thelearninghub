-- Enable RLS on the view (views can have RLS in PostgreSQL 15+)
-- The view uses SECURITY INVOKER, so it inherits the underlying table's policies
-- But we need to ensure the view is accessible

-- Create a policy on the view to allow authenticated users to read
-- Since this is a view with security_invoker, the underlying quiz_questions 
-- policies will apply. We need to re-grant SELECT directly for views
GRANT SELECT ON public.quiz_questions_public TO authenticated;
GRANT SELECT ON public.quiz_questions_public TO anon;