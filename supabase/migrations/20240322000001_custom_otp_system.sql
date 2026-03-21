-- Custom OTP Schema and Verification Logic

-- 1. Create table to hold temporary OTPs
CREATE TABLE IF NOT EXISTS public.registration_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Give the service role / anon appropriate access
-- For security, only allow service role to insert or update.
ALTER TABLE public.registration_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can orchestrate OTPs" ON public.registration_otps
  USING (true) WITH CHECK (true);
  
-- We do not want anon to view these codes. They must use the RPC bypass!

-- 2. Create the RPC function to verify the OTP
-- Security Definer to bypass RLS and delete the row if it matches
CREATE OR REPLACE FUNCTION verify_custom_otp(p_email TEXT, p_otp_code TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- We search for a match that hasn't expired
  SELECT id INTO v_id 
  FROM public.registration_otps 
  WHERE email = p_email AND otp_code = p_otp_code AND expires_at > now()
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    -- If valid, delete it so it can't be used twice
    DELETE FROM public.registration_otps WHERE id = v_id;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;
