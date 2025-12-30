'use client';

import { useAppStore } from '@/store/useAppStore';
import { format } from 'date-fns';
import { PlateEditor } from '@/components/editor/plate-editor';

export function DocEditor() {
  const {
    selectedSectionId,
    getSectionById,
    currentUser,
    isEditing,
    editingContent,
    setEditingContent,
    isFullscreen,
    toggleFullscreen,
    showHistory,
  } = useAppStore();

  const section = selectedSectionId ? getSectionById(selectedSectionId) : null;

  if (!section) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No section selected</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Select a section from the sidebar to view or edit its content.
          </p>
        </div>
      </div>
    );
  }

  // When editing, show only the editor
  if (isEditing) {
    return (
      <div className="plate-editor-wrapper h-full">
        <PlateEditor
          value={editingContent}
          onChange={(value) => setEditingContent(value as string)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          placeholder="Start writing your documentation..."
        />
      </div>
    );
  }

  // View mode: show content and optionally history
  return (
    <div className="flex h-full">
      {/* Content */}
      <div className={`flex-1 overflow-y-auto p-6 ${showHistory ? 'w-2/3' : ''}`}>
        <MarkdownRenderer content={section.content} />
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="w-1/3 border-l border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50 overflow-y-auto">
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Edit History</h3>
          {section.audit.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No edit history yet.</p>
          ) : (
            <div className="space-y-3">
              {[...section.audit].reverse().map((entry) => {
                const isCurrentUser = currentUser && entry.userId === currentUser.id;
                return (
                  <div
                    key={entry.id}
                    className="rounded-lg bg-white p-3 shadow-sm dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      {isCurrentUser && currentUser ? (
                        <>
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: currentUser.color }}
                          >
                            {currentUser.avatar}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            You
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-400 text-xs font-medium text-white">
                            ?
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {entry.userId === 'system' ? 'System' : 'User'}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {entry.action === 'create' && 'Created this section'}
                      {entry.action === 'update' && `Updated ${entry.changes}`}
                      {entry.action === 'delete' && 'Deleted this section'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simple markdown icon placeholder
function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

// Simple markdown renderer
function MarkdownRenderer({ content }: { content: string }) {
  const html = content
    .split('\n')
    .map((line) => {
      // Headers
      if (line.startsWith('### ')) {
        return `<h3>${line.slice(4)}</h3>`;
      }
      if (line.startsWith('## ')) {
        return `<h2>${line.slice(3)}</h2>`;
      }
      if (line.startsWith('# ')) {
        return `<h1>${line.slice(2)}</h1>`;
      }
      // Bold
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic
      line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Code
      line = line.replace(/`(.*?)`/g, '<code>$1</code>');
      // Links
      line = line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
      // List items
      if (line.startsWith('- ')) {
        return `<li>${line.slice(2)}</li>`;
      }
      // Empty lines
      if (line.trim() === '') {
        return '<br />';
      }
      // Regular paragraphs
      return `<p>${line}</p>`;
    })
    .join('');

  return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
}
