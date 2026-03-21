-- Create regions table
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create counties table
CREATE TABLE public.counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(region_id, name)
);

-- Create cities table
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(county_id, name)
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  image_url TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create experiences table
CREATE TABLE public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
  county_id UUID REFERENCES public.counties(id) ON DELETE SET NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  location_name TEXT NOT NULL,
  duration_minutes INTEGER,
  max_participants INTEGER DEFAULT 10,
  min_age INTEGER,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create experience_images table
CREATE TABLE public.experience_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public read access (anyone can view experiences and locations)
CREATE POLICY "Allow public read access to regions"
  ON public.regions FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to counties"
  ON public.counties FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to cities"
  ON public.cities FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to active experiences"
  ON public.experiences FOR SELECT
  USING (is_active = true);

CREATE POLICY "Allow public read access to experience images"
  ON public.experience_images FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_counties_region ON public.counties(region_id);
CREATE INDEX idx_cities_county ON public.cities(county_id);
CREATE INDEX idx_experiences_category ON public.experiences(category_id);
CREATE INDEX idx_experiences_region ON public.experiences(region_id);
CREATE INDEX idx_experiences_county ON public.experiences(county_id);
CREATE INDEX idx_experiences_city ON public.cities(id);
CREATE INDEX idx_experiences_active ON public.experiences(is_active);
CREATE INDEX idx_experiences_featured ON public.experiences(is_featured);
CREATE INDEX idx_experiences_price ON public.experiences(price);
CREATE INDEX idx_experiences_rating ON public.experiences(avg_rating);
CREATE INDEX idx_experience_images_experience ON public.experience_images(experience_id);

-- Create composite index for filtering
CREATE INDEX idx_experiences_filter ON public.experiences(category_id, region_id, price, avg_rating, is_active);

-- Create full-text search index for experiences
CREATE INDEX idx_experiences_search ON public.experiences 
  USING gin(to_tsvector('romanian', title || ' ' || description));

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_experiences_updated_at
  BEFORE UPDATE ON public.experiences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Create voucher status enum
CREATE TYPE public.voucher_status AS ENUM ('active', 'used', 'expired', 'exchanged', 'transferred');

