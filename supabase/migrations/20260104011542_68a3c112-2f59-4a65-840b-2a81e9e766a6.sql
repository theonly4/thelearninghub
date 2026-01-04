-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Get the platform owner organization
  SELECT id INTO org_id FROM public.organizations WHERE slug = 'platform-owner' LIMIT 1;
  
  -- If no organization exists, create one
  IF org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug) VALUES ('Platform Owner Organization', 'platform-owner')
    RETURNING id INTO org_id;
  END IF;

  -- Create profile for the new user
  INSERT INTO public.profiles (user_id, organization_id, email, first_name, last_name, status)
  VALUES (
    new.id,
    org_id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'first_name', 'Platform'),
    COALESCE(new.raw_user_meta_data ->> 'last_name', 'Owner'),
    'active'
  );

  -- Assign platform_owner role to the first user, otherwise workforce_user
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'platform_owner') THEN
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (new.id, org_id, 'platform_owner');
  ELSE
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (new.id, org_id, 'workforce_user');
  END IF;

  RETURN new;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();