'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { SlimSidebar } from '@/components/Sidebar/SlimSidebar';
import { DocEditor } from '@/components/editor/DocEditor';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const {
    darkMode,
    isFullscreen,
    toggleFullscreen,
    setUserFromAuth,
  } = useAppStore();
  const [mounted, setMounted] = useState(false);

  // Load user from Supabase auth
  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserFromAuth({
          id: user.id,
          email: user.email!,
          user_metadata: user.user_metadata,
        });
      }
    };

    loadUser();

    // Listen for auth state changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserFromAuth({
          id: session.user.id,
          email: session.user.email!,
          user_metadata: session.user.user_metadata,
        });
      } else {
        setUserFromAuth(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUserFromAuth]);

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen, toggleFullscreen]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar - hidden in fullscreen */}
      {!isFullscreen && <SlimSidebar />}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
        <DocEditor />
      </main>
    </div>
  );
}