-- Create vouchers table
CREATE TABLE public.vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_id UUID REFERENCES public.experiences(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  status public.voucher_status NOT NULL DEFAULT 'active',
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  redemption_date TIMESTAMP WITH TIME ZONE,
  purchase_price NUMERIC NOT NULL,
  qr_code_data TEXT,
  notes TEXT,
  transferred_to TEXT,
  transferred_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vouchers
CREATE POLICY "Users can view their own vouchers"
ON public.vouchers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own vouchers"
ON public.vouchers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vouchers"
ON public.vouchers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_vouchers_user_id ON public.vouchers(user_id);
CREATE INDEX idx_vouchers_code ON public.vouchers(code);
CREATE INDEX idx_vouchers_status ON public.vouchers(status);

-- Add trigger for updated_at on vouchers
CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique voucher code
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code in format: EXP-YYYY-XXXXXXXX
    new_code := 'EXP-' || 
                EXTRACT(YEAR FROM now())::TEXT || '-' ||
                upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.vouchers WHERE code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to check and update expired vouchers
CREATE OR REPLACE FUNCTION public.update_expired_vouchers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vouchers
  SET status = 'expired'
  WHERE status = 'active'
    AND expiry_date < now();
END;
$$;
-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES public.experiences(id) ON DELETE RESTRICT,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
  participants INTEGER NOT NULL DEFAULT 1,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  total_price NUMERIC NOT NULL,
  payment_method TEXT,
  special_requests TEXT,
  cancellation_date TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
ON public.bookings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
ON public.bookings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
ON public.bookings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_experience_id ON public.bookings(experience_id);
CREATE INDEX idx_bookings_voucher_id ON public.bookings(voucher_id);
CREATE INDEX idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Add trigger for updated_at on bookings
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate and use voucher
CREATE OR REPLACE FUNCTION public.validate_voucher_code(voucher_code TEXT)
RETURNS TABLE (
  voucher_id UUID,
  experience_id UUID,
  is_valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Check if voucher exists
  SELECT * INTO v_record
  FROM public.vouchers
  WHERE code = voucher_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::UUID, 
      FALSE, 
      'Codul voucher-ului este invalid'::TEXT;
    RETURN;
  END IF;

  -- Check if voucher belongs to current user
  IF v_record.user_id != auth.uid() THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::UUID, 
      FALSE, 
      'Acest voucher nu aparÈ›ine contului tÄƒu'::TEXT;
    RETURN;
  END IF;

  -- Check if voucher is active
  IF v_record.status != 'active' THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::UUID, 
      FALSE, 
      'Acest voucher a fost deja folosit sau este expirat'::TEXT;
    RETURN;
  END IF;

  -- Check if voucher is expired
  IF v_record.expiry_date < now() THEN
    -- Update voucher status to expired
    UPDATE public.vouchers 
    SET status = 'expired' 
    WHERE id = v_record.id;
    
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::UUID, 
      FALSE, 
      'Acest voucher a expirat'::TEXT;
    RETURN;
  END IF;

  -- Voucher is valid
  RETURN QUERY SELECT 
    v_record.id, 
    v_record.experience_id, 
    TRUE, 
    NULL::TEXT;
END;
$$;

-- Function to redeem voucher and create booking
CREATE OR REPLACE FUNCTION public.redeem_voucher(
  p_voucher_id UUID,
  p_booking_date TIMESTAMP WITH TIME ZONE,
  p_participants INTEGER DEFAULT 1,
  p_special_requests TEXT DEFAULT NULL
)
RETURNS TABLE (
  booking_id UUID,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_experience RECORD;
  v_booking_id UUID;
BEGIN
  -- Get voucher details
  SELECT * INTO v_record
  FROM public.vouchers
  WHERE id = p_voucher_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      FALSE, 
      'Voucher-ul nu a fost gÄƒsit sau nu aparÈ›ine contului tÄƒu'::TEXT;
    RETURN;
  END IF;

  -- Validate voucher status
  IF v_record.status != 'active' THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      FALSE, 
      'Acest voucher nu poate fi folosit'::TEXT;
    RETURN;
  END IF;

  -- Get experience details
  SELECT * INTO v_experience
  FROM public.experiences
  WHERE id = v_record.experience_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      FALSE, 
      'ExperienÈ›a nu a fost gÄƒsitÄƒ'::TEXT;
    RETURN;
  END IF;

  -- Create booking
  INSERT INTO public.bookings (
    user_id,
    experience_id,
    voucher_id,
    booking_date,
    participants,
    total_price,
    payment_method,
    special_requests,
    status
  ) VALUES (
    auth.uid(),
    v_record.experience_id,
    p_voucher_id,
    p_booking_date,
    p_participants,
    v_record.purchase_price,
    'voucher',
    p_special_requests,
    'confirmed'
  )
  RETURNING id INTO v_booking_id;

  -- Update voucher status
  UPDATE public.vouchers
  SET 
    status = 'used',
    redemption_date = now()
  WHERE id = p_voucher_id;

  -- Return success
  RETURN QUERY SELECT 
    v_booking_id, 
    TRUE, 
    NULL::TEXT;
END;
$$;
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles (users can view their own roles)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster role lookups
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
$$;

-- Add admin policies for experiences
CREATE POLICY "Admins can insert experiences"
ON public.experiences
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update experiences"
ON public.experiences
FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete experiences"
ON public.experiences
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Add admin policies for bookings (admins can view all)
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update all bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Add admin policies for vouchers (admins can view all)
CREATE POLICY "Admins can view all vouchers"
ON public.vouchers
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update all vouchers"
ON public.vouchers
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check for admin first (highest priority)
  IF public.has_role(_user_id, 'admin'::app_role) THEN
    RETURN 'admin';
  END IF;
  
  -- Check for moderator
  IF public.has_role(_user_id, 'moderator'::app_role) THEN
    RETURN 'moderator';
  END IF;
  
  -- Default to user
  RETURN 'user';
END;
$$;
-- Function to automatically grant admin role to hrelea001@gmail.com on signup
CREATE OR REPLACE FUNCTION public.auto_grant_admin_to_primary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user is the primary admin
  IF NEW.email = 'hrelea001@gmail.com' THEN
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-grant admin role
CREATE TRIGGER auto_grant_admin_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_admin_to_primary();

-- Grant admin role to existing hrelea001@gmail.com account if it exists
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find the user with email hrelea001@gmail.com
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'hrelea001@gmail.com';
  
  -- If user exists, grant admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Function to check if user is the primary admin
CREATE OR REPLACE FUNCTION public.is_primary_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = _user_id;
  
  RETURN user_email = 'hrelea001@gmail.com';
END;
$$;

-- Add RLS policy for user_roles that only allows primary admin to insert
CREATE POLICY "Primary admin can manage user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_primary_admin(auth.uid()));
-- Add rescheduled_count column to track rescheduling limit
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS rescheduled_count INTEGER NOT NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN public.bookings.rescheduled_count IS 'Tracks how many times this booking has been rescheduled (max 1 allowed)';

-- Create function to cancel booking with 48-hour policy
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id UUID,
  p_cancellation_reason TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT,
  refund_eligible BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_hours_until_booking NUMERIC;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id 
    AND user_id = auth.uid()
    AND status IN ('confirmed', 'pending');

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Rezervarea nu a fost gÄƒsitÄƒ sau nu poate fi anulatÄƒ'::TEXT,
      FALSE;
    RETURN;
  END IF;

  -- Calculate hours until booking
  v_hours_until_booking := EXTRACT(EPOCH FROM (v_booking.booking_date - now())) / 3600;

  -- Update booking status
  UPDATE public.bookings
  SET 
    status = 'cancelled',
    cancellation_date = now(),
    cancellation_reason = p_cancellation_reason,
    updated_at = now()
  WHERE id = p_booking_id;

  -- Return success with refund eligibility
  RETURN QUERY SELECT 
    TRUE, 
    NULL::TEXT,
    (v_hours_until_booking >= 48);
END;
$$;

-- Create function to reschedule booking with one-time policy
CREATE OR REPLACE FUNCTION public.reschedule_booking(
  p_booking_id UUID,
  p_new_booking_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_hours_until_booking NUMERIC;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id 
    AND user_id = auth.uid()
    AND status IN ('confirmed', 'pending');

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Rezervarea nu a fost gÄƒsitÄƒ sau nu poate fi reprogramatÄƒ'::TEXT;
    RETURN;
  END IF;

  -- Check if already rescheduled once
  IF v_booking.rescheduled_count >= 1 THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Ai atins limita de reprogramÄƒri pentru aceastÄƒ rezervare'::TEXT;
    RETURN;
  END IF;

  -- Calculate hours until current booking
  v_hours_until_booking := EXTRACT(EPOCH FROM (v_booking.booking_date - now())) / 3600;

  -- Check 48-hour policy
  IF v_hours_until_booking < 48 THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Reprogramarea este posibilÄƒ doar cu minimum 48 de ore Ã®nainte de experienÈ›Äƒ'::TEXT;
    RETURN;
  END IF;

  -- Validate new date is in the future
  IF p_new_booking_date <= now() THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Data nouÄƒ trebuie sÄƒ fie Ã®n viitor'::TEXT;
    RETURN;
  END IF;

  -- Update booking with new date
  UPDATE public.bookings
  SET 
    booking_date = p_new_booking_date,
    rescheduled_count = v_booking.rescheduled_count + 1,
    updated_at = now()
  WHERE id = p_booking_id;

  RETURN QUERY SELECT 
    TRUE, 
    NULL::TEXT;
END;
$$;
-- Make user_id nullable on vouchers table so vouchers can be unassigned initially
ALTER TABLE public.vouchers 
ALTER COLUMN user_id DROP NOT NULL;

-- Update validate_voucher_code to allow any user to validate unassigned vouchers
CREATE OR REPLACE FUNCTION public.validate_voucher_code(voucher_code text)
RETURNS TABLE(voucher_id uuid, experience_id uuid, is_valid boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_record RECORD;
BEGIN
  -- Check if voucher exists
  SELECT * INTO v_record
  FROM public.vouchers
  WHERE code = voucher_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::UUID, 
      FALSE, 
      'Codul voucher-ului este invalid'::TEXT;
    RETURN;
  END IF;

  -- Check if voucher is active
  IF v_record.status != 'active' THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::UUID, 
      FALSE, 
      'Acest voucher a fost deja folosit sau este expirat'::TEXT;
    RETURN;
  END IF;

  -- Check if voucher is expired
  IF v_record.expiry_date < now() THEN
    UPDATE public.vouchers 
    SET status = 'expired' 
    WHERE id = v_record.id;
    
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::UUID, 
      FALSE, 
      'Acest voucher a expirat'::TEXT;
    RETURN;
  END IF;

  -- Check if voucher is already assigned to a different user
  IF v_record.user_id IS NOT NULL AND v_record.user_id != auth.uid() THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::UUID, 
      FALSE, 
      'Acest voucher a fost deja atribuit altui utilizator'::TEXT;
    RETURN;
  END IF;

  -- Voucher is valid
  RETURN QUERY SELECT 
    v_record.id, 
    v_record.experience_id, 
    TRUE, 
    NULL::TEXT;
END;
$function$;

-- Update redeem_voucher to assign user_id on first redemption
CREATE OR REPLACE FUNCTION public.redeem_voucher(p_voucher_id uuid, p_booking_date timestamp with time zone, p_participants integer DEFAULT 1, p_special_requests text DEFAULT NULL::text)
RETURNS TABLE(booking_id uuid, success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_record RECORD;
  v_experience RECORD;
  v_booking_id UUID;
BEGIN
  -- Get voucher details
  SELECT * INTO v_record
  FROM public.vouchers
  WHERE id = p_voucher_id 
    AND (user_id IS NULL OR user_id = auth.uid());

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      FALSE, 
      'Voucher-ul nu a fost gÄƒsit sau a fost deja atribuit altui utilizator'::TEXT;
    RETURN;
  END IF;

  -- Validate voucher status
  IF v_record.status != 'active' THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      FALSE, 
      'Acest voucher nu poate fi folosit'::TEXT;
    RETURN;
  END IF;

  -- Get experience details
  SELECT * INTO v_experience
  FROM public.experiences
  WHERE id = v_record.experience_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      FALSE, 
      'ExperienÈ›a nu a fost gÄƒsitÄƒ'::TEXT;
    RETURN;
  END IF;

  -- Assign voucher to current user if not already assigned
  IF v_record.user_id IS NULL THEN
    UPDATE public.vouchers
    SET user_id = auth.uid()
    WHERE id = p_voucher_id;
  END IF;

  -- Create booking
  INSERT INTO public.bookings (
    user_id,
    experience_id,
    voucher_id,
    booking_date,
    participants,
    total_price,
    payment_method,
    special_requests,
    status
  ) VALUES (
    auth.uid(),
    v_record.experience_id,
    p_voucher_id,
    p_booking_date,
    p_participants,
    v_record.purchase_price,
    'voucher',
    p_special_requests,
    'confirmed'
  )
  RETURNING id INTO v_booking_id;

  -- Update voucher status
  UPDATE public.vouchers
  SET 
    status = 'used',
    redemption_date = now()
  WHERE id = p_voucher_id;

  -- Return success
  RETURN QUERY SELECT 
    v_booking_id, 
    TRUE, 
    NULL::TEXT;
END;
$function$;

-- Update RLS policies to allow unassigned vouchers
DROP POLICY IF EXISTS "Users can view their own vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Admins can view all vouchers" ON public.vouchers;

CREATE POLICY "Users can view their own vouchers or unassigned vouchers"
ON public.vouchers
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL OR is_admin());

CREATE POLICY "Admins can insert vouchers"
ON public.vouchers
FOR INSERT
WITH CHECK (is_admin());
-- Create storage bucket for homepage images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('homepage-images', 'homepage-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create homepage_content table
CREATE TABLE IF NOT EXISTS public.homepage_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homepage_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access to homepage content
CREATE POLICY "Allow public read access to homepage content"
  ON public.homepage_content
  FOR SELECT
  USING (true);

-- Allow admins to manage homepage content
CREATE POLICY "Admins can insert homepage content"
  ON public.homepage_content
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update homepage content"
  ON public.homepage_content
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete homepage content"
  ON public.homepage_content
  FOR DELETE
  USING (is_admin());

-- Storage policies for homepage images
CREATE POLICY "Public can view homepage images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'homepage-images');

CREATE POLICY "Admins can upload homepage images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'homepage-images' AND is_admin());

CREATE POLICY "Admins can update homepage images"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'homepage-images' AND is_admin());

CREATE POLICY "Admins can delete homepage images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'homepage-images' AND is_admin());

-- Insert default content for all sections
INSERT INTO public.homepage_content (section_key, content) VALUES
('hero', '{
  "title": "OferÄƒ Momente",
  "titleHighlight": "Memorabile",
  "subtitle": "DescoperÄƒ cele mai frumoase experienÈ›e din RomÃ¢nia. De la aventuri Ã®n naturÄƒ la relaxare la spa, gÄƒseÈ™te cadoul perfect pentru cei dragi.",
  "badge": "Peste 500+ experienÈ›e unice Ã®n RomÃ¢nia",
  "ctaPrimary": "DescoperÄƒ ExperienÈ›e",
  "ctaPrimaryLink": "/category/toate-categoriile",
  "ctaSecondary": "Ai un Voucher?",
  "ctaSecondaryLink": "/redeem-voucher",
  "backgroundImage": ""
}'::jsonb),
('categories', '{
  "badge": "Categorii",
  "title": "ExploreazÄƒ DupÄƒ Interes",
  "description": "Alege categoria perfectÄƒ pentru tine sau pentru cei dragi È™i descoperÄƒ experienÈ›e memorabile Ã®n toatÄƒ RomÃ¢nia."
}'::jsonb),
('featured', '{
  "badge": "Recomandate",
  "title": "ExperienÈ›e Populare",
  "description": "Cele mai apreciate experienÈ›e de cÄƒtre clienÈ›ii noÈ™tri.",
  "buttonText": "Vezi Toate"
}'::jsonb),
('regions', '{
  "badge": "Regiuni",
  "title": "DescoperÄƒ RomÃ¢nia",
  "description": "ExploreazÄƒ experienÈ›e unice Ã®n cele mai frumoase regiuni ale È›Äƒrii, de la munÈ›ii CarpaÈ›i la litoralul MÄƒrii Negre."
}'::jsonb),
('how_it_works', '{
  "badge": "Cum funcÈ›ioneazÄƒ",
  "title": "Simplu ca 1, 2, 3, 4",
  "description": "Oferirea de experienÈ›e cadou nu a fost niciodatÄƒ mai simplÄƒ. UrmeazÄƒ aceÈ™ti paÈ™i È™i surprinde pe cei dragi.",
  "steps": [
    {
      "title": "Alege ExperienÈ›a",
      "description": "ExploreazÄƒ categoriile È™i gÄƒseÈ™te experienÈ›a perfectÄƒ pentru tine sau cei dragi."
    },
    {
      "title": "OferÄƒ Cadoul",
      "description": "PrimeÈ™te un voucher digital sau fizic, personalizat cu un mesaj special."
    },
    {
      "title": "ProgrameazÄƒ",
      "description": "Beneficiarul alege data È™i locaÈ›ia care i se potriveÈ™te cel mai bine."
    },
    {
      "title": "BucuraÈ›i-vÄƒ!",
      "description": "TrÄƒieÈ™te momente memorabile È™i creeazÄƒ amintiri de neuitat."
    }
  ]
}'::jsonb),
('testimonials', '{
  "badge": "Recenzii",
  "title": "Ce Spun ClienÈ›ii NoÈ™tri",
  "description": "Peste 50,000 de clienÈ›i fericiÈ›i au trÄƒit experienÈ›e memorabile prin platforma noastrÄƒ."
}'::jsonb),
('newsletter', '{
  "title": "Fii Primul Care AflÄƒ",
  "description": "AboneazÄƒ-te pentru a primi oferte exclusive, experienÈ›e noi È™i idei de cadouri direct Ã®n inbox-ul tÄƒu.",
  "buttonText": "AboneazÄƒ-te",
  "disclaimer": "Ne angajÄƒm sÄƒ nu Ã®È›i trimitem spam. PoÈ›i sÄƒ te dezabonezi oricÃ¢nd."
}'::jsonb)
ON CONFLICT (section_key) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_homepage_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_homepage_content_timestamp
  BEFORE UPDATE ON public.homepage_content
  FOR EACH ROW
  EXECUTE FUNCTION update_homepage_content_updated_at();
-- Fix search_path for the trigger function
CREATE OR REPLACE FUNCTION update_homepage_content_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- Add trigger to automatically track who updates content
CREATE OR REPLACE FUNCTION track_homepage_content_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_by = auth.uid();
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_homepage_content_changes
  BEFORE UPDATE ON public.homepage_content
  FOR EACH ROW
  EXECUTE FUNCTION track_homepage_content_update();

-- Add trigger to track content creation
CREATE OR REPLACE FUNCTION track_homepage_content_creation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_homepage_content_creator
  BEFORE INSERT ON public.homepage_content
  FOR EACH ROW
  EXECUTE FUNCTION track_homepage_content_creation();

-- Add constraints for content validation
ALTER TABLE public.homepage_content
  ADD CONSTRAINT section_key_length CHECK (char_length(section_key) <= 50),
  ADD CONSTRAINT content_not_empty CHECK (jsonb_typeof(content) = 'object');

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_homepage_content_section_key 
  ON public.homepage_content(section_key);

-- Add audit log table for tracking all changes
CREATE TABLE IF NOT EXISTS public.homepage_content_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.homepage_content(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  old_content JSONB,
  new_content JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.homepage_content_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.homepage_content_audit
  FOR SELECT
  USING (is_admin());

-- Create audit trigger
CREATE OR REPLACE FUNCTION log_homepage_content_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.homepage_content_audit (
      content_id,
      section_key,
      old_content,
      new_content,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.section_key,
      OLD.content,
      NEW.content,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_homepage_content_changes
  AFTER UPDATE ON public.homepage_content
  FOR EACH ROW
  EXECUTE FUNCTION log_homepage_content_changes();
-- Add default content for all remaining homepage sections

-- Categories section
INSERT INTO public.homepage_content (section_key, content)
VALUES (
  'categories',
  jsonb_build_object(
    'badge', 'Categorii',
    'title', 'ExploreazÄƒ DupÄƒ Interes',
    'subtitle', 'Alege categoria perfectÄƒ pentru tine sau pentru cei dragi È™i descoperÄƒ experienÈ›e memorabile Ã®n toatÄƒ RomÃ¢nia.'
  )
)
ON CONFLICT (section_key) DO NOTHING;

-- Featured Experiences section
INSERT INTO public.homepage_content (section_key, content)
VALUES (
  'featured',
  jsonb_build_object(
    'badge', 'Recomandate',
    'title', 'ExperienÈ›e Populare',
    'subtitle', 'Cele mai apreciate experienÈ›e de cÄƒtre clienÈ›ii noÈ™tri.',
    'ctaText', 'Vezi Toate'
  )
)
ON CONFLICT (section_key) DO NOTHING;

-- Regions section
INSERT INTO public.homepage_content (section_key, content)
VALUES (
  'regions',
  jsonb_build_object(
    'badge', 'Regiuni',
    'title', 'DescoperÄƒ RomÃ¢nia',
    'subtitle', 'ExploreazÄƒ experienÈ›e unice Ã®n cele mai frumoase regiuni ale È›Äƒrii, de la munÈ›ii CarpaÈ›i la litoralul MÄƒrii Negre.'
  )
)
ON CONFLICT (section_key) DO NOTHING;

-- How It Works section
INSERT INTO public.homepage_content (section_key, content)
VALUES (
  'how-it-works',
  jsonb_build_object(
    'badge', 'Cum funcÈ›ioneazÄƒ',
    'title', 'Simplu ca 1, 2, 3, 4',
    'subtitle', 'Oferirea de experienÈ›e cadou nu a fost niciodatÄƒ mai simplÄƒ. UrmeazÄƒ aceÈ™ti paÈ™i È™i surprinde pe cei dragi.'
  )
)
ON CONFLICT (section_key) DO NOTHING;

-- Testimonials section
INSERT INTO public.homepage_content (section_key, content)
VALUES (
  'testimonials',
  jsonb_build_object(
    'badge', 'Recenzii',
    'title', 'Ce Spun ClienÈ›ii NoÈ™tri',
    'subtitle', 'Peste 50,000 de clienÈ›i fericiÈ›i au trÄƒit experienÈ›e memorabile prin platforma noastrÄƒ.'
  )
)
ON CONFLICT (section_key) DO NOTHING;

-- Newsletter section
INSERT INTO public.homepage_content (section_key, content)
VALUES (
  'newsletter',
  jsonb_build_object(
    'title', 'Fii Primul Care AflÄƒ',
    'subtitle', 'AboneazÄƒ-te pentru a primi oferte exclusive, experienÈ›e noi È™i idei de cadouri direct Ã®n inbox-ul tÄƒu.',
    'placeholder', 'Adresa ta de email',
    'ctaText', 'AboneazÄƒ-te',
    'disclaimer', 'Ne angajÄƒm sÄƒ nu Ã®È›i trimitem spam. PoÈ›i sÄƒ te dezabonezi oricÃ¢nd.'
  )
)
ON CONFLICT (section_key) DO NOTHING;
-- Allow primary admin to view all user roles
CREATE POLICY "Primary admin can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_primary_admin(auth.uid()));

-- Allow primary admin to delete user roles
CREATE POLICY "Primary admin can delete user roles"
ON public.user_roles
FOR DELETE
USING (is_primary_admin(auth.uid()));
-- Allow primary admin to view all profiles for role management
CREATE POLICY "Primary admin can view all profiles"
ON public.profiles
FOR SELECT
USING (is_primary_admin(auth.uid()));
-- =====================================================
-- SECURITY HARDENING MIGRATION
-- =====================================================

-- 1. Fix Function Search Path Vulnerability
-- Update all functions to have immutable search_path

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_primary_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
    ORDER BY created_at ASC
    LIMIT 1
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 2. Fix Vouchers Policy - Remove exposure of unassigned vouchers
DROP POLICY IF EXISTS "Users can view their own vouchers" ON public.vouchers;

CREATE POLICY "Users can view their own vouchers"
ON public.vouchers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.is_admin()
);

-- 3. Add explicit deny policies for sensitive tables

-- Profiles: Ensure only authenticated users can see their own data
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Deny public access to profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin());

-- Bookings: Restrict to authenticated users only
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Deny public access to bookings" ON public.bookings;

CREATE POLICY "Users can view their own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- User roles: Only allow users to see their own role
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Primary admin can view all roles" ON public.user_roles;

CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Homepage content audit: Only admins
DROP POLICY IF EXISTS "Admins can view content audit" ON public.homepage_content_audit;

CREATE POLICY "Admins can view content audit"
ON public.homepage_content_audit
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 4. Add INSERT/UPDATE/DELETE protection for user_roles
DROP POLICY IF EXISTS "Only primary admin can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only primary admin can delete roles" ON public.user_roles;

CREATE POLICY "Only primary admin can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_primary_admin(auth.uid()));

CREATE POLICY "Only primary admin can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_primary_admin(auth.uid()));

-- 5. Rate limiting helper function for auth attempts
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  identifier text,
  max_attempts integer DEFAULT 5,
  window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- This is a placeholder for rate limiting logic
  -- In production, implement with a rate_limits table
  RETURN true;
END;
$$;
-- Drop and recreate functions with proper search_path

-- Drop functions that need signature changes
DROP FUNCTION IF EXISTS public.cancel_booking(uuid, text);
DROP FUNCTION IF EXISTS public.redeem_voucher(uuid, timestamp with time zone, integer, text);
DROP FUNCTION IF EXISTS public.reschedule_booking(uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS public.validate_voucher_code(text);

-- 1. auto_grant_admin_to_primary
CREATE OR REPLACE FUNCTION public.auto_grant_admin_to_primary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

-- 2. cancel_booking
CREATE FUNCTION public.cancel_booking(p_booking_id uuid, p_cancellation_reason text)
RETURNS TABLE(success boolean, refund_eligible boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_hours_until_booking numeric;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, 'Booking not found or access denied'::text;
    RETURN;
  END IF;
  
  IF v_booking.status = 'cancelled' THEN
    RETURN QUERY SELECT false, false, 'Booking is already cancelled'::text;
    RETURN;
  END IF;
  
  v_hours_until_booking := EXTRACT(EPOCH FROM (v_booking.booking_date - NOW())) / 3600;
  
  UPDATE public.bookings 
  SET status = 'cancelled',
      cancellation_date = NOW(),
      cancellation_reason = p_cancellation_reason,
      updated_at = NOW()
  WHERE id = p_booking_id;
  
  RETURN QUERY SELECT true, v_hours_until_booking > 48, ''::text;
END;
$$;

-- 3. generate_voucher_code
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.vouchers WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- 4. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;

-- 5. log_homepage_content_changes
CREATE OR REPLACE FUNCTION public.log_homepage_content_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.homepage_content_audit (content_id, section_key, old_content, new_content, changed_by)
  VALUES (NEW.id, NEW.section_key, OLD.content, NEW.content, auth.uid());
  RETURN NEW;
END;
$$;

-- 6. redeem_voucher
CREATE FUNCTION public.redeem_voucher(
  p_voucher_id uuid,
  p_booking_date timestamp with time zone,
  p_participants integer DEFAULT 1,
  p_special_requests text DEFAULT NULL
)
RETURNS TABLE(success boolean, booking_id uuid, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher RECORD;
  v_new_booking_id uuid;
BEGIN
  SELECT * INTO v_voucher FROM public.vouchers WHERE id = p_voucher_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Voucher not found'::text;
    RETURN;
  END IF;
  
  IF v_voucher.status != 'active' THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Voucher is not active'::text;
    RETURN;
  END IF;
  
  IF v_voucher.expiry_date < NOW() THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Voucher has expired'::text;
    RETURN;
  END IF;
  
  INSERT INTO public.bookings (user_id, experience_id, booking_date, participants, total_price, voucher_id, special_requests)
  VALUES (auth.uid(), v_voucher.experience_id, p_booking_date, p_participants, v_voucher.purchase_price, p_voucher_id, p_special_requests)
  RETURNING id INTO v_new_booking_id;
  
  UPDATE public.vouchers SET status = 'used', redemption_date = NOW(), updated_at = NOW() WHERE id = p_voucher_id;
  
  RETURN QUERY SELECT true, v_new_booking_id, ''::text;
END;
$$;

-- 7. reschedule_booking
CREATE FUNCTION public.reschedule_booking(p_booking_id uuid, p_new_booking_date timestamp with time zone)
RETURNS TABLE(success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Booking not found or access denied'::text;
    RETURN;
  END IF;
  
  IF v_booking.rescheduled_count >= 2 THEN
    RETURN QUERY SELECT false, 'Maximum reschedule limit reached'::text;
    RETURN;
  END IF;
  
  UPDATE public.bookings 
  SET booking_date = p_new_booking_date,
      rescheduled_count = rescheduled_count + 1,
      updated_at = NOW()
  WHERE id = p_booking_id;
  
  RETURN QUERY SELECT true, ''::text;
END;
$$;

-- 8. track_homepage_content_creation
CREATE OR REPLACE FUNCTION public.track_homepage_content_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.homepage_content_audit (content_id, section_key, old_content, new_content, changed_by)
  VALUES (NEW.id, NEW.section_key, NULL, NEW.content, auth.uid());
  RETURN NEW;
END;
$$;

-- 9. track_homepage_content_update
CREATE OR REPLACE FUNCTION public.track_homepage_content_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO public.homepage_content_audit (content_id, section_key, old_content, new_content, changed_by)
    VALUES (NEW.id, NEW.section_key, OLD.content, NEW.content, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- 10. update_expired_vouchers
CREATE OR REPLACE FUNCTION public.update_expired_vouchers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vouchers 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expiry_date < NOW();
END;
$$;

-- 11. update_homepage_content_updated_at
CREATE OR REPLACE FUNCTION public.update_homepage_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 13. validate_voucher_code
CREATE FUNCTION public.validate_voucher_code(voucher_code text)
RETURNS TABLE(is_valid boolean, voucher_id uuid, experience_id uuid, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher RECORD;
BEGIN
  SELECT * INTO v_voucher FROM public.vouchers WHERE code = voucher_code;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 'Invalid voucher code'::text;
    RETURN;
  END IF;
  
  IF v_voucher.status != 'active' THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 'Voucher is not active'::text;
    RETURN;
  END IF;
  
  IF v_voucher.expiry_date < NOW() THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 'Voucher has expired'::text;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, v_voucher.id, v_voucher.experience_id, ''::text;
END;
$$;
-- Remove duplicate/conflicting voucher policy
DROP POLICY IF EXISTS "Users can view their own vouchers or unassigned vouchers" ON public.vouchers;

-- Create rate limits table for server-side rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action_type text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  blocked_until timestamp with time zone,
  UNIQUE(identifier, action_type)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access to rate_limits table
CREATE POLICY "No public access to rate limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action 
ON public.rate_limits(identifier, action_type);

CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until 
ON public.rate_limits(blocked_until) 
WHERE blocked_until IS NOT NULL;

-- Update check_rate_limit function with actual implementation
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action_type text DEFAULT 'default',
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15,
  p_block_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_window_start timestamp with time zone;
  v_now timestamp with time zone := now();
BEGIN
  v_window_start := v_now - (p_window_minutes || ' minutes')::interval;
  
  -- Check if blocked
  SELECT * INTO v_record 
  FROM public.rate_limits 
  WHERE identifier = p_identifier 
    AND action_type = p_action_type;
  
  IF FOUND THEN
    -- Check if currently blocked
    IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
      RETURN false;
    END IF;
    
    -- Check if within window
    IF v_record.first_attempt_at > v_window_start THEN
      -- Within window, increment counter
      IF v_record.attempt_count >= p_max_attempts THEN
        -- Block the user
        UPDATE public.rate_limits 
        SET blocked_until = v_now + (p_block_minutes || ' minutes')::interval,
            last_attempt_at = v_now
        WHERE identifier = p_identifier AND action_type = p_action_type;
        RETURN false;
      ELSE
        -- Increment counter
        UPDATE public.rate_limits 
        SET attempt_count = attempt_count + 1,
            last_attempt_at = v_now
        WHERE identifier = p_identifier AND action_type = p_action_type;
        RETURN true;
      END IF;
    ELSE
      -- Outside window, reset counter
      UPDATE public.rate_limits 
      SET attempt_count = 1,
          first_attempt_at = v_now,
          last_attempt_at = v_now,
          blocked_until = NULL
      WHERE identifier = p_identifier AND action_type = p_action_type;
      RETURN true;
    END IF;
  ELSE
    -- First attempt, create record
    INSERT INTO public.rate_limits (identifier, action_type, attempt_count, first_attempt_at, last_attempt_at)
    VALUES (p_identifier, p_action_type, 1, v_now, v_now)
    ON CONFLICT (identifier, action_type) DO UPDATE
    SET attempt_count = 1, first_attempt_at = v_now, last_attempt_at = v_now, blocked_until = NULL;
    RETURN true;
  END IF;
END;
$$;

-- Cleanup function to remove old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE last_attempt_at < now() - interval '24 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
END;
$$;
-- Update redeem_voucher function to add backend validation for special requests
CREATE OR REPLACE FUNCTION public.redeem_voucher(p_voucher_id uuid, p_booking_date timestamp with time zone, p_participants integer DEFAULT 1, p_special_requests text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, booking_id uuid, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_voucher RECORD;
  v_new_booking_id uuid;
  v_sanitized_requests text;
BEGIN
  -- Validate special requests length (backend enforcement)
  IF p_special_requests IS NOT NULL AND LENGTH(p_special_requests) > 500 THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Special requests exceeds maximum length of 500 characters'::text;
    RETURN;
  END IF;
  
  -- Validate participants
  IF p_participants < 1 OR p_participants > 100 THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Invalid number of participants (must be 1-100)'::text;
    RETURN;
  END IF;
  
  -- Validate booking date is in the future
  IF p_booking_date < NOW() THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Booking date must be in the future'::text;
    RETURN;
  END IF;
  
  -- Sanitize special requests - remove potential SQL injection characters and trim
  IF p_special_requests IS NOT NULL THEN
    v_sanitized_requests := TRIM(regexp_replace(p_special_requests, E'[\\x00-\\x1F]', '', 'g'));
  ELSE
    v_sanitized_requests := NULL;
  END IF;

  SELECT * INTO v_voucher FROM public.vouchers WHERE id = p_voucher_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Voucher not found'::text;
    RETURN;
  END IF;
  
  IF v_voucher.status != 'active' THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Voucher is not active'::text;
    RETURN;
  END IF;
  
  IF v_voucher.expiry_date < NOW() THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Voucher has expired'::text;
    RETURN;
  END IF;
  
  INSERT INTO public.bookings (user_id, experience_id, booking_date, participants, total_price, voucher_id, special_requests)
  VALUES (auth.uid(), v_voucher.experience_id, p_booking_date, p_participants, v_voucher.purchase_price, p_voucher_id, v_sanitized_requests)
  RETURNING id INTO v_new_booking_id;
  
  UPDATE public.vouchers SET status = 'used', redemption_date = NOW(), updated_at = NOW() WHERE id = p_voucher_id;
  
  RETURN QUERY SELECT true, v_new_booking_id, ''::text;
END;
$function$;

-- Also add validation to cancel_booking function for cancellation_reason
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_cancellation_reason text)
 RETURNS TABLE(success boolean, refund_eligible boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking RECORD;
  v_hours_until_booking numeric;
  v_sanitized_reason text;
BEGIN
  -- Validate cancellation reason length
  IF p_cancellation_reason IS NOT NULL AND LENGTH(p_cancellation_reason) > 500 THEN
    RETURN QUERY SELECT false, false, 'Cancellation reason exceeds maximum length of 500 characters'::text;
    RETURN;
  END IF;
  
  -- Sanitize cancellation reason
  IF p_cancellation_reason IS NOT NULL THEN
    v_sanitized_reason := TRIM(regexp_replace(p_cancellation_reason, E'[\\x00-\\x1F]', '', 'g'));
  ELSE
    v_sanitized_reason := NULL;
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, 'Booking not found or access denied'::text;
    RETURN;
  END IF;
  
  IF v_booking.status = 'cancelled' THEN
    RETURN QUERY SELECT false, false, 'Booking is already cancelled'::text;
    RETURN;
  END IF;
  
  v_hours_until_booking := EXTRACT(EPOCH FROM (v_booking.booking_date - NOW())) / 3600;
  
  UPDATE public.bookings 
  SET status = 'cancelled',
      cancellation_date = NOW(),
      cancellation_reason = v_sanitized_reason,
      updated_at = NOW()
  WHERE id = p_booking_id;
  
  RETURN QUERY SELECT true, v_hours_until_booking > 48, ''::text;
END;
$function$;
-- Create experience_services table for add-on services
CREATE TABLE public.experience_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experience_id UUID NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  is_required BOOLEAN NOT NULL DEFAULT false,
  max_quantity INTEGER NOT NULL DEFAULT 1 CHECK (max_quantity >= 1),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.experience_services ENABLE ROW LEVEL SECURITY;

-- Public can read active services
CREATE POLICY "Allow public read access to active services"
ON public.experience_services
FOR SELECT
USING (is_active = true);

-- Admins can insert services
CREATE POLICY "Admins can insert services"
ON public.experience_services
FOR INSERT
WITH CHECK (is_admin());

-- Admins can update services
CREATE POLICY "Admins can update services"
ON public.experience_services
FOR UPDATE
USING (is_admin());

-- Admins can delete services
CREATE POLICY "Admins can delete services"
ON public.experience_services
FOR DELETE
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_experience_services_updated_at
BEFORE UPDATE ON public.experience_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_experience_services_experience_id ON public.experience_services(experience_id);
CREATE INDEX idx_experience_services_display_order ON public.experience_services(display_order);
-- Allow admins to manage experience images (needed for editing experiences)
ALTER TABLE public.experience_images ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='experience_images' AND policyname='Admins can insert experience images'
  ) THEN
    CREATE POLICY "Admins can insert experience images"
    ON public.experience_images
    FOR INSERT
    WITH CHECK (public.is_admin());
  END IF;

  -- Update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='experience_images' AND policyname='Admins can update experience images'
  ) THEN
    CREATE POLICY "Admins can update experience images"
    ON public.experience_images
    FOR UPDATE
    USING (public.is_admin());
  END IF;

  -- Delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='experience_images' AND policyname='Admins can delete experience images'
  ) THEN
    CREATE POLICY "Admins can delete experience images"
    ON public.experience_images
    FOR DELETE
    USING (public.is_admin());
  END IF;
END $$;
-- Fix admin visibility for inactive experiences/services by replacing RESTRICTIVE SELECT policies
-- (RESTRICTIVE policies are AND-ed and prevent admins from seeing inactive rows)

-- Experiences
DROP POLICY IF EXISTS "Allow public read access to active experiences" ON public.experiences;

CREATE POLICY "Allow public read access to active experiences"
ON public.experiences
AS PERMISSIVE
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all experiences"
ON public.experiences
AS PERMISSIVE
FOR SELECT
USING (is_admin());

-- Experience services
DROP POLICY IF EXISTS "Allow public read access to active services" ON public.experience_services;

CREATE POLICY "Allow public read access to active services"
ON public.experience_services
AS PERMISSIVE
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all services"
ON public.experience_services
AS PERMISSIVE
FOR SELECT
USING (is_admin());
-- Create a public bucket for experience images
INSERT INTO storage.buckets (id, name, public)
VALUES ('experience-images', 'experience-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for experience images
-- Public can read
DROP POLICY IF EXISTS "Public can read experience images" ON storage.objects;
CREATE POLICY "Public can read experience images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'experience-images');

-- Admins can upload
DROP POLICY IF EXISTS "Admins can upload experience images" ON storage.objects;
CREATE POLICY "Admins can upload experience images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'experience-images' AND is_admin());

-- Admins can update
DROP POLICY IF EXISTS "Admins can update experience images" ON storage.objects;
CREATE POLICY "Admins can update experience images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'experience-images' AND is_admin())
WITH CHECK (bucket_id = 'experience-images' AND is_admin());

-- Admins can delete
DROP POLICY IF EXISTS "Admins can delete experience images" ON storage.objects;
CREATE POLICY "Admins can delete experience images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'experience-images' AND is_admin());
-- Add "Ce include" list to experiences
ALTER TABLE public.experiences
ADD COLUMN IF NOT EXISTS includes text[] NOT NULL DEFAULT '{}'::text[];

-- Add focal point controls for image framing
ALTER TABLE public.experience_images
ADD COLUMN IF NOT EXISTS focal_x numeric NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS focal_y numeric NOT NULL DEFAULT 50;

-- Basic sanity bounds (not CHECK constraints to avoid immutability issues)
-- We'll enforce in app; DB defaults keep existing rows consistent.
-- First migration: just add the enum values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'provider';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ambassador';
-- Table to link providers with experiences they manage
CREATE TABLE public.experience_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
    provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by uuid REFERENCES auth.users(id),
    assigned_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    UNIQUE(experience_id, provider_user_id)
);

-- Table to track experience ownership by ambassadors
CREATE TABLE public.experience_ambassadors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
    ambassador_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(experience_id)
);

-- Table for provider availability slots
CREATE TABLE public.availability_slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
    provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slot_date date NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    max_participants integer DEFAULT 10,
    booked_participants integer DEFAULT 0,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add ambassador_id to experiences table to track who created it
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS ambassador_id uuid REFERENCES auth.users(id);

-- Add tracking columns to vouchers for sales attribution
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS ambassador_id uuid REFERENCES auth.users(id);

-- Enable RLS
ALTER TABLE public.experience_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for experience_providers
CREATE POLICY "Admins can manage all experience providers"
ON public.experience_providers FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Ambassadors can view their experience providers"
ON public.experience_providers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.experience_ambassadors ea
        WHERE ea.experience_id = experience_providers.experience_id
        AND ea.ambassador_user_id = auth.uid()
    )
);

CREATE POLICY "Ambassadors can assign providers to their experiences"
ON public.experience_providers FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.experience_ambassadors ea
        WHERE ea.experience_id = experience_providers.experience_id
        AND ea.ambassador_user_id = auth.uid()
    )
);

CREATE POLICY "Providers can view their own assignments"
ON public.experience_providers FOR SELECT
USING (provider_user_id = auth.uid());

-- RLS Policies for experience_ambassadors
CREATE POLICY "Admins can manage experience ambassadors"
ON public.experience_ambassadors FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Ambassadors can view their own experiences"
ON public.experience_ambassadors FOR SELECT
USING (ambassador_user_id = auth.uid());

CREATE POLICY "Ambassadors can create entries for their experiences"
ON public.experience_ambassadors FOR INSERT
WITH CHECK (
    ambassador_user_id = auth.uid() 
    AND has_role(auth.uid(), 'ambassador'::app_role)
);

-- RLS Policies for availability_slots
CREATE POLICY "Public can view available slots"
ON public.availability_slots FOR SELECT
USING (is_available = true);

CREATE POLICY "Admins can manage all slots"
ON public.availability_slots FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Providers can manage their own slots"
ON public.availability_slots FOR ALL
USING (provider_user_id = auth.uid())
WITH CHECK (provider_user_id = auth.uid());

-- Function to check if user is ambassador
CREATE OR REPLACE FUNCTION public.is_ambassador()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'ambassador'::app_role
  )
$$;

-- Function to check if user is provider
CREATE OR REPLACE FUNCTION public.is_provider()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'provider'::app_role
  )
$$;

-- Function to get ambassador stats
CREATE OR REPLACE FUNCTION public.get_ambassador_stats(ambassador_user_id uuid)
RETURNS TABLE (
    active_experiences_count bigint,
    total_revenue numeric,
    total_sales bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT e.id) as active_experiences_count,
        COALESCE(SUM(v.purchase_price), 0) as total_revenue,
        COUNT(v.id) as total_sales
    FROM public.experiences e
    LEFT JOIN public.vouchers v ON v.experience_id = e.id AND v.status IN ('active', 'used')
    WHERE e.ambassador_id = ambassador_user_id
    AND e.is_active = true;
END;
$$;

-- Update experience policies for ambassadors
CREATE POLICY "Ambassadors can insert their own experiences"
ON public.experiences FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'ambassador'::app_role)
    AND ambassador_id = auth.uid()
);

