-- Migration to allow admins to delete users

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if the calling user has the 'admin' role
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Not authorized to delete users';
  END IF;

  -- Delete the user from auth.users
  -- This will cascade to public.profiles and other related tables if foreign keys are set to CASCADE
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN true;
END;
$$;
