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
