-- 1. Create the 'media' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'media', 'media', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'media'
);

-- 2. Allow authenticated users to upload to 'media'
CREATE POLICY "Anyone can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- 3. Allow anyone to view media (it's public, but ciphertext anyway)
CREATE POLICY "Anyone can view media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- 4. Allow users to delete their own media (optional, but good practice)
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND (auth.uid()::text = (storage.foldername(name))[1]));
