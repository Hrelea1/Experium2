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