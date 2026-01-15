import { StateCreator } from 'zustand';
import { PsvStore } from '../types';
import { getDataService } from '@/lib/api';
import { toast } from '@/lib/toast';
import { createAuditLog } from '@/lib/auditLogService';
import { useAuthStore } from '@/store/useAuthStore';
import type { TodoItem, ProjectNote, Comment } from '@/data/types';

const dataService = getDataService();

export interface CollaborationSlice {
    todoList: TodoItem[];
    noteList: ProjectNote[];
    commentList: Comment[];

    addTodo: (todo: TodoItem) => Promise<void>;
    deleteTodo: (id: string) => Promise<void>;
    softDeleteTodo: (id: string) => Promise<void>;
    toggleTodo: (id: string) => Promise<void>;
    updateTodo: (id: string, updates: Partial<TodoItem>) => Promise<void>;
    addNote: (note: ProjectNote) => Promise<void>;
    updateNote: (id: string, updates: Partial<ProjectNote>) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    softDeleteNote: (id: string) => Promise<void>;
    addComment: (comment: Comment) => Promise<void>;
    updateComment: (id: string, updates: Partial<Comment>) => Promise<void>;
    deleteComment: (id: string) => Promise<void>;
    softDeleteComment: (id: string) => Promise<void>;
}

