import { StateCreator } from 'zustand';
import { PsvStore } from '../types';
import type { Warning } from '@/data/types';

export interface WarningsSlice {
    warnings: Map<string, Warning[]>;
    addWarning: (warning: Warning) => void;
    clearWarnings: (sizingCaseId: string) => void;
    getWarnings: (sizingCaseId: string) => Warning[];
}

export const createWarningsSlice: StateCreator<PsvStore, [], [], WarningsSlice> = (set, get) => ({
    warnings: new Map(),

    addWarning: (warning) => {
        set((state: PsvStore) => {
            const caseWarnings = state.warnings.get(warning.sizingCaseId) || [];
            const newWarnings = new Map(state.warnings);
            newWarnings.set(warning.sizingCaseId, [...caseWarnings, warning]);
            return { warnings: newWarnings };
        });
    },

    clearWarnings: (sizingCaseId) => {
        set((state: PsvStore) => {
            const newWarnings = new Map(state.warnings);
            newWarnings.delete(sizingCaseId);
            return { warnings: newWarnings };
        });
    },

    getWarnings: (sizingCaseId) => {
        return get().warnings.get(sizingCaseId) || [];
    },
});
