-- Create storage policies for cad-reit-token-metadata bucket
-- These policies allow the service role to perform upsert operations (insert/update)

-- Allow service role to select objects (needed for upsert checks)
CREATE POLICY "Service role can select metadata files" ON storage.objects
FOR SELECT TO service_role
USING (bucket_id = 'cad-reit-token-metadata');

-- Allow service role to insert new metadata files
CREATE POLICY "Service role can insert metadata files" ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id = 'cad-reit-token-metadata');

-- Allow service role to update existing metadata files (required for upsert)
CREATE POLICY "Service role can update metadata files" ON storage.objects
FOR UPDATE TO service_role
USING (bucket_id = 'cad-reit-token-metadata')
WITH CHECK (bucket_id = 'cad-reit-token-metadata');

-- Allow service role to delete metadata files (optional, for cleanup)
CREATE POLICY "Service role can delete metadata files" ON storage.objects
FOR DELETE TO service_role
USING (bucket_id = 'cad-reit-token-metadata');