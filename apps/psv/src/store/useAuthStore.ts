import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MockCredential, User } from '@/data/types';
import { users, credentials } from '@/data/mockData';

/**
 * Demo auth storage keys (local-only).
 *
 * The PSV app currently runs in a demo mode where users and credentials are stored in
 * `localStorage`. This enables "admin creates user + temporary password" without a
 * backend identity provider.
 */
const USERS_STORAGE_KEY = 'psv_demo_users';
const CREDENTIALS_STORAGE_KEY = 'psv_demo_credentials';

function loadFromStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function persistToStorage<T>(key: string, value: T) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeedData() {
    // Seed demo data once so that newly-created users can also log in.
    const existingUsers = loadFromStorage<User[]>(USERS_STORAGE_KEY, []);
    const existingCreds = loadFromStorage<MockCredential[]>(CREDENTIALS_STORAGE_KEY, []);
    if (existingUsers.length === 0) persistToStorage(USERS_STORAGE_KEY, users);
    if (existingCreds.length === 0) persistToStorage(CREDENTIALS_STORAGE_KEY, credentials);
}

interface AuthState {
    currentUser: User | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => boolean;
    logout: () => void;
    updateUserProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'initials'>>) => void;
    changePassword: (currentPassword: string, newPassword: string) => { success: boolean; message: string };
    resetUserPassword: (userId: string) => { success: boolean; message: string; username?: string; temporaryPassword?: string };
    // Permission helpers
    canEdit: () => boolean;            // engineer+ (add/edit/delete items)
    canApprove: () => boolean;         // approver+
    canManageHierarchy: () => boolean; // lead+ (project/area/unit/plant)
    canManageCustomer: () => boolean;  // approver+
    canManageUsers: () => boolean;     // admin only
}

function generateTemporaryPassword(length = 12) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let next = '';
    for (let i = 0; i < length; i++) {
        next += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return next;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            isAuthenticated: false,

            login: (username: string, password: string) => {
                ensureSeedData();
                const storedCredentials = loadFromStorage<MockCredential[]>(CREDENTIALS_STORAGE_KEY, credentials);
                const storedUsers = loadFromStorage<User[]>(USERS_STORAGE_KEY, users);

                // Find credential
                const credential = storedCredentials.find(
                    (c) => c.username === username && c.password === password
                );

                if (!credential) {
                    return false;
                }

                // Find user
                const user = storedUsers.find((u) => u.id === credential.userId);

                if (!user || user.status !== 'active') {
                    return false;
                }

                set({ currentUser: user, isAuthenticated: true });
                return true;
            },

            logout: () => {
                set({ currentUser: null, isAuthenticated: false });
            },

            updateUserProfile: (updates) => {
                const { currentUser } = get();
                if (currentUser) {
                    ensureSeedData();
                    const storedUsers = loadFromStorage<User[]>(USERS_STORAGE_KEY, users);
                    const updatedUser = { ...currentUser, ...updates };
                    persistToStorage(
                        USERS_STORAGE_KEY,
                        storedUsers.map((u) => (u.id === currentUser.id ? updatedUser : u))
                    );
                    set({ currentUser: updatedUser });
                }
            },

            changePassword: (currentPassword, newPassword) => {
                const { currentUser } = get();
                if (!currentUser) return { success: false, message: 'Not signed in' };
                if (!newPassword || newPassword.length < 6) {
                    return { success: false, message: 'Password must be at least 6 characters' };
                }

                ensureSeedData();
                const storedCredentials = loadFromStorage<MockCredential[]>(CREDENTIALS_STORAGE_KEY, credentials);
                const credIndex = storedCredentials.findIndex((c) => c.userId === currentUser.id);
                if (credIndex === -1) return { success: false, message: 'Credential not found' };
                if (storedCredentials[credIndex].password !== currentPassword) {
                    return { success: false, message: 'Current password is incorrect' };
                }

                const nextCredentials = [...storedCredentials];
                nextCredentials[credIndex] = { ...nextCredentials[credIndex], password: newPassword };
                persistToStorage(CREDENTIALS_STORAGE_KEY, nextCredentials);
                return { success: true, message: 'Password updated' };
            },

            resetUserPassword: (userId) => {
                const { currentUser } = get();
                if (!currentUser || currentUser.role !== 'admin') {
                    return { success: false, message: 'Admin permission required' };
                }

                ensureSeedData();
                const storedUsers = loadFromStorage<User[]>(USERS_STORAGE_KEY, users);
                const storedCredentials = loadFromStorage<MockCredential[]>(CREDENTIALS_STORAGE_KEY, credentials);

                const targetUser = storedUsers.find((u) => u.id === userId);
                if (!targetUser) {
                    return { success: false, message: 'User not found' };
                }

                const temporaryPassword = generateTemporaryPassword();
                const existingIndex = storedCredentials.findIndex((c) => c.userId === userId);
                const username =
                    existingIndex !== -1
                        ? storedCredentials[existingIndex].username
                        : targetUser.email.split('@')[0] || targetUser.id.slice(0, 8);

                const nextCredentials = [...storedCredentials];
                if (existingIndex !== -1) {
                    nextCredentials[existingIndex] = { ...nextCredentials[existingIndex], password: temporaryPassword };
                } else {
                    nextCredentials.push({ userId, username, password: temporaryPassword });
                }

                persistToStorage(CREDENTIALS_STORAGE_KEY, nextCredentials);
                return {
                    success: true,
                    message: `Temporary password created for ${targetUser.name}`,
                    username,
                    temporaryPassword,
                };
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
