/**
 * Conflict Detection Hook
 * 
 * Manages state for detecting and resolving version conflicts
 * when multiple users edit the same entity concurrently.
 */

import { create } from 'zustand';
import { AuditFieldChange, ProtectiveSystem } from '@/data/types';
import { detectChanges } from '@/lib/auditLogService';

export interface ConflictInfo {
    entityId: string;
    entityName: string;
    entityType: 'protective_system' | 'scenario';

    // Version info
    localVersion: number;
    serverVersion: number;

    // Who made the conflicting change
    conflictingUser: {
        name: string;
        changedAt: string;
    };

    // Changes
    serverChanges: AuditFieldChange[];
    yourChanges: AuditFieldChange[];

    // The local edits (what user tried to save)
    localData: Partial<ProtectiveSystem>;

    // The latest server data
    serverData: ProtectiveSystem;
}

interface ConflictStore {
    // Current conflict (null if none)
    currentConflict: ConflictInfo | null;

    // Dialog visibility
    showConflictDialog: boolean;
    showMergeDialog: boolean;

    // Actions
    setConflict: (conflict: ConflictInfo) => void;
    clearConflict: () => void;

    openConflictDialog: () => void;
    closeConflictDialog: () => void;

    openMergeDialog: () => void;
    closeMergeDialog: () => void;

    // Callbacks for user choices
    onReloadDiscard: (() => void) | null;
    onForceSave: (() => void) | null;
    onMergeComplete: ((mergedData: Partial<ProtectiveSystem>) => void) | null;

    setCallbacks: (callbacks: {
        onReloadDiscard?: () => void;
        onForceSave?: () => void;
        onMergeComplete?: (mergedData: Partial<ProtectiveSystem>) => void;
    }) => void;
}

export const useConflictStore = create<ConflictStore>((set, get) => ({
    currentConflict: null,
    showConflictDialog: false,
    showMergeDialog: false,

    onReloadDiscard: null,
    onForceSave: null,
    onMergeComplete: null,

    setConflict: (conflict) => set({
        currentConflict: conflict,
        showConflictDialog: true,
    }),

    clearConflict: () => set({
        currentConflict: null,
        showConflictDialog: false,
        showMergeDialog: false,
        onReloadDiscard: null,
        onForceSave: null,
        onMergeComplete: null,
    }),

    openConflictDialog: () => set({ showConflictDialog: true }),
    closeConflictDialog: () => set({ showConflictDialog: false }),

    openMergeDialog: () => set({ showMergeDialog: true, showConflictDialog: false }),
    closeMergeDialog: () => set({ showMergeDialog: false }),

    setCallbacks: (callbacks) => set({
        onReloadDiscard: callbacks.onReloadDiscard || null,
        onForceSave: callbacks.onForceSave || null,
        onMergeComplete: callbacks.onMergeComplete || null,
    }),
}));

/**
 * Check if there's a version conflict between local and server data.
 * Returns conflict info if there is one, null otherwise.
 */
export function checkVersionConflict(
    localData: ProtectiveSystem,
    serverData: ProtectiveSystem,
    userChanges: Partial<ProtectiveSystem>,
    userName: string = 'Another user'
): ConflictInfo | null {
    const localVersion = localData.version || 1;
    const serverVersion = serverData.version || 1;

    // No conflict if versions match
    if (localVersion >= serverVersion) {
        return null;
    }

    // Detect what changed on the server
    const serverChanges = detectChanges(localData, serverData, [
        'name', 'tag', 'type', 'designCode', 'serviceFluid', 'fluidPhase',
        'setPressure', 'mawp', 'status', 'valveType'
    ]);

    // Detect what the user tried to change
    const yourChanges = detectChanges(localData, userChanges, [
        'name', 'tag', 'type', 'designCode', 'serviceFluid', 'fluidPhase',
        'setPressure', 'mawp', 'status', 'valveType'
    ]);

    return {
        entityId: localData.id,
        entityName: `${localData.tag} : ${localData.name}`,
        entityType: 'protective_system',
        localVersion,
        serverVersion,
        conflictingUser: {
            name: userName,
            changedAt: serverData.updatedAt,
        },
        serverChanges,
        yourChanges,
        localData: userChanges,
        serverData,
    };
}

/**
 * Merge local changes with server data, applying user's resolution choices.
 */
export function mergeChanges(
    serverData: ProtectiveSystem,
    localChanges: Partial<ProtectiveSystem>,
    resolutions: Record<string, 'server' | 'yours'>
): Partial<ProtectiveSystem> {
    const merged: Partial<ProtectiveSystem> = { ...localChanges };

    // For conflicting fields, apply user's choice
    for (const [field, choice] of Object.entries(resolutions)) {
        if (choice === 'server') {
            // Use server value - remove from local changes
            delete merged[field as keyof ProtectiveSystem];
        }
        // If 'yours', keep local change as-is
    }

    // Make sure we include the latest version
    merged.version = serverData.version;

    return merged;
}
