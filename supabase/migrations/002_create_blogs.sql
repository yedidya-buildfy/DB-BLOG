-- Create blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  cover_image TEXT,
  published BOOLEAN DEFAULT false NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS blogs_slug_idx ON public.blogs(slug);

-- Create index on author_id for fast author queries
CREATE INDEX IF NOT EXISTS blogs_author_id_idx ON public.blogs(author_id);

-- Create index on published for filtering
CREATE INDEX IF NOT EXISTS blogs_published_idx ON public.blogs(published);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Create policies for blogs

-- Anyone can view published blogs
CREATE POLICY "Published blogs are viewable by everyone"
  ON public.blogs FOR SELECT
  USING (published = true);

-- Authors can view their own blogs (including drafts)
CREATE POLICY "Authors can view their own blogs"
  ON public.blogs FOR SELECT
  USING (auth.uid() = author_id);

-- Authors can insert their own blogs
CREATE POLICY "Authors can insert their own blogs"
  ON public.blogs FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Authors can update their own blogs
CREATE POLICY "Authors can update their own blogs"
  ON public.blogs FOR UPDATE
  USING (auth.uid() = author_id);

-- Authors can delete their own blogs
CREATE POLICY "Authors can delete their own blogs"
  ON public.blogs FOR DELETE
  USING (auth.uid() = author_id);

-- Add updated_at trigger to blogs
DROP TRIGGER IF EXISTS blogs_updated_at ON public.blogs;
CREATE TRIGGER blogs_updated_at
  BEFORE UPDATE ON public.blogs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