export const createCollaborationSlice: StateCreator<PsvStore, [], [], CollaborationSlice> = (set, get) => ({
    todoList: [],
    noteList: [],
    commentList: [],

    addTodo: async (todo) => {
        try {
            const state = get();
            if (state.selectedPsv?.isActive === false) throw new Error('Cannot add task to inactive PSV');
            const created = await dataService.createTodo(todo);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'create',
                    'todo',
                    created.id,
                    `Todo: ${created.text.slice(0, 30)}...`,
                    currentUser.id,
                    currentUser.name,
                    { userRole: currentUser.role }
                );
            }
            set((state: PsvStore) => ({
                todoList: [...state.todoList, created]
            }));
            toast.success('Todo added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add todo';
            toast.error('Failed to add todo', { description: message });
            throw error;
        }
    },

    deleteTodo: async (id) => {
        try {
            const state = get();
            const existing = state.todoList.find(t => t.id === id);
            await dataService.deleteTodo(id);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                createAuditLog(
                    'delete',
                    'todo',
                    id,
                    `Todo: ${existing.text.slice(0, 30)}...`,
                    currentUser.id,
                    currentUser.name,
                    { userRole: currentUser.role }
                );
            }
            set((state: PsvStore) => ({
                todoList: state.todoList.filter((t) => t.id !== id)
            }));
            toast.success('Todo permanently deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to permanently delete todo';
            toast.error('Failed to permanently delete todo', { description: message });
            throw error;
        }
    },

    softDeleteTodo: async (id: string) => {
        try {
            const state = get();
            const existing = state.todoList.find(t => t.id === id);
            if (!existing) throw new Error('Todo not found');

            const updated = await dataService.updateTodo(id, { isActive: false });
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'update',
                    'todo',
                    id,
                    `Todo: ${existing.text.slice(0, 30)}...`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: 'Deactivated todo',
                        changes: [{ field: 'isActive', oldValue: true, newValue: false }]
                    }
                );
            }
            set((state: PsvStore) => ({
                todoList: state.todoList.map(t => t.id === id ? updated : t)
            }));
            toast.success('Todo deactivated');
        } catch (error) {
            toast.error('Failed to deactivate todo');
            throw error;
        }
    },

    toggleTodo: async (id) => {
        try {
            const state = get();
            if (state.selectedPsv?.isActive === false) throw new Error('Cannot update task of inactive PSV');
            const todo = state.todoList.find((t) => t.id === id);
            if (!todo) return;

            const updated = await dataService.updateTodo(id, { completed: !todo.completed });
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'update',
                    'todo',
                    id,
                    `Todo: ${updated.text.slice(0, 30)}...`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: updated.completed ? 'Marked as completed' : 'Marked as active',
                        changes: [{ field: 'completed', oldValue: todo.completed, newValue: updated.completed }]
                    }
                );
            }
            set((state: PsvStore) => ({
                todoList: state.todoList.map((t) => t.id === id ? updated : t)
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to toggle todo';
            toast.error('Failed to toggle todo', { description: message });
            throw error;
        }
    },

    updateTodo: async (id, updates) => {
        try {
            const state = get();
            if (state.selectedPsv?.isActive === false) throw new Error('Cannot update task of inactive PSV');
            const updated = await dataService.updateTodo(id, updates);
            set((state: PsvStore) => ({
                todoList: state.todoList.map((t) => (t.id === id ? updated : t)),
            }));
            toast.success('Todo updated');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update todo';
            toast.error('Failed to update todo', { description: message });
            throw error;
        }
    },

    addNote: async (note) => {
        try {
            const state = get();
            if (state.selectedPsv?.isActive === false) throw new Error('Cannot add note to inactive PSV');
            const created = await dataService.createNote(note);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'create',
                    'note',
                    created.id,
                    'Note added',
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: created.body.slice(0, 50) + (created.body.length > 50 ? '...' : ''),
                    }
                );
            }
            set((state: PsvStore) => ({
                noteList: [...state.noteList, created]
            }));
            toast.success('Note added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add note';
            toast.error('Failed to add note', { description: message });
            throw error;
        }
    },

    updateNote: async (id, updates) => {
        try {
            const state = get();
            if (state.selectedPsv?.isActive === false) throw new Error('Cannot update note of inactive PSV');
            const existing = state.noteList.find(n => n.id === id);
            const updated = await dataService.updateNote(id, {
                ...updates,
                updatedAt: updates.updatedAt || new Date().toISOString(),
            });

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                createAuditLog(
                    'update',
                    'note',
                    id,
                    'Note updated',
                    currentUser.id,
                    currentUser.name,
                    { userRole: currentUser.role, changes: [{ field: 'body', oldValue: existing.body, newValue: updates.body }] }
                );
            }
            set((state: PsvStore) => ({
                noteList: state.noteList.map((n) => n.id === id ? updated : n)
            }));
            toast.success('Note updated');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update note';
            toast.error('Failed to update note', { description: message });
            throw error;
        }
    },

    deleteNote: async (id) => {
        try {
            const state = get();
            const existing = state.noteList.find(n => n.id === id);
            await dataService.deleteNote(id);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                createAuditLog(
                    'delete',
                    'note',
                    id,
                    'Note deleted',
                    currentUser.id,
                    currentUser.name,
                    { userRole: currentUser.role }
                );
            }
            set((state: PsvStore) => ({
                noteList: state.noteList.filter((n) => n.id !== id)
            }));
            toast.success('Note permanently deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to permanently delete note';
            toast.error('Failed to permanently delete note', { description: message });
            throw error;
        }
    },

    softDeleteNote: async (id: string) => {
        try {
            const state = get();
            const existing = state.noteList.find(n => n.id === id);
            if (!existing) throw new Error('Note not found');

            const updated = await dataService.updateNote(id, { isActive: false });
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'update',
                    'note',
                    id,
                    'Note deactivated',
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: 'Deactivated note',
                        changes: [{ field: 'isActive', oldValue: true, newValue: false }]
                    }
                );
            }
            set((state: PsvStore) => ({
                noteList: state.noteList.map(n => n.id === id ? updated : n)
            }));
            toast.success('Note deactivated');
        } catch (error) {
            toast.error('Failed to deactivate note');
            throw error;
        }
    },

    addComment: async (comment) => {
        try {
            const state = get();
            if (state.selectedPsv?.isActive === false) throw new Error('Cannot add comment to inactive PSV');
            const created = await dataService.createComment(comment);
            set((state: PsvStore) => ({
                commentList: [...state.commentList, created]
            }));
            toast.success('Comment added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add comment';
            toast.error('Failed to add comment', { description: message });
            throw error;
        }
    },

    updateComment: async (id, updates) => {
        try {
            const state = get();
            if (state.selectedPsv?.isActive === false) throw new Error('Cannot update comment of inactive PSV');
            const updated = await dataService.updateComment(id, {
                ...updates,
                updatedAt: updates.updatedAt || new Date().toISOString(),
            });
            set((state: PsvStore) => ({
                commentList: state.commentList.map((c) => c.id === id ? updated : c)
            }));
            toast.success('Comment updated');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update comment';
            toast.error('Failed to update comment', { description: message });
            throw error;
        }
    },

    deleteComment: async (id) => {
        try {
            await dataService.deleteComment(id);
            set((state: PsvStore) => ({
                commentList: state.commentList.filter((c) => c.id !== id)
            }));
            toast.success('Comment permanently deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to permanently delete comment';
            toast.error('Failed to permanently delete comment', { description: message });
            throw error;
        }
    },

    softDeleteComment: async (id: string) => {
        try {
            const state = get();
            const existing = state.commentList.find(c => c.id === id);
            if (!existing) throw new Error('Comment not found');

            const updated = await dataService.updateComment(id, { isActive: false });
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'update',
                    'comment',
                    id,
                    'Comment deactivated',
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: 'Deactivated comment',
                        changes: [{ field: 'isActive', oldValue: true, newValue: false }]
                    }
                );
            }
            set((state: PsvStore) => ({
                commentList: state.commentList.map(c => c.id === id ? updated : c)
            }));
            toast.success('Comment deactivated');
        } catch (error) {
            toast.error('Failed to deactivate comment');
            throw error;
        }
    },
});
