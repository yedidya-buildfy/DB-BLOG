import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

// GET /api/blogs - List all blogs for the current user
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: blogs, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(blogs);
}

// POST /api/blogs - Create a new blog
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, content, slug, excerpt, cover_image, published } = body;

  // Generate slug from title if not provided
  const blogSlug =
    slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const { data: blog, error } = await supabase
    .from('blogs')
    .insert({
      title: title || 'Untitled',
      content: content || [],
      slug: `${blogSlug}-${Date.now()}`,
      excerpt,
      cover_image,
      published: published || false,
      author_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(blog);
}
