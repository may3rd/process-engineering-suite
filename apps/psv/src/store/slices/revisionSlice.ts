import { StateCreator } from 'zustand';
import { PsvStore } from '../types';
import { getDataService } from '@/lib/api';
import { toast } from '@/lib/toast';
import { createAuditLog, detectChanges } from '@/lib/auditLogService';
import { useAuthStore } from '@/store/useAuthStore';
import { derivePsvStatusFromRevision, getUserName } from '../utils';
import type {
    RevisionHistory,
    RevisionEntityType,
    ProtectiveSystem,
    OverpressureScenario,
    SizingCase,
} from '@/data/types';

const dataService = getDataService();

export interface RevisionSlice {
    revisionHistory: RevisionHistory[];
    loadRevisionHistory: (entityType: RevisionEntityType, entityId: string) => Promise<void>;
    createRevision: (entityType: RevisionEntityType, entityId: string, revisionCode: string, description?: string) => Promise<RevisionHistory>;
    updateRevisionLifecycle: (revisionId: string, field: 'checkedBy' | 'approvedBy' | 'originatedBy', userId: string) => Promise<void>;
    updateRevision: (revisionId: string, updates: Partial<RevisionHistory>) => Promise<void>;
    deleteRevision: (revisionId: string) => Promise<void>;
    softDeleteRevision: (revisionId: string) => Promise<void>;
    getCurrentRevision: (entityType: RevisionEntityType, entityId: string) => RevisionHistory | undefined;
}