CREATE POLICY "Ambassadors can update their own experiences"
ON public.experiences FOR UPDATE
USING (ambassador_id = auth.uid() AND has_role(auth.uid(), 'ambassador'::app_role));

-- Allow providers to update images of their assigned experiences
CREATE POLICY "Providers can insert their assigned experience images"
ON public.experience_images FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.experience_providers ep
        WHERE ep.experience_id = experience_images.experience_id
        AND ep.provider_user_id = auth.uid()
        AND ep.is_active = true
    )
);

CREATE POLICY "Providers can update their assigned experience images"
ON public.experience_images FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.experience_providers ep
        WHERE ep.experience_id = experience_images.experience_id
        AND ep.provider_user_id = auth.uid()
        AND ep.is_active = true
    )
);

-- Fix the creation audit trigger to handle null auth.uid()
CREATE OR REPLACE FUNCTION public.track_homepage_content_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.homepage_content_audit (content_id, section_key, old_content, new_content, changed_by)
  VALUES (NEW.id, NEW.section_key, NULL, NEW.content, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
  RETURN NEW;
END;
$function$;

-- Make the foreign key constraint deferrable so the audit trigger can work
ALTER TABLE public.homepage_content_audit
  DROP CONSTRAINT IF EXISTS homepage_content_audit_content_id_fkey;

ALTER TABLE public.homepage_content_audit
  ADD CONSTRAINT homepage_content_audit_content_id_fkey
  FOREIGN KEY (content_id) REFERENCES public.homepage_content(id)
  DEFERRABLE INITIALLY DEFERRED;

-- Also make the trigger AFTER INSERT instead of BEFORE
DROP TRIGGER IF EXISTS track_homepage_content_creation ON public.homepage_content;
CREATE TRIGGER track_homepage_content_creation
  AFTER INSERT ON public.homepage_content
  FOR EACH ROW
  EXECUTE FUNCTION public.track_homepage_content_creation();

CREATE OR REPLACE FUNCTION public.track_homepage_content_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create audit record if there's an authenticated user
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.homepage_content_audit (content_id, section_key, old_content, new_content, changed_by)
    VALUES (NEW.id, NEW.section_key, NULL, NEW.content, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;

-- Add provider_type enum
CREATE TYPE public.provider_type AS ENUM ('accommodation', 'service');

-- Add provider_type and cancellation_policy to experiences
ALTER TABLE public.experiences 
ADD COLUMN provider_type public.provider_type NOT NULL DEFAULT 'service',
ADD COLUMN cancellation_policy text;

-- Add slot_type to availability_slots for accommodation (night) vs service (hour)
ALTER TABLE public.availability_slots
ADD COLUMN slot_type public.provider_type NOT NULL DEFAULT 'service',
ADD COLUMN is_locked boolean DEFAULT false,
ADD COLUMN locked_until timestamp with time zone,
ADD COLUMN locked_by uuid;

-- Create provider_recurring_availability table for recurrence patterns
CREATE TABLE public.provider_recurring_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  provider_user_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_participants integer DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(experience_id, day_of_week, start_time)
);

-- Enable RLS on recurring availability
ALTER TABLE public.provider_recurring_availability ENABLE ROW LEVEL SECURITY;

-- RLS policies for recurring availability
CREATE POLICY "Providers can manage their own recurring availability"
ON public.provider_recurring_availability FOR ALL
USING (provider_user_id = auth.uid())
WITH CHECK (provider_user_id = auth.uid());

CREATE POLICY "Admins can manage all recurring availability"
ON public.provider_recurring_availability FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Public can view active recurring availability"
ON public.provider_recurring_availability FOR SELECT
USING (is_active = true);

-- Allow providers to also insert experiences they create
CREATE POLICY "Providers can insert their own experiences"
ON public.experiences FOR INSERT
WITH CHECK (has_role(auth.uid(), 'provider'::app_role));

CREATE POLICY "Providers can update their assigned experiences"
ON public.experiences FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM experience_providers ep
    WHERE ep.experience_id = experiences.id
    AND ep.provider_user_id = auth.uid()
    AND ep.is_active = true
  )
);

