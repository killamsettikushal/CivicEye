/*
# Create report-evidence storage bucket and policies

1. Storage Bucket
- `report-evidence`: Public bucket for storing compressed evidence photos uploaded by citizens.
  - Used by the camera capture feature on the report submission page.
  - Files are stored under per-user paths: <user_id>/<timestamp>-<random>.jpg

2. Security
- Bucket is public so evidence image URLs can be displayed in the app without additional signed-URL fetches.
- RLS policies on storage.objects:
  - SELECT (read): public — anyone can view evidence images (anon + authenticated).
  - INSERT (upload): authenticated users can upload to their own folder (auth.uid() = first path segment).
  - UPDATE: authenticated users can update their own files.
  - DELETE: authenticated users can delete their own files.

3. Important Notes
- The bucket is created with `public = true` so uploaded files get a public URL.
- Upload paths MUST start with the authenticated user's ID to satisfy the INSERT policy.
- The frontend must use `supabase.storage.from('report-evidence').upload(<userId>/<filename>, file)`.
*/

-- Create the storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-evidence', 'report-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for evidence images
DROP POLICY IF EXISTS "public_read_report_evidence" ON storage.objects;
CREATE POLICY "public_read_report_evidence" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'report-evidence');

-- Authenticated users can upload to their own folder
DROP POLICY IF EXISTS "auth_upload_report_evidence" ON storage.objects;
CREATE POLICY "auth_upload_report_evidence" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'report-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update their own files
DROP POLICY IF EXISTS "auth_update_report_evidence" ON storage.objects;
CREATE POLICY "auth_update_report_evidence" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'report-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'report-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own files
DROP POLICY IF EXISTS "auth_delete_report_evidence" ON storage.objects;
CREATE POLICY "auth_delete_report_evidence" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'report-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
