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

  -- 1. Safely nullify known restrictive Foreign Keys in public schema
  -- These fields reference auth.users but often lack ON DELETE CASCADE
  
  -- Clear ambassador_id if any
  UPDATE public.experiences SET ambassador_id = NULL WHERE ambassador_id = target_user_id;
  UPDATE public.vouchers SET ambassador_id = NULL WHERE ambassador_id = target_user_id;
  
  -- Clear audit logs assuming they are updated_by, changed_by, assigned_by
  -- Note: using PL/pgSQL block to ignore errors if columns don't exist, but they should.
  BEGIN
    UPDATE public.experiences SET updated_by = NULL WHERE updated_by = target_user_id;
  EXCEPTION WHEN undefined_column THEN END;

  BEGIN
    UPDATE public.experiences SET changed_by = NULL WHERE changed_by = target_user_id;
  EXCEPTION WHEN undefined_column THEN END;

  BEGIN
    UPDATE public.experience_providers SET assigned_by = NULL WHERE assigned_by = target_user_id;
  EXCEPTION WHEN undefined_column THEN END;

  -- Delete from auth.users (Cascades to profiles, user_roles, bookings, etc. depending on schema)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN true;
END;
$$;
