-- ============================================
-- Storage Bucket Policies for complaint-evidence
-- ============================================
-- This sets up policies so only admins can view images
-- All authenticated users can upload (for submitting complaints)

-- First, make sure the bucket exists and is PRIVATE (not public)
-- Go to Storage → complaint-evidence → Settings → Make it Private

-- Policy 1: Allow authenticated users to upload to their own folder
-- This allows users to submit complaint evidence
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'complaint-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow admins to read/view all images
-- Only users with role = 'admin' can view complaint evidence
CREATE POLICY "Admins can view all complaint evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-evidence' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.status = 'approved'
  )
);

-- Policy 3: Allow users to read their own uploaded images
-- Users can view images they uploaded (for confirmation)
CREATE POLICY "Users can view their own uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: The backend uses service_role key which bypasses RLS
-- So uploads from the backend will work regardless of policies
-- But frontend viewing will be restricted to admins and own uploads

