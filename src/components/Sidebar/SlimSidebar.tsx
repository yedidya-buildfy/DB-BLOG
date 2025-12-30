'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import {
  DocumentTextIcon,
  ChevronRightIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
  PencilIcon,
  ClockIcon,
  SunIcon,
  MoonIcon,
  CheckIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';
import type { DocSection } from '@/types';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  useSortable,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DeleteConfirmState {
  isOpen: boolean;
  section: DocSection | null;
  hasChildren: boolean;
}

interface SidebarItemProps {
  section: DocSection;
  depth: number;
  onAddChild: (parentId: string) => void;
  onDeleteClick: (section: DocSection, hasChildren: boolean) => void;
  isDragging?: boolean;
  overId?: string | null;
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
}

function SidebarItem({ section, depth, onAddChild, onDeleteClick, isDragging, overId, renamingId, setRenamingId }: SidebarItemProps) {
  const isDropTarget = overId === section.id;
  const isRenaming = renamingId === section.id;
  const [renameValue, setRenameValue] = useState(section.title);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const {
    expandedSections,
    selectedSectionId,
    toggleExpanded,
    setSelectedSection,
    getChildSections,
    updateSection,
  } = useAppStore();

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Reset rename value when section changes
  useEffect(() => {
    setRenameValue(section.title);
  }, [section.title]);

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== section.title) {
      updateSection(section.id, { title: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setRenameValue(section.title);
      setRenamingId(null);
    }
  };

  const children = getChildSections(section.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedSections.includes(section.id);
  const isSelected = selectedSectionId === section.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={clsx(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors',
          isSelected
            ? 'bg-indigo-500/10 text-indigo-400 dark:bg-indigo-500/20 dark:text-indigo-300'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
          isDragging && 'shadow-lg bg-white dark:bg-gray-800',
          isDropTarget && 'ring-2 ring-indigo-500 ring-inset bg-indigo-50 dark:bg-indigo-500/10'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex h-5 w-5 cursor-grab items-center justify-center rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 active:cursor-grabbing"
        >
          {hasChildren ? (
            <ChevronRightIcon
              className={clsx(
                'h-3.5 w-3.5 text-gray-400 transition-transform dark:text-gray-500',
                isExpanded && 'rotate-90'
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(section.id);
              }}
            />
          ) : (
            <span className="h-3.5 w-3.5 flex items-center justify-center">
              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </span>
          )}
        </button>

        <DocumentTextIcon className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />

        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            className="flex-1 rounded border border-indigo-500 bg-white px-1 py-0.5 text-sm outline-none dark:bg-gray-800 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={() => setSelectedSection(section.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setRenamingId(section.id);
            }}
            className="flex-1 truncate text-left"
          >
            {section.title}
          </button>
        )}

        {/* Hover action buttons */}
        <div className="invisible flex items-center gap-0.5 group-hover:visible">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(section.id);
            }}
            className="h-5 w-5 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="Add child section"
          >
            <PlusIcon className="h-full w-full" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(section, hasChildren);
            }}
            className="h-5 w-5 rounded p-0.5 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-500/20 dark:hover:text-red-400"
            title="Delete section"
          >
            <TrashIcon className="h-full w-full" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <SortableContext
          items={children.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {children.map((child) => (
            <SidebarItem
              key={child.id}
              section={child}
              depth={depth + 1}
              onAddChild={onAddChild}
              onDeleteClick={onDeleteClick}
              overId={overId}
              renamingId={renamingId}
              setRenamingId={setRenamingId}
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

// Simple drag overlay item
function DragOverlayItem({ section, depth }: { section: DocSection; depth: number }) {
  return (
    <div
      className="rounded-md bg-white px-2 py-1.5 text-sm shadow-lg dark:bg-gray-800 border border-indigo-500"
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <div className="flex items-center gap-1">
        <DocumentTextIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        <span className="truncate text-gray-700 dark:text-gray-300">{section.title}</span>
      </div>
    </div>
  );
}

// Root drop zone for moving items to root level
function RootDropZone({ isOver }: { isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: 'root-drop-zone' });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'mx-2 mt-2 rounded-md border-2 border-dashed p-3 text-center text-xs transition-colors',
        isOver
          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
          : 'border-gray-300 text-gray-400 dark:border-gray-700 dark:text-gray-500'
      )}
    >
      Drop here to move to root
    </div>
  );
}

