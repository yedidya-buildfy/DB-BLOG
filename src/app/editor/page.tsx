'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Value } from 'platejs';
import { Toaster, toast } from 'sonner';
import debounce from 'lodash/debounce';

import { PlateEditor } from '@/components/editor/plate-editor';
import { createClient } from '@/lib/supabase/client';

export default function EditorPage() {
  const router = useRouter();
  const [blogId, setBlogId] = useState<string | null>(null);
  const [title, setTitle] = useState('Untitled');
  const [content, setContent] = useState<Value | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [published, setPublished] = useState(false);
  const contentRef = useRef<Value | null>(null);
  const titleRef = useRef(title);

  // Keep refs in sync
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // Create blog on first edit
  const createBlog = useCallback(async () => {
    try {
      const response = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleRef.current,
          content: contentRef.current || [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create blog');
      }

      const blog = await response.json();
      setBlogId(blog.id);
      setLastSaved(new Date());

      // Update URL without full page reload
      window.history.replaceState({}, '', `/editor/${blog.id}`);

      return blog.id;
    } catch (error) {
      console.error('Error creating blog:', error);
      toast.error('Failed to create blog');
      return null;
    }
  }, []);

  // Save blog
  const saveBlog = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/blogs/${id}`, {
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
  }, []);

  // Debounced auto-save
  const debouncedSave = useCallback(
    debounce(async () => {
      let id = blogId;
      if (!id) {
        id = await createBlog();
      }
      if (id) {
        await saveBlog(id);
      }
    }, 2000),
    [blogId, createBlog, saveBlog]
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
    let id = blogId;
    if (!id) {
      id = await createBlog();
    }
    if (!id) return;

    try {
      const response = await fetch(`/api/blogs/${id}`, {
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
        <PlateEditor
          value={content || undefined}
          onChange={handleContentChange}
          placeholder="Start writing your blog..."
        />
      </div>

      <Toaster />
    </div>
  );
}