export const createRevisionSlice: StateCreator<PsvStore, [], [], RevisionSlice> = (set, get) => ({
    revisionHistory: [],

    loadRevisionHistory: async (entityType, entityId) => {
        try {
            const history = await dataService.getRevisionHistory(entityType, entityId);
            set({ revisionHistory: history });
        } catch (error) {
            console.error('Failed to load revision history:', error);
            set({ revisionHistory: [] });
        }
    },

    createRevision: async (entityType, entityId, revisionCode, description) => {
        const state = get();
        let snapshot: Record<string, unknown> = {};

        if (entityType === 'protective_system') {
            const psv = state.protectiveSystems.find(p => p.id === entityId);
            if (psv) snapshot = { ...psv };
        } else if (entityType === 'scenario') {
            const scenario = state.scenarioList.find((s: OverpressureScenario) => s.id === entityId);
            if (scenario) snapshot = { ...scenario };
        } else if (entityType === 'sizing_case') {
            const sizingCase = state.sizingCaseList.find((c: SizingCase) => c.id === entityId);
            if (sizingCase) snapshot = { ...sizingCase };
        }

        const currentRevisions = get().revisionHistory.filter(
            r => r.entityType === entityType && r.entityId === entityId
        );
        const nextSequence = currentRevisions.length > 0
            ? Math.max(...currentRevisions.map(r => r.sequence)) + 1
            : 1;

        const newRevision = await dataService.createRevision(entityType, entityId, {
            revisionCode,
            sequence: nextSequence,
            description,
            snapshot,
        });

        if (entityType === 'protective_system') {
            await dataService.updateProtectiveSystem(entityId, {
                currentRevisionId: newRevision.id,
                status: 'draft',
            });
            set((state: PsvStore) => ({
                protectiveSystems: state.protectiveSystems.map(p =>
                    p.id === entityId ? { ...p, currentRevisionId: newRevision.id, status: 'draft' } : p
                ),
                selectedPsv: state.selectedPsv?.id === entityId
                    ? { ...state.selectedPsv, currentRevisionId: newRevision.id, status: 'draft' }
                    : state.selectedPsv,
                revisionHistory: [newRevision, ...state.revisionHistory],
            }));
        } else if (entityType === 'scenario') {
            await dataService.updateScenario(entityId, { currentRevisionId: newRevision.id });
            set((state: PsvStore) => ({
                scenarioList: state.scenarioList.map((s: OverpressureScenario) =>
                    s.id === entityId ? { ...s, currentRevisionId: newRevision.id } : s
                ),
                revisionHistory: [newRevision, ...state.revisionHistory],
            }));
        } else if (entityType === 'sizing_case') {
            await dataService.updateSizingCase(entityId, { currentRevisionId: newRevision.id });
            set((state: PsvStore) => ({
                sizingCaseList: state.sizingCaseList.map((c: SizingCase) =>
                    c.id === entityId ? { ...c, currentRevisionId: newRevision.id } : c
                ),
                revisionHistory: [newRevision, ...state.revisionHistory],
            }));
        }

        toast.success(`Created revision ${revisionCode}`);

        const currentUser = useAuthStore.getState().currentUser;
        if (currentUser) {
            createAuditLog(
                'create',
                'protective_system',
                state.selectedPsv?.id || newRevision.id,
                `${state.selectedPsv?.tag || 'PSV'} : ${state.selectedPsv?.name || 'Unknown'}`,
                currentUser.id,
                currentUser.name,
                {
                    userRole: currentUser.role,
                    projectId: state.selectedProject?.id,
                    description: `Created Revision ${revisionCode}: ${description}`
                }
            );
        }

        return newRevision;
    },

    updateRevisionLifecycle: async (revisionId, field, userId) => {
        const now = new Date().toISOString();
        const updates: Partial<RevisionHistory> = {
            [field]: userId,
            [`${field.replace('By', 'At')} `]: now,
        };

        await dataService.updateRevision(revisionId, updates);
        set((state: PsvStore) => ({
            revisionHistory: state.revisionHistory.map(r =>
                r.id === revisionId ? { ...r, ...updates } : r
            ),
        }));

        const action = field === 'checkedBy' ? 'Checked' : 'Approved';
        toast.success(`Revision ${action}`);

        const currentUser = useAuthStore.getState().currentUser;
        const psv = get().selectedPsv;
        if (currentUser) {
            const r = get().revisionHistory.find(r => r.id === revisionId);
            createAuditLog(
                'status_change',
                'protective_system',
                psv?.id || revisionId,
                `${psv?.tag || 'PSV'} : ${psv?.name || 'Unknown'}`,
                currentUser.id,
                currentUser.name,
                {
                    userRole: currentUser.role,
                    description: `Revision ${r?.revisionCode}: Signed as ${action}`,
                    projectId: get().selectedProject?.id,
                }
            );
        }
    },

    updateRevision: async (revisionId, updates) => {
        const state = get();
        const existing = state.revisionHistory.find((r) => r.id === revisionId);
        await dataService.updateRevision(revisionId, updates);
        const merged = existing ? ({ ...existing, ...updates } as RevisionHistory) : undefined;

        set((state: PsvStore) => {
            const nextRevisionHistory = state.revisionHistory.map((r) =>
                r.id === revisionId ? { ...r, ...updates } : r
            );

            if (!merged || merged.entityType !== 'protective_system') {
                return { revisionHistory: nextRevisionHistory };
            }

            const psvId = merged.entityId;
            const apply = (psv: ProtectiveSystem) => {
                if (psv.id !== psvId) return psv;
                if (psv.status === 'issued') return psv;
                if (psv.currentRevisionId !== revisionId) return psv;
                const nextStatus = derivePsvStatusFromRevision(merged, psv.status);
                return nextStatus === psv.status ? psv : { ...psv, status: nextStatus };
            };

            return {
                revisionHistory: nextRevisionHistory,
                protectiveSystems: state.protectiveSystems.map(apply),
                psvList: state.psvList.map(apply),
                selectedPsv: state.selectedPsv ? apply(state.selectedPsv) : state.selectedPsv,
            };
        });

        if (merged?.entityType === 'protective_system') {
            const psv = get().protectiveSystems.find((p) => p.id === merged.entityId) ?? get().selectedPsv;
            if (psv && psv.currentRevisionId === revisionId && psv.status !== 'issued') {
                const nextStatus = derivePsvStatusFromRevision(merged, psv.status);
                if (nextStatus !== psv.status) {
                    await dataService.updateProtectiveSystem(merged.entityId, { status: nextStatus });
                }
            }
        }

        toast.success('Revision updated');

        const currentUser = useAuthStore.getState().currentUser;
        if (currentUser && existing) {
            const changes = detectChanges(existing, updates, ['revisionCode', 'description', 'checkedBy', 'approvedBy', 'originatedBy']);

            const readableChanges = changes.map(c => {
                if (c.field === 'checkedBy' || c.field === 'approvedBy' || c.field === 'originatedBy') {
                    return {
                        ...c,
                        oldValue: getUserName(c.oldValue as string, currentUser),
                        newValue: getUserName(c.newValue as string, currentUser)
                    };
                }
                return c;
            });

            if (changes.length > 0) {
                const psv = get().selectedPsv;
                createAuditLog(
                    'update',
                    'protective_system',
                    psv?.id || revisionId,
                    `${psv?.tag || 'PSV'} : ${psv?.name || 'Unknown'}`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        changes: readableChanges,
                        description: changes.some(c => (c.field === 'checkedBy' || c.field === 'approvedBy') && !c.newValue)
                            ? `Revision ${existing.revisionCode}: Revoked ${changes.find(c => (c.field === 'checkedBy' || c.field === 'approvedBy') && !c.newValue)?.field === 'checkedBy' ? 'Check' : 'Approval'}`
                            : `Updated Revision ${existing.revisionCode}`
                    }
                );
            }
        }
    },

    deleteRevision: async (revisionId) => {
        const state = get();
        const existing = state.revisionHistory.find((r) => r.id === revisionId);
        await dataService.deleteRevision(revisionId);
        set((state: PsvStore) => ({
            revisionHistory: state.revisionHistory.filter((r) => r.id !== revisionId),
        }));
        toast.success('Revision permanently deleted');

        const currentUser = useAuthStore.getState().currentUser;
        if (currentUser && existing) {
            const psv = get().selectedPsv;
            createAuditLog(
                'delete',
                'protective_system',
                psv?.id || revisionId,
                `${psv?.tag || 'PSV'} : ${psv?.name || 'Unknown'}`,
                currentUser.id,
                currentUser.name,
                {
                    userRole: currentUser.role,
                    description: `Permanently deleted Revision ${existing.revisionCode}`
                }
            );
        }
    },

    softDeleteRevision: async (revisionId) => {
        try {
            const state = get();
            const revision = state.revisionHistory.find(r => r.id === revisionId);
            if (!revision) throw new Error('Revision not found');

            await get().updateRevision(revisionId, { isActive: false });
            toast.success('Revision deactivated');
        } catch (error) {
            toast.error('Failed to deactivate revision');
            throw error;
        }
    },

    getCurrentRevision: (entityType, entityId) => {
        const state = get();
        let currentRevisionId: string | undefined;

        if (entityType === 'protective_system') {
            currentRevisionId = state.selectedPsv?.currentRevisionId;
        } else if (entityType === 'scenario') {
            currentRevisionId = state.scenarioList.find((s: OverpressureScenario) => s.id === entityId)?.currentRevisionId;
        } else if (entityType === 'sizing_case') {
            currentRevisionId = state.sizingCaseList.find((c: SizingCase) => c.id === entityId)?.currentRevisionId;
        }

        return currentRevisionId
            ? state.revisionHistory.find(r => r.id === currentRevisionId)
            : undefined;
    },
});
