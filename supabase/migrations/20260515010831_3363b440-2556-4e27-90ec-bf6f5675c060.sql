DROP POLICY IF EXISTS "receipts_public_read" ON storage.objects;

CREATE POLICY "receipts_user_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