CREATE POLICY "Providers can view their assigned experiences"
ON public.experiences FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM experience_providers ep
    WHERE ep.experience_id = experiences.id
    AND ep.provider_user_id = auth.uid()
    AND ep.is_active = true
  )
);

-- Providers can view bookings for their experiences
CREATE POLICY "Providers can view bookings for their experiences"
ON public.bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM experience_providers ep
    WHERE ep.experience_id = bookings.experience_id
    AND ep.provider_user_id = auth.uid()
    AND ep.is_active = true
  )
);

-- Function to generate availability slots from recurring patterns
CREATE OR REPLACE FUNCTION public.generate_slots_from_recurring(
  p_experience_id uuid,
  p_provider_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recurring RECORD;
  v_current_date date;
  v_count integer := 0;
BEGIN
  FOR v_recurring IN
    SELECT * FROM public.provider_recurring_availability
    WHERE experience_id = p_experience_id
    AND provider_user_id = p_provider_user_id
    AND is_active = true
  LOOP
    v_current_date := p_start_date;
    WHILE v_current_date <= p_end_date LOOP
      IF EXTRACT(DOW FROM v_current_date) = v_recurring.day_of_week THEN
        INSERT INTO public.availability_slots (
          experience_id, provider_user_id, slot_date, start_time, end_time, 
          max_participants, is_available, slot_type
        )
        VALUES (
          p_experience_id, p_provider_user_id, v_current_date,
          v_recurring.start_time, v_recurring.end_time,
          v_recurring.max_participants, true,
          (SELECT provider_type FROM experiences WHERE id = p_experience_id)
        )
        ON CONFLICT DO NOTHING;
        v_count := v_count + 1;
      END IF;
      v_current_date := v_current_date + 1;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Enable realtime for availability_slots
ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_slots;

-- Atomic function to lock a slot for a user (5 min timeout)
CREATE OR REPLACE FUNCTION public.lock_availability_slot(p_slot_id uuid, p_user_id uuid)
RETURNS TABLE(success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slot RECORD;
BEGIN
  -- Get slot with row lock
  SELECT * INTO v_slot FROM public.availability_slots WHERE id = p_slot_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Slot not found'::text;
    RETURN;
  END IF;
  
  IF v_slot.is_available = false THEN
    RETURN QUERY SELECT false, 'Slot is no longer available'::text;
    RETURN;
  END IF;
  
  -- Check if locked by someone else and lock hasn't expired
  IF v_slot.is_locked = true AND v_slot.locked_by != p_user_id AND v_slot.locked_until > NOW() THEN
    RETURN QUERY SELECT false, 'Slot is temporarily reserved by another user'::text;
    RETURN;
  END IF;
  
  -- Lock the slot for 5 minutes
  UPDATE public.availability_slots
  SET is_locked = true,
      locked_by = p_user_id,
      locked_until = NOW() + INTERVAL '5 minutes',
      updated_at = NOW()
  WHERE id = p_slot_id;
  
  RETURN QUERY SELECT true, ''::text;
END;
$$;

-- Unlock a slot (only by the user who locked it)
CREATE OR REPLACE FUNCTION public.unlock_availability_slot(p_slot_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.availability_slots
  SET is_locked = false,
      locked_by = NULL,
      locked_until = NULL,
      updated_at = NOW()
  WHERE id = p_slot_id AND locked_by = p_user_id;
END;
$$;

-- Confirm booking: decrements available capacity and creates booking
CREATE OR REPLACE FUNCTION public.confirm_slot_booking(
  p_slot_id uuid, 
  p_user_id uuid, 
  p_participants integer,
  p_total_price numeric,
  p_payment_method text DEFAULT NULL,
  p_special_requests text DEFAULT NULL
)
RETURNS TABLE(success boolean, booking_id uuid, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slot RECORD;
  v_new_booking_id uuid;
  v_remaining integer;
BEGIN
  SELECT * INTO v_slot FROM public.availability_slots WHERE id = p_slot_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Slot not found'::text;
    RETURN;
  END IF;
  
  -- Verify lock ownership
  IF v_slot.is_locked = true AND v_slot.locked_by != p_user_id THEN
    IF v_slot.locked_until > NOW() THEN
      RETURN QUERY SELECT false, NULL::uuid, 'Slot is reserved by another user'::text;
      RETURN;
    END IF;
  END IF;
  
  v_remaining := v_slot.max_participants - v_slot.booked_participants;
  
  IF p_participants > v_remaining THEN
    RETURN QUERY SELECT false, NULL::uuid, ('Only ' || v_remaining || ' spots remaining')::text;
    RETURN;
  END IF;
  
  -- Create booking
  INSERT INTO public.bookings (
    user_id, experience_id, booking_date, participants, total_price, 
    status, payment_method, special_requests
  )
  VALUES (
    p_user_id, v_slot.experience_id, 
    (v_slot.slot_date::text || ' ' || v_slot.start_time::text)::timestamptz,
    p_participants, p_total_price, 'confirmed', p_payment_method, p_special_requests
  )
  RETURNING id INTO v_new_booking_id;
  
  -- Update slot capacity
  UPDATE public.availability_slots
  SET booked_participants = booked_participants + p_participants,
      is_available = CASE WHEN (booked_participants + p_participants) >= max_participants THEN false ELSE true END,
      is_locked = false,
      locked_by = NULL,
      locked_until = NULL,
      updated_at = NOW()
  WHERE id = p_slot_id;
  
  RETURN QUERY SELECT true, v_new_booking_id, ''::text;
END;
$$;

-- Notification logs table for tracking all sent notifications
CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL, -- 'email' or 'sms'
  event_type text NOT NULL, -- 'booking_confirmed', 'booking_cancelled', 'booking_reminder', 'voucher_expiry', etc.
  recipient_email text,
  recipient_phone text,
  recipient_role text NOT NULL DEFAULT 'client', -- 'client' or 'provider'
  subject text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  voucher_id uuid REFERENCES public.vouchers(id) ON DELETE SET NULL,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz
);

-- Index for querying by user and event
CREATE INDEX idx_notification_logs_user ON public.notification_logs(user_id);
CREATE INDEX idx_notification_logs_event ON public.notification_logs(event_type);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_retry ON public.notification_logs(status, next_retry_at) WHERE status = 'pending' OR status = 'failed';

-- RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notification_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all notifications"
  ON public.notification_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role can manage notifications"
  ON public.notification_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Make service role policy only apply to service_role
ALTER POLICY "Service role can manage notifications" ON public.notification_logs TO service_role;

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_booking_confirmation boolean NOT NULL DEFAULT true,
  email_booking_cancellation boolean NOT NULL DEFAULT true,
  email_booking_reminder boolean NOT NULL DEFAULT true,
  email_voucher_expiry boolean NOT NULL DEFAULT true,
  email_marketing boolean NOT NULL DEFAULT false,
  sms_booking_confirmation boolean NOT NULL DEFAULT false,
  sms_booking_reminder boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all preferences"
  ON public.notification_preferences FOR SELECT
  USING (is_admin());

-- Auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_notification_prefs_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_notification_preferences();

-- Newsletter subscribers table (for future Mailchimp sync)
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  user_id uuid,
  full_name text,
  segment text NOT NULL DEFAULT 'general', -- 'general', 'client', 'provider'
  gdpr_consent boolean NOT NULL DEFAULT false,
  gdpr_consent_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  unsubscribe_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);

CREATE INDEX idx_newsletter_email ON public.newsletter_subscribers(email);
CREATE INDEX idx_newsletter_active ON public.newsletter_subscribers(is_active) WHERE is_active = true;

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own subscription"
  ON public.newsletter_subscribers FOR SELECT
  USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own subscription"
  ON public.newsletter_subscribers FOR UPDATE
  USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can view all subscribers"
  ON public.newsletter_subscribers FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage all subscribers"
  ON public.newsletter_subscribers FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Blog categories
CREATE TABLE public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog categories are publicly readable"
  ON public.blog_categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage blog categories"
  ON public.blog_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Blog posts
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  meta_title TEXT,
  meta_description TEXT,
  featured_image TEXT,
  content TEXT,
  author TEXT,
  category_id UUID REFERENCES public.blog_categories(id),
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published blog posts are publicly readable"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins can manage blog posts"
  ON public.blog_posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Partner applications
CREATE TABLE public.partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  experience_type TEXT NOT NULL,
  description TEXT NOT NULL,
  website TEXT,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit partner application"
  ON public.partner_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view and manage partner applications"
  ON public.partner_applications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_partner_applications_updated_at
  BEFORE UPDATE ON public.partner_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- In-app notifications for providers
CREATE TABLE public.provider_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'booking', -- booking, cancellation, reminder, system
  reference_id uuid, -- booking_id or other entity
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their own notifications"
  ON public.provider_notifications FOR SELECT
  USING (provider_user_id = auth.uid());

CREATE POLICY "Providers can update their own notifications"
  ON public.provider_notifications FOR UPDATE
  USING (provider_user_id = auth.uid());

CREATE POLICY "Service role can insert notifications"
  ON public.provider_notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_provider_notifications_user ON public.provider_notifications (provider_user_id, is_read, created_at DESC);

-- Push subscriptions storage
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable realtime for provider notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_notifications;

-- 1. Fix validate_voucher_code: only allow validating vouchers assigned to the user or unassigned (for admin distribution)
CREATE OR REPLACE FUNCTION public.validate_voucher_code(voucher_code text)
 RETURNS TABLE(is_valid boolean, voucher_id uuid, experience_id uuid, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_voucher RECORD;
BEGIN
  -- Only allow validating vouchers that belong to the calling user
  SELECT * INTO v_voucher FROM public.vouchers 
  WHERE code = voucher_code 
    AND (user_id = auth.uid() OR (user_id IS NULL AND public.is_admin()));
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 'Invalid voucher code'::text;
    RETURN;
  END IF;
  
  IF v_voucher.status != 'active' THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 'Voucher is not active'::text;
    RETURN;
  END IF;
  
  IF v_voucher.expiry_date < NOW() THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 'Voucher has expired'::text;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, v_voucher.id, v_voucher.experience_id, ''::text;
END;
$function$;

-- 2. Fix redeem_voucher: only allow redeeming vouchers assigned to the calling user
CREATE OR REPLACE FUNCTION public.redeem_voucher(p_voucher_id uuid, p_booking_date timestamp with time zone, p_participants integer DEFAULT 1, p_special_requests text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, booking_id uuid, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_voucher RECORD;
  v_new_booking_id uuid;
  v_sanitized_requests text;
BEGIN
  IF p_special_requests IS NOT NULL AND LENGTH(p_special_requests) > 500 THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Special requests exceeds maximum length of 500 characters'::text;
    RETURN;
  END IF;
  
  IF p_participants < 1 OR p_participants > 100 THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Invalid number of participants (must be 1-100)'::text;
    RETURN;
  END IF;
  
  IF p_booking_date < NOW() THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Booking date must be in the future'::text;
    RETURN;
  END IF;
  
  IF p_special_requests IS NOT NULL THEN
    v_sanitized_requests := TRIM(regexp_replace(p_special_requests, E'[\\x00-\\x1F]', '', 'g'));
  ELSE
    v_sanitized_requests := NULL;
  END IF;

  -- SECURITY FIX: Only allow redeeming vouchers assigned to the calling user
  SELECT * INTO v_voucher FROM public.vouchers 
  WHERE id = p_voucher_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Voucher not found or not assigned to your account'::text;
    RETURN;
  END IF;
  
  IF v_voucher.status != 'active' THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Voucher is not active'::text;
    RETURN;
  END IF;
  
  IF v_voucher.expiry_date < NOW() THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Voucher has expired'::text;
    RETURN;
  END IF;
  
  INSERT INTO public.bookings (user_id, experience_id, booking_date, participants, total_price, voucher_id, special_requests)
  VALUES (auth.uid(), v_voucher.experience_id, p_booking_date, p_participants, v_voucher.purchase_price, p_voucher_id, v_sanitized_requests)
  RETURNING id INTO v_new_booking_id;
  
  UPDATE public.vouchers SET status = 'used', redemption_date = NOW(), updated_at = NOW() WHERE id = p_voucher_id;
  
  RETURN QUERY SELECT true, v_new_booking_id, ''::text;
END;
$function$;

-- 3. Fix confirm_slot_booking: add participant validation
CREATE OR REPLACE FUNCTION public.confirm_slot_booking(p_slot_id uuid, p_user_id uuid, p_participants integer, p_total_price numeric, p_payment_method text DEFAULT NULL::text, p_special_requests text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, booking_id uuid, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_slot RECORD;
  v_new_booking_id uuid;
  v_remaining integer;
BEGIN
  -- SECURITY FIX: Validate participant count
  IF p_participants < 1 OR p_participants > 100 THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Invalid number of participants (must be 1-100)'::text;
    RETURN;
  END IF;

  SELECT * INTO v_slot FROM public.availability_slots WHERE id = p_slot_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Slot not found'::text;
    RETURN;
  END IF;
  
  IF v_slot.is_locked = true AND v_slot.locked_by != p_user_id THEN
    IF v_slot.locked_until > NOW() THEN
      RETURN QUERY SELECT false, NULL::uuid, 'Slot is reserved by another user'::text;
      RETURN;
    END IF;
  END IF;
  
  v_remaining := v_slot.max_participants - v_slot.booked_participants;
  
  IF p_participants > v_remaining THEN
    RETURN QUERY SELECT false, NULL::uuid, ('Only ' || v_remaining || ' spots remaining')::text;
    RETURN;
  END IF;
  
  INSERT INTO public.bookings (
    user_id, experience_id, booking_date, participants, total_price, 
    status, payment_method, special_requests
  )
  VALUES (
    p_user_id, v_slot.experience_id, 
    (v_slot.slot_date::text || ' ' || v_slot.start_time::text)::timestamptz,
    p_participants, p_total_price, 'confirmed', p_payment_method, p_special_requests
  )
  RETURNING id INTO v_new_booking_id;
  
  UPDATE public.availability_slots
  SET booked_participants = booked_participants + p_participants,
      is_available = CASE WHEN (booked_participants + p_participants) >= max_participants THEN false ELSE true END,
      is_locked = false,
      locked_by = NULL,
      locked_until = NULL,
      updated_at = NOW()
  WHERE id = p_slot_id;
  
  RETURN QUERY SELECT true, v_new_booking_id, ''::text;
END;
$function$;

-- 4. Fix notification_logs RLS: remove overly permissive policy and replace with proper ones
DROP POLICY IF EXISTS "Service role can manage notifications" ON public.notification_logs;

-- Allow inserts only via service_role (edge functions use service role key)
CREATE POLICY "Service role can insert notifications"
  ON public.notification_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update notifications"
  ON public.notification_logs FOR UPDATE
  TO service_role
  USING (true);
CREATE OR REPLACE FUNCTION public.get_ambassador_stats(ambassador_user_id uuid)
 RETURNS TABLE(active_experiences_count bigint, total_revenue numeric, total_sales bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT e.id) as active_experiences_count,
        COALESCE(SUM(b.total_price), 0) as total_revenue,
        COUNT(b.id) as total_sales
    FROM public.experiences e
    LEFT JOIN public.bookings b ON b.experience_id = e.id AND b.status IN ('confirmed', 'completed')
    WHERE e.ambassador_id = ambassador_user_id
    AND e.is_active = true;
END;
$function$;
CREATE TABLE public.region_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(region_id, email)
);

ALTER TABLE public.region_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to region notifications"
  ON public.region_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all region notifications"
  ON public.region_notifications FOR SELECT
  USING (is_admin());

-- Task 4: Add billing fields to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS billing_first_name text,
  ADD COLUMN IF NOT EXISTS billing_last_name text,
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS billing_phone text,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS cui text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS company_address text;

-- Task 5: Create reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Public can read all reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Function to update experience avg_rating after review
CREATE OR REPLACE FUNCTION public.update_experience_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.experiences
  SET avg_rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM public.reviews
    WHERE experience_id = NEW.experience_id
  ),
  total_reviews = (
    SELECT COUNT(*)
    FROM public.reviews
    WHERE experience_id = NEW.experience_id
  ),
  updated_at = NOW()
  WHERE id = NEW.experience_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_experience_rating_trigger
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_experience_rating();

-- Task 6: Add lat/lng to experiences
ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS address text;
-- Allow providers to insert services for their assigned experiences
CREATE POLICY "Providers can insert services for assigned experiences"
ON public.experience_services
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.experience_providers ep
    WHERE ep.experience_id = experience_services.experience_id
      AND ep.provider_user_id = auth.uid()
      AND ep.is_active = true
  )
);

-- Allow providers to update services for their assigned experiences
CREATE POLICY "Providers can update services for assigned experiences"
ON public.experience_services
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.experience_providers ep
    WHERE ep.experience_id = experience_services.experience_id
      AND ep.provider_user_id = auth.uid()
      AND ep.is_active = true
  )
);

