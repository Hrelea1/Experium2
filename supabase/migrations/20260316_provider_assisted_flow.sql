-- Create provider_mode enum
CREATE TYPE public.provider_mode AS ENUM ('independent', 'assisted');

-- Create provider_profiles table to store the operational mode
CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode public.provider_mode NOT NULL DEFAULT 'independent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on provider_profiles
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own provider profile"
  ON public.provider_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all provider profiles"
  ON public.provider_profiles FOR ALL
  USING (is_admin());

-- Create availability_requests table for "Assisted" flow tracking
CREATE TABLE IF NOT EXISTS public.availability_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  confirm_token text NOT NULL UNIQUE,
  decline_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'declined', 'expired'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on availability_requests
ALTER TABLE public.availability_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage availability requests"
  ON public.availability_requests FOR ALL
  USING (is_admin());

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_provider_profiles_updated_at
  BEFORE UPDATE ON public.provider_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_availability_requests_updated_at
  BEFORE UPDATE ON public.availability_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill provider_profiles for existing providers
INSERT INTO public.provider_profiles (user_id, mode)
SELECT DISTINCT user_id, 'independent'::public.provider_mode
FROM public.user_roles
WHERE role = 'provider'
ON CONFLICT (user_id) DO NOTHING;

-- Function to handle expired requests
CREATE OR REPLACE FUNCTION public.handle_expired_availability_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer := 0;
  v_request RECORD;
BEGIN
  FOR v_request IN 
    SELECT r.id, r.booking_id 
    FROM public.availability_requests r
    WHERE r.status = 'pending' AND r.expires_at < now()
  LOOP
    -- Mark as expired
    UPDATE public.availability_requests SET status = 'expired' WHERE id = v_request.id;
    
    -- Update booking
    UPDATE public.bookings SET status = 'cancelled', cancellation_reason = 'Availability check timeout' 
    WHERE id = v_request.booking_id;
    
    -- We can't easily trigger the Edge Function from here without http extension
    -- But we can log it for a listener or just rely on the next fetch
    
    expired_count := expired_count + 1;
  END LOOP;
  
  RETURN expired_count;
END;
$$;
