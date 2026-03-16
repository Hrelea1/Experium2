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