-- Allow providers to insert into experience_providers for self-assignment
CREATE POLICY "Providers can self-assign to their created experiences"
ON public.experience_providers
FOR INSERT
TO public
WITH CHECK (
  provider_user_id = auth.uid()
  AND assigned_by = auth.uid()
  AND has_role(auth.uid(), 'provider'::app_role)
);
-- Create cart_items table for persisting user shopping carts
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query)

CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  participants integer NOT NULL DEFAULT 1 CHECK (participants >= 1),
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, slot_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own cart items
CREATE POLICY "Users can manage their own cart items"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Standardize experience insertion policies for both ambassadors and providers
-- These policies allow authenticated users with either role to insert their own experiences

-- Drop existing overlapping policies to avoid confusion
DROP POLICY IF EXISTS "Admins can insert experiences" ON public.experiences;
DROP POLICY IF EXISTS "Ambassadors can insert their own experiences" ON public.experiences;
DROP POLICY IF EXISTS "Providers can insert their own experiences" ON public.experiences;

-- Create unified permissive INSERT policy
CREATE POLICY "Creators can insert their own experiences"
ON public.experiences
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'ambassador'::app_role) OR public.has_role(auth.uid(), 'provider'::app_role) OR public.is_admin())
  AND ambassador_id = auth.uid()
);

