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
