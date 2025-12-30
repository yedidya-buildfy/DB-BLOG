export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  color: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  action: 'create' | 'update' | 'delete';
  timestamp: Date;
  changes?: string;
}

export interface DocSection {
  id: string;
  title: string;
  content: string;
  parentId: string | null;
  order: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  audit: AuditEntry[];
  children?: DocSection[];
}

export interface AppState {
  currentUser: User | null;
  sections: DocSection[];
  expandedSections: string[];
  selectedSectionId: string | null;
}