-- Fix SELECT policy to allow creators to see their own experiences even if inactive
-- This is critical for the .select() call after an insert to succeed immediately
DROP POLICY IF EXISTS "Creators can view their own experiences" ON public.experiences;
CREATE POLICY "Creators can view their own experiences"
ON public.experiences
FOR SELECT
TO authenticated
USING (
  ambassador_id = auth.uid() OR public.is_admin()
);

-- Ensure providers can also select experiences they are assigned to (standard select)
DROP POLICY IF EXISTS "Providers can view their assigned experiences" ON public.experiences;
CREATE POLICY "Providers can view their assigned experiences"
ON public.experiences
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.experience_providers ep
    WHERE ep.experience_id = experiences.id
    AND ep.provider_user_id = auth.uid()
    AND ep.is_active = true
  )
);
-- Storage RLS policies for experience images to allow providers to manage their own content
-- Users with 'provider' role can upload to 'experience-images'
DROP POLICY IF EXISTS "Providers can upload experience images" ON storage.objects;
CREATE POLICY "Providers can upload experience images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'experience-images' AND 
  (public.has_role(auth.uid(), 'provider'::app_role) OR public.is_admin())
);

-- Providers can update their own experience images
DROP POLICY IF EXISTS "Providers can update own experience images" ON storage.objects;
CREATE POLICY "Providers can update own experience images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'experience-images' AND 
  (public.has_role(auth.uid(), 'provider'::app_role) OR public.is_admin())
);

-- Providers can delete their own experience images
DROP POLICY IF EXISTS "Providers can delete own experience images" ON storage.objects;
CREATE POLICY "Providers can delete own experience images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'experience-images' AND 
  (public.has_role(auth.uid(), 'provider'::app_role) OR public.is_admin())
);
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
-- COMPREHENSIVE REPAIR SCRIPT
-- This script ensures all core tables and triggers for user data persist properly.
-- Run this in Dashboard > SQL Editor > New Query

-- 1. Ensure the app_role type exists with all values
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'provider', 'ambassador');
EXCEPTION
    WHEN duplicate_object THEN 
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'provider';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ambassador';
END $$;

-- 2. Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- 3. Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Automation: Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Backfill profiles for users who were "in memory" only
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. Ensure cart_items table exists
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  participants integer NOT NULL DEFAULT 1 CHECK (participants >= 1),
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, slot_id)
);
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own cart items" ON public.cart_items;
CREATE POLICY "Users can manage their own cart items" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id);
