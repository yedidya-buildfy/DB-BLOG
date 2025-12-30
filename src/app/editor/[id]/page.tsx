'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { Value } from 'platejs';
import { Toaster, toast } from 'sonner';
import debounce from 'lodash/debounce';

import { PlateEditor } from '@/components/editor/plate-editor';

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams();
  const blogId = params.id as string;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<Value | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<Value | null>(null);
  const titleRef = useRef(title);

  // Keep refs in sync
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // Load blog data
  useEffect(() => {
    async function loadBlog() {
      try {
        const response = await fetch(`/api/blogs/${blogId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Blog not found');
          } else if (response.status === 401) {
            router.push('/login?redirectTo=/editor/' + blogId);
          } else {
            setError('Failed to load blog');
          }
          return;
        }

        const blog = await response.json();
        setTitle(blog.title);
        setContent(blog.content as Value);
        setPublished(blog.published);
        setLastSaved(new Date(blog.updated_at));
      } catch (error) {
        console.error('Error loading blog:', error);
        setError('Failed to load blog');
      } finally {
        setLoading(false);
      }
    }

    loadBlog();
  }, [blogId, router]);

  // Save blog
  const saveBlog = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/blogs/${blogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleRef.current,
          content: contentRef.current,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save blog');
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error('Failed to save blog');
    } finally {
      setSaving(false);
    }
  }, [blogId]);

  // Debounced auto-save
  const debouncedSave = useCallback(
    debounce(() => {
      saveBlog();
    }, 2000),
    [saveBlog]
  );

  // Handle content change
  const handleContentChange = useCallback((newContent: Value | string) => {
    setContent(newContent as Value);
    debouncedSave();
  }, [debouncedSave]);

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    debouncedSave();
  }, [debouncedSave]);

  // Toggle publish status
  const handlePublish = async () => {
    try {
      const response = await fetch(`/api/blogs/${blogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          published: !published,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update publish status');
      }

      setPublished(!published);
      toast.success(published ? 'Blog unpublished' : 'Blog published!');
    } catch (error) {
      toast.error('Failed to update publish status');
    }
  };

  // Delete blog
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this blog?')) return;

    try {
      const response = await fetch(`/api/blogs/${blogId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete blog');
      }

      toast.success('Blog deleted');
      router.push('/');
    } catch (error) {
      toast.error('Failed to delete blog');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
        <div className="text-red-500">{error}</div>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2 bg-white">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            &larr; Back
          </Link>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0"
            placeholder="Untitled"
          />
        </div>
        <div className="flex items-center gap-4">
          {lastSaved && (
            <span className="text-xs text-gray-500">
              {saving ? 'Saving...' : `Saved ${lastSaved.toLocaleTimeString()}`}
            </span>
          )}
          <button
            onClick={handleDelete}
            className="px-3 py-1 text-sm rounded-md text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
          <button
            onClick={handlePublish}
            className={`px-3 py-1 text-sm rounded-md ${
              published
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {published ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {content && (
          <PlateEditor
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing your blog..."
          />
        )}
      </div>

      <Toaster />
    </div>
  );
}
