-- Create storage bucket for blog media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-media',
  'blog-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
-- Note: RLS should already be enabled on storage.objects by default

-- Policy: Anyone can view files in the blog-media bucket
CREATE POLICY "Public read access for blog-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-media');

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload blog-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'blog-media'
    AND auth.role() = 'authenticated'
  );

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own blog-media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'blog-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own blog-media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'blog-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
