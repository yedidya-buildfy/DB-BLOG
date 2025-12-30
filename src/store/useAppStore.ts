import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { User, DocSection, AuditEntry } from '@/types';

// Generate a consistent color based on user ID
function generateUserColor(userId: string): string {
  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Generate avatar from email or name
function generateAvatar(email: string, name?: string): string {
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

interface AppStore {
  currentUser: User | null;
  sections: DocSection[];
  expandedSections: string[];
  selectedSectionId: string | null;
  darkMode: boolean;

  // Editing state
  isEditing: boolean;
  editingTitle: string;
  editingContent: string;
  isFullscreen: boolean;
  isNewSection: boolean; // Flag to indicate title should be focused/selected
  showHistory: boolean;

  // User actions
  setCurrentUser: (user: User | null) => void;
  setUserFromAuth: (authUser: { id: string; email: string; user_metadata?: { full_name?: string; name?: string } } | null) => void;
  toggleDarkMode: () => void;

  // Editing actions
  startEditing: () => void;
  cancelEditing: () => void;
  saveEditing: () => void;
  setEditingTitle: (title: string) => void;
  setEditingContent: (content: string) => void;
  toggleFullscreen: () => void;
  clearNewSectionFlag: () => void;
  toggleHistory: () => void;

  // Section actions
  addSection: (title: string, parentId: string | null) => void;
  createNewSection: (parentId: string | null) => void; // New: creates with default title and starts editing
  updateSection: (id: string, updates: Partial<Pick<DocSection, 'title' | 'content'>>) => void;
  deleteSection: (id: string) => void;
  moveSection: (id: string, newParentId: string | null, newOrder: number) => void;

  // UI actions
  toggleExpanded: (id: string) => void;
  setSelectedSection: (id: string | null) => void;

  // Helpers
  getSectionById: (id: string) => DocSection | undefined;
  getChildSections: (parentId: string | null) => DocSection[];
  buildSectionTree: () => DocSection[];
}

const initialSections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: '# Getting Started\n\nWelcome to our documentation. This is the main entry point for all our guides and references.',
    parentId: null,
    order: 0,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    audit: [],
  },
  {
    id: 'installation',
    title: 'Installation',
    content: '# Installation\n\nFollow these steps to install the project...',
    parentId: 'getting-started',
    order: 0,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    audit: [],
  },
  {
    id: 'configuration',
    title: 'Configuration',
    content: '# Configuration\n\nLearn how to configure your setup...',
    parentId: 'getting-started',
    order: 1,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    audit: [],
  },
  {
    id: 'guides',
    title: 'Guides',
    content: '# Guides\n\nDetailed guides for various use cases.',
    parentId: null,
    order: 1,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    audit: [],
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    content: '# API Reference\n\nComplete API documentation.',
    parentId: null,
    order: 2,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    audit: [],
  },
];

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      sections: initialSections,
      expandedSections: ['getting-started'],
      selectedSectionId: null,
      darkMode: true,

      // Editing state
      isEditing: false,
      editingTitle: '',
      editingContent: '',
      isFullscreen: false,
      isNewSection: false,
      showHistory: false,

      setCurrentUser: (user) => set({ currentUser: user }),

      setUserFromAuth: (authUser) => {
        if (!authUser) {
          set({ currentUser: null });
          return;
        }

        const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email.split('@')[0];
        const user: User = {
          id: authUser.id,
          email: authUser.email,
          name,
          avatar: generateAvatar(authUser.email, name),
          color: generateUserColor(authUser.id),
        };
        set({ currentUser: user });
      },

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      // Editing actions
      startEditing: () => {
        const section = get().getSectionById(get().selectedSectionId || '');
        if (section) {
          set({
            isEditing: true,
            editingTitle: section.title,
            editingContent: section.content,
            isFullscreen: false,
          });
        }
      },
      cancelEditing: () => {
        set({
          isEditing: false,
          editingTitle: '',
          editingContent: '',
          isFullscreen: false,
        });
      },
      saveEditing: () => {
        const { selectedSectionId, editingTitle, editingContent, updateSection } = get();
        if (selectedSectionId) {
          updateSection(selectedSectionId, {
            title: editingTitle,
            content: editingContent,
          });
        }
        set({
          isEditing: false,
          editingTitle: '',
          editingContent: '',
          isFullscreen: false,
        });
      },
      setEditingTitle: (title) => set({ editingTitle: title }),
      setEditingContent: (content) => set({ editingContent: content }),
      toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
      clearNewSectionFlag: () => set({ isNewSection: false }),
      toggleHistory: () => set((state) => ({ showHistory: !state.showHistory })),

      addSection: (title, parentId) => {
        const { currentUser, sections } = get();
        if (!currentUser) return;

        const siblings = sections.filter(s => s.parentId === parentId);
        const newOrder = siblings.length;

        const newSection: DocSection = {
          id: uuidv4(),
          title,
          content: `# ${title}\n\nStart writing here...`,
          parentId,
          order: newOrder,
          createdBy: currentUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          audit: [{
            id: uuidv4(),
            userId: currentUser.id,
            action: 'create',
            timestamp: new Date(),
          }],
        };

        set({
          sections: [...sections, newSection],
          selectedSectionId: newSection.id,
        });

        // Auto-expand parent
        if (parentId) {
          const { expandedSections } = get();
          if (!expandedSections.includes(parentId)) {
            set({ expandedSections: [...expandedSections, parentId] });
          }
        }
      },

      createNewSection: (parentId) => {
        const { currentUser, sections } = get();
        if (!currentUser) return;

        const siblings = sections.filter(s => s.parentId === parentId);
        const newOrder = siblings.length;
        const defaultTitle = 'Untitled';

        const newSection: DocSection = {
          id: uuidv4(),
          title: defaultTitle,
          content: `# ${defaultTitle}\n\nStart writing here...`,
          parentId,
          order: newOrder,
          createdBy: currentUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          audit: [{
            id: uuidv4(),
            userId: currentUser.id,
            action: 'create',
            timestamp: new Date(),
          }],
        };

        set({
          sections: [...sections, newSection],
          selectedSectionId: newSection.id,
          isNewSection: true, // Flag to trigger renaming in sidebar
        });

        // Auto-expand parent
        if (parentId) {
          const { expandedSections } = get();
          if (!expandedSections.includes(parentId)) {
            set({ expandedSections: [...expandedSections, parentId] });
          }
        }
      },

      updateSection: (id, updates) => {
        const { currentUser, sections } = get();
        if (!currentUser) return;

        set({
          sections: sections.map(section => {
            if (section.id !== id) return section;

            const auditEntry: AuditEntry = {
              id: uuidv4(),
              userId: currentUser.id,
              action: 'update',
              timestamp: new Date(),
              changes: Object.keys(updates).join(', '),
            };

            return {
              ...section,
              ...updates,
              updatedAt: new Date(),
              audit: [...section.audit, auditEntry],
            };
          }),
        });
      },

      deleteSection: (id) => {
        const { currentUser, sections } = get();
        if (!currentUser) return;

        // Get all descendant IDs
        const getDescendantIds = (parentId: string): string[] => {
          const children = sections.filter(s => s.parentId === parentId);
          return children.flatMap(child => [child.id, ...getDescendantIds(child.id)]);
        };

        const idsToDelete = [id, ...getDescendantIds(id)];

        set({
          sections: sections.filter(s => !idsToDelete.includes(s.id)),
          selectedSectionId: get().selectedSectionId === id ? null : get().selectedSectionId,
        });
      },

      moveSection: (id, newParentId, newOrder) => {
        const { sections } = get();
        set({
          sections: sections.map(section => {
            if (section.id === id) {
              return { ...section, parentId: newParentId, order: newOrder };
            }
            return section;
          }),
        });
      },

      toggleExpanded: (id) => {
        const { expandedSections } = get();
        set({
          expandedSections: expandedSections.includes(id)
            ? expandedSections.filter(eId => eId !== id)
            : [...expandedSections, id],
        });
      },

      setSelectedSection: (id) => {
        const { isEditing, selectedSectionId, editingTitle, editingContent, updateSection } = get();

        // If editing and switching to a different section, auto-save first
        if (isEditing && selectedSectionId && selectedSectionId !== id) {
          updateSection(selectedSectionId, {
            title: editingTitle,
            content: editingContent,
          });
        }

        // Clear editing state and switch to new section
        set({
          selectedSectionId: id,
          isEditing: false,
          editingTitle: '',
          editingContent: '',
          isFullscreen: false,
          isNewSection: false,
          showHistory: false,
        });
      },

      getSectionById: (id) => get().sections.find(s => s.id === id),

      getChildSections: (parentId) =>
        get().sections
          .filter(s => s.parentId === parentId)
          .sort((a, b) => a.order - b.order),

      buildSectionTree: () => {
        const { sections, getChildSections } = get();

        const buildTree = (parentId: string | null): DocSection[] => {
          return getChildSections(parentId).map(section => ({
            ...section,
            children: buildTree(section.id),
          }));
        };

        return buildTree(null);
      },
    }),
    {
      name: 'drive-buddy-blog-storage',
      partialize: (state) => ({
        sections: state.sections,
        expandedSections: state.expandedSections,
        darkMode: state.darkMode,
      }),
    }
  )
);
