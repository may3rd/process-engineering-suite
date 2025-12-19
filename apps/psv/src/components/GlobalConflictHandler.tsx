"use client";

/**
 * Global Conflict Handler
 * 
 * Renders the ConflictDialog and MergeDialog at the app level.
 * Listens to the conflict store and shows dialogs when conflicts occur.
 */

import { useConflictStore } from "@/store/useConflictStore";
import { ConflictDialog } from "./ConflictDialog";
import { MergeDialog } from "./MergeDialog";
import { useMemo } from "react";

export function GlobalConflictHandler() {
    const {
        currentConflict,
        showConflictDialog,
        showMergeDialog,
        closeConflictDialog,
        closeMergeDialog,
        clearConflict,
        openMergeDialog,
        onReloadDiscard,
        onForceSave,
        onMergeComplete,
    } = useConflictStore();

    // Get conflicting fields (same field changed by both)
    const conflictingFields = useMemo(() => {
        if (!currentConflict) return [];

        const serverFields = new Set(currentConflict.serverChanges.map(c => c.field));
        const yourFields = currentConflict.yourChanges.filter(c => serverFields.has(c.field));

        return yourFields.map(yourChange => {
            const serverChange = currentConflict.serverChanges.find(s => s.field === yourChange.field);
            return {
                field: yourChange.field,
                serverValue: serverChange?.newValue,
                yourValue: yourChange.newValue,
                originalValue: yourChange.oldValue,
            };
        });
    }, [currentConflict]);

    // Get auto-merged fields (fields only changed by one party)
    const autoMergedFields = useMemo(() => {
        if (!currentConflict) return [];

        const conflictingFieldNames = new Set(conflictingFields.map(f => f.field));

        // Your changes that don't conflict
        return currentConflict.yourChanges.filter(c => !conflictingFieldNames.has(c.field));
    }, [currentConflict, conflictingFields]);

    if (!currentConflict) return null;

    const handleReloadDiscard = () => {
        closeConflictDialog();
        if (onReloadDiscard) {
            onReloadDiscard();
        }
        clearConflict();
    };

    const handleMergeAndSave = () => {
        openMergeDialog();
    };

    const handleForceSave = () => {
        closeConflictDialog();
        if (onForceSave) {
            onForceSave();
        }
        clearConflict();
    };

    const handleMergeApply = (resolutions: Record<string, 'server' | 'yours'>) => {
        closeMergeDialog();
        if (onMergeComplete && currentConflict) {
            // Build merged data based on resolutions
            const merged = { ...currentConflict.localData };

            for (const [field, choice] of Object.entries(resolutions)) {
                if (choice === 'server') {
                    // Use server value
                    const serverValue = currentConflict.serverData[field as keyof typeof currentConflict.serverData];
                    (merged as Record<string, unknown>)[field] = serverValue;
                }
            }

            // Include server version to prevent further conflicts
            merged.version = currentConflict.serverData.version;

            onMergeComplete(merged);
        }
        clearConflict();
    };

    const handleMergeCancel = () => {
        closeMergeDialog();
        // Go back to conflict dialog
        closeConflictDialog();
        clearConflict();
    };

    return (
        <>
            <ConflictDialog
                open={showConflictDialog}
                onClose={closeConflictDialog}
                entityName={currentConflict.entityName}
                conflictingUser={currentConflict.conflictingUser}
                serverChanges={currentConflict.serverChanges}
                yourChanges={currentConflict.yourChanges}
                onReloadDiscard={handleReloadDiscard}
                onMergeAndSave={handleMergeAndSave}
                onForceSave={handleForceSave}
            />
            <MergeDialog
                open={showMergeDialog}
                onClose={handleMergeCancel}
                entityName={currentConflict.entityName}
                conflictingFields={conflictingFields}
                autoMergedFields={autoMergedFields}
                onApplyMerge={handleMergeApply}
                onCancel={handleMergeCancel}
            />
        </>
    );
}