export function SlimSidebar() {
  const router = useRouter();
  const {
    getChildSections,
    createNewSection,
    deleteSection,
    moveSection,
    sections,
    currentUser,
    setCurrentUser,
    expandedSections,
    toggleExpanded,
    darkMode,
    toggleDarkMode,
    isEditing,
    startEditing,
    selectedSectionId,
    showHistory,
    toggleHistory,
    saveEditing,
    cancelEditing,
    isFullscreen,
    toggleFullscreen,
    isNewSection,
    clearNewSectionFlag,
  } = useAppStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
    section: null,
    hasChildren: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  // When a new section is created, trigger renaming
  useEffect(() => {
    if (isNewSection && selectedSectionId) {
      setRenamingId(selectedSectionId);
      clearNewSectionFlag();
    }
  }, [isNewSection, selectedSectionId, clearNewSectionFlag]);

  const rootSections = getChildSections(null);
  const activeSection = activeId ? sections.find(s => s.id === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddSection = (parentId: string | null) => {
    if (!currentUser) return;
    createNewSection(parentId);
  };

  const handleAddRoot = () => {
    if (!currentUser) return;
    createNewSection(null);
  };

  const handleDeleteClick = (section: DocSection, hasChildren: boolean) => {
    setDeleteConfirm({
      isOpen: true,
      section,
      hasChildren,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.section) return;

    setIsDeleting(true);
    try {
      deleteSection(deleteConfirm.section.id);
      setDeleteConfirm({ isOpen: false, section: null, hasChildren: false });
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setCurrentUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const activeSection = sections.find(s => s.id === active.id);

    if (!activeSection) return;

    // Check if dropped on root drop zone
    if (over.id === 'root-drop-zone') {
      // Move to root level
      const rootSiblings = sections.filter(s => s.parentId === null && s.id !== active.id);
      moveSection(active.id as string, null, rootSiblings.length);
      return;
    }

    const overSection = sections.find(s => s.id === over.id);
    if (!overSection) return;

    // Prevent nesting a section into its own descendants
    const isDescendant = (parentId: string | null, targetId: string): boolean => {
      if (!parentId) return false;
      if (parentId === targetId) return true;
      const parent = sections.find(s => s.id === parentId);
      return parent ? isDescendant(parent.parentId, targetId) : false;
    };

    if (isDescendant(overSection.id, activeSection.id)) return;

    // Make the dragged item a child of the target (nest it inside)
    const newParentId = overSection.id;
    const siblings = sections.filter(s => s.parentId === newParentId);
    const newOrder = siblings.length; // Add at the end of children

    moveSection(active.id as string, newParentId, newOrder);

    // Auto-expand the parent to show the nested item
    if (!expandedSections.includes(newParentId)) {
      toggleExpanded(newParentId);
    }
  };

  // Get all section IDs in a flat list for the sortable context
  const getAllSectionIds = (parentId: string | null): string[] => {
    const children = getChildSections(parentId);
    return children.flatMap(child => [child.id, ...getAllSectionIds(child.id)]);
  };

  const allSectionIds = getAllSectionIds(null);

  return (
    <>
      <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Docs</h1>
          {currentUser && (
            <button
              onClick={handleAddRoot}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Add new section"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={allSectionIds}
              strategy={verticalListSortingStrategy}
            >
              {rootSections.map((section) => (
                <SidebarItem
                  key={section.id}
                  section={section}
                  depth={0}
                  onAddChild={handleAddSection}
                  onDeleteClick={handleDeleteClick}
                  overId={overId}
                  renamingId={renamingId}
                  setRenamingId={setRenamingId}
                />
              ))}
            </SortableContext>
            {/* Root drop zone - only show when dragging */}
            {activeId && <RootDropZone isOver={overId === 'root-drop-zone'} />}
            <DragOverlay>
              {activeSection ? (
                <DragOverlayItem section={activeSection} depth={0} />
              ) : null}
            </DragOverlay>
          </DndContext>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-2 dark:border-gray-800">
          {/* Document Actions - only show when a section is selected and user is logged in */}
          {selectedSectionId && currentUser && (
            <div className="mb-2">
              {isEditing ? (
                // Editing mode: show icon row
                <div className="flex items-center justify-center gap-1 rounded-md bg-gray-100 p-1 dark:bg-gray-800">
                  <button
                    onClick={saveEditing}
                    className="rounded-md p-2 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-500/20"
                    title="Save"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="rounded-md p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? (
                      <ArrowsPointingInIcon className="h-5 w-5" />
                    ) : (
                      <ArrowsPointingOutIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={toggleHistory}
                    className={clsx(
                      'rounded-md p-2',
                      showHistory
                        ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                        : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                    title="History"
                  >
                    <ClockIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="rounded-md p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/20"
                    title="Cancel"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                // View mode: show Edit and History buttons
                <div className="space-y-1">
                  <button
                    onClick={startEditing}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={toggleHistory}
                    className={clsx(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
                      showHistory
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    )}
                  >
                    <ClockIcon className="h-4 w-4" />
                    <span>History</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {darkMode ? (
              <>
                <SunIcon className="h-4 w-4" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <MoonIcon className="h-4 w-4" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          {/* User Section */}
          {currentUser && (
            <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-800">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: currentUser.color }}
                  >
                    {currentUser.avatar}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {currentUser.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                      {currentUser.email}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 disabled:opacity-50"
                  title="Sign Out"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, section: null, hasChildren: false })}
        onConfirm={handleDeleteConfirm}
        title={`Delete "${deleteConfirm.section?.title}"?`}
        message={
          deleteConfirm.hasChildren
            ? 'This section contains child sections. Deleting it will also delete all nested content. This action cannot be undone.'
            : 'This action cannot be undone. The section will be permanently deleted.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
