import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/data/types';
import { users, credentials } from '@/data/mockData';

interface AuthState {
    currentUser: User | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => boolean;
    logout: () => void;
    // Permission helpers
    canEdit: () => boolean;            // engineer+ (add/edit/delete items)
    canApprove: () => boolean;         // approver+
    canManageHierarchy: () => boolean; // lead+ (project/area/unit/plant)
    canManageCustomer: () => boolean;  // approver+
    canManageUsers: () => boolean;     // admin only
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            isAuthenticated: false,

            login: (username: string, password: string) => {
                // Find credential
                const credential = credentials.find(
                    (c) => c.username === username && c.password === password
                );

                if (!credential) {
                    return false;
                }

                // Find user
                const user = users.find((u) => u.id === credential.userId);

                if (!user || user.status !== 'active') {
                    return false;
                }

                set({ currentUser: user, isAuthenticated: true });
                return true;
            },

            logout: () => {
                set({ currentUser: null, isAuthenticated: false });
            },

            // Permission helpers
            canEdit: () => {
                const { currentUser } = get();
                if (!currentUser) return false;
                return ['engineer', 'lead', 'approver', 'admin'].includes(currentUser.role);
            },

            canApprove: () => {
                const { currentUser } = get();
                if (!currentUser) return false;
                return ['approver', 'admin'].includes(currentUser.role);
            },

            canManageHierarchy: () => {
                const { currentUser } = get();
                if (!currentUser) return false;
                return ['lead', 'approver', 'admin'].includes(currentUser.role);
            },

            canManageCustomer: () => {
                const { currentUser } = get();
                if (!currentUser) return false;
                return ['approver', 'admin'].includes(currentUser.role);
            },

            canManageUsers: () => {
                const { currentUser } = get();
                if (!currentUser) return false;
                return currentUser.role === 'admin';
            },
        }),
        {
            name: 'psv-auth-storage', // localStorage key
        }
    )
);
