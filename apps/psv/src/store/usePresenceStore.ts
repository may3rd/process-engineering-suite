/**
 * Presence Tracking Store
 * 
 * Tracks which users are currently viewing/editing entities.
 * Uses localStorage for demo mode, would use WebSocket in production.
 */

import { create } from 'zustand';
import { User } from '@/data/types';

const PRESENCE_STORAGE_KEY = 'psv_user_presence';
const PRESENCE_TIMEOUT_MS = 30000; // 30 seconds - users are considered inactive after this

export interface PresenceEntry {
    entityType: 'protective_system' | 'scenario' | 'sizing_case';
    entityId: string;
    userId: string;
    userName: string;
    userInitials?: string;
    avatarUrl?: string;
    isEditing: boolean; // true if actively editing, false if just viewing
    lastSeen: string; // ISO timestamp
}

interface PresenceStore {
    // Current presence entries (from polling)
    presenceList: PresenceEntry[];

    // My current presence
    myPresence: PresenceEntry | null;

    // Actions
    setMyPresence: (entityType: PresenceEntry['entityType'], entityId: string, user: User, isEditing?: boolean) => void;
    clearMyPresence: () => void;

    // Polling
    refreshPresence: () => void;

    // Get viewers for a specific entity
    getEntityViewers: (entityType: PresenceEntry['entityType'], entityId: string) => PresenceEntry[];
}

// Helper to get presence from localStorage
function getStoredPresence(): PresenceEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(PRESENCE_STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as PresenceEntry[];
    } catch {
        return [];
    }
}

// Helper to save presence to localStorage
function savePresence(entries: PresenceEntry[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(entries));
}

// Filter out stale entries
function filterActivePresence(entries: PresenceEntry[]): PresenceEntry[] {
    const now = Date.now();
    return entries.filter(entry => {
        const lastSeen = new Date(entry.lastSeen).getTime();
        return now - lastSeen < PRESENCE_TIMEOUT_MS;
    });
}

export const usePresenceStore = create<PresenceStore>((set, get) => ({
    presenceList: [],
    myPresence: null,

    setMyPresence: (entityType, entityId, user, isEditing = false) => {
        const entry: PresenceEntry = {
            entityType,
            entityId,
            userId: user.id,
            userName: user.name,
            userInitials: user.initials,
            avatarUrl: user.avatarUrl,
            isEditing,
            lastSeen: new Date().toISOString(),
        };

        // Update my presence in state
        set({ myPresence: entry });

        // Update in storage
        const stored = getStoredPresence();
        const filtered = stored.filter(e => e.userId !== user.id);
        filtered.push(entry);
        savePresence(filterActivePresence(filtered));

        // Trigger refresh to update list
        get().refreshPresence();
    },

    clearMyPresence: () => {
        const state = get();
        if (state.myPresence) {
            // Remove my presence from storage
            const stored = getStoredPresence();
            const filtered = stored.filter(e => e.userId !== state.myPresence!.userId);
            savePresence(filtered);
        }
        set({ myPresence: null });
        get().refreshPresence();
    },

    refreshPresence: () => {
        const stored = getStoredPresence();
        const active = filterActivePresence(stored);

        // Update storage with only active entries (cleanup)
        savePresence(active);

        set({ presenceList: active });
    },

    getEntityViewers: (entityType, entityId) => {
        const state = get();
        return state.presenceList.filter(
            e => e.entityType === entityType && e.entityId === entityId
        );
    },
}));

/**
 * Hook to auto-update presence with polling
 */
export function usePresencePolling(intervalMs: number = 5000) {
    if (typeof window === 'undefined') return;

    const refreshPresence = usePresenceStore(s => s.refreshPresence);
    const myPresence = usePresenceStore(s => s.myPresence);
    const setMyPresence = usePresenceStore(s => s.setMyPresence);

    // This would be called in a useEffect in components
    // For demo, we just export the function
}
