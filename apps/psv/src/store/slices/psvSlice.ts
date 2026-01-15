import { StateCreator } from 'zustand';
import { PsvStore } from '../types';
import { getDataService } from '@/lib/api';
import { toast } from '@/lib/toast';
import { createAuditLog, detectChanges } from '@/lib/auditLogService';
import { useAuthStore } from '@/store/useAuthStore';
import { useConflictStore, checkVersionConflict } from '@/store/useConflictStore';
import { derivePsvStatusFromRevision } from '../utils';
import type {
    ProtectiveSystem,
    OverpressureScenario,
    SizingCase,
    Attachment,
    EquipmentLink,
    Equipment,
} from '@/data/types';

const dataService = getDataService();

export interface PsvSlice {
    protectiveSystems: ProtectiveSystem[]; // Cache
    psvList: ProtectiveSystem[]; // Filtered
    scenarioList: OverpressureScenario[];
    sizingCaseList: SizingCase[];
    equipment: Equipment[];
    equipmentLinkList: EquipmentLink[];
    attachmentList: Attachment[];

    updateSizingCase: (updatedCase: SizingCase) => Promise<void>;
    addSizingCase: (newCase: Partial<SizingCase>) => Promise<void>;
    deleteSizingCase: (id: string) => Promise<void>;
    softDeleteSizingCase: (id: string) => Promise<void>;
    reactivateSizingCase: (id: string) => Promise<void>;
    updatePsv: (updatedPsv: ProtectiveSystem) => Promise<void>;
    deletePsv: (id: string) => Promise<void>;
    addScenario: (newScenario: Partial<OverpressureScenario>) => Promise<void>;
    updateScenario: (updatedScenario: OverpressureScenario) => Promise<void>;
    deleteScenario: (id: string) => Promise<void>;
    softDeleteScenario: (id: string) => Promise<void>;
    reactivateScenario: (id: string) => Promise<void>;
    addPsvTag: (psvId: string, tag: string) => Promise<void>;
    removePsvTag: (psvId: string, tag: string) => Promise<void>;
    linkEquipment: (data: {
        psvId: string;
        equipmentId: string;
        isPrimary?: boolean;
        scenarioId?: string;
        relationship?: string;
        notes?: string;
    }) => Promise<void>;
    unlinkEquipment: (linkId: string) => Promise<void>;
    deleteAttachment: (id: string) => Promise<void>;
    softDeleteAttachment: (id: string) => Promise<void>;
    addAttachment: (attachment: Attachment) => Promise<void>;
    addProtectiveSystem: (psv: Omit<ProtectiveSystem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateProtectiveSystem: (id: string, updates: Partial<Omit<ProtectiveSystem, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    deleteProtectiveSystem: (id: string) => Promise<void>;
    softDeleteProtectiveSystem: (id: string) => Promise<void>;
    addEquipment: (data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateEquipment: (id: string, updates: Partial<Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    deleteEquipment: (id: string) => Promise<void>;
    getEquipmentByArea: (areaId: string) => Equipment[];
}

export const createPsvSlice: StateCreator<PsvStore, [], [], PsvSlice> = (set, get) => ({
    protectiveSystems: [],
    psvList: [],
    scenarioList: [],
    sizingCaseList: [],
    equipment: [],
    equipmentLinkList: [],
    attachmentList: [],

    updateSizingCase: async (updatedCase) => {
        try {
            const state = get();
            if (state.selectedPsv?.isActive === false) throw new Error('Cannot update sizing case of inactive PSV');

            const existing = state.sizingCaseList.find(c => c.id === updatedCase.id);
            const updated = await dataService.updateSizingCase(updatedCase.id, updatedCase);

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                const changes = existing
                    ? detectChanges(existing, updatedCase, ['standard', 'method', 'status', 'currentRevisionId'])
                    : [];

                let description: string;
                if (updatedCase.status === 'calculated') {
                    description = 'Saved sizing calculation';
                } else if (changes.length > 0) {
                    description = `Updated: ${changes.map(c => c.field).join(', ')}`;
                } else {
                    description = 'Saved sizing case';
                }

                createAuditLog(
                    updatedCase.status === 'calculated' ? 'calculate' : 'update',
                    'protective_system',
                    state.selectedPsv?.id || updated.id,
                    `Case: ${updated.standard} (${state.selectedPsv?.tag || 'Unknown'})`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        changes: changes.length > 0 ? changes : undefined,
                        description,
                        projectId: state.selectedProject?.id,
                    }
                );
            }

            set((state: PsvStore) => ({
                sizingCaseList: state.sizingCaseList.map((c) =>
                    c.id === updated.id ? updated : c
                )
            }));
            toast.success('Sizing case updated');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update sizing case';
            toast.error('Failed to update sizing case', { description: message });
            throw error;
        }
    },

    addSizingCase: async (newCase) => {
        try {
            const state = get();
            if (!state.selectedPsv) throw new Error('No PSV selected');
            if (state.selectedPsv.isActive === false) throw new Error('Cannot add sizing case to inactive PSV');

            const created = await dataService.createSizingCase(state.selectedPsv!.id, newCase);

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'create',
                    'protective_system',
                    state.selectedPsv.id,
                    `Case: ${created.standard} (${state.selectedPsv.tag})`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: 'Created new sizing case',
                        projectId: state.selectedProject?.id,
                    }
                );
            }

            set((state: PsvStore) => ({
                sizingCaseList: [...state.sizingCaseList, created],
            }));
            toast.success('Sizing case added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add sizing case';
            toast.error('Failed to add sizing case', { description: message });
            throw error;
        }
    },

    deleteSizingCase: async (id) => {
        try {
            const state = get();
            const existing = state.sizingCaseList.find(c => c.id === id);
            await dataService.deleteSizingCase(id);

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                createAuditLog(
                    'delete',
                    'protective_system',
                    state.selectedPsv?.id || id,
                    `Case: ${existing.standard} (${state.selectedPsv?.tag || 'Unknown'})`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: 'Permanently deleted sizing case',
                        projectId: state.selectedProject?.id,
                    }
                );
            }

            set((state: PsvStore) => ({
                sizingCaseList: state.sizingCaseList.filter((c) => c.id !== id),
            }));
            toast.success('Sizing case permanently deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete sizing case';
            toast.error('Failed to delete sizing case', { description: message });
            throw error;
        }
    },

    softDeleteSizingCase: async (id) => {
        try {
            const state = get();
            const existing = state.sizingCaseList.find(c => c.id === id);
            if (!existing) return;

            const updated = await dataService.updateSizingCase(id, { isActive: false });

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'delete',
                    'protective_system',
                    state.selectedPsv?.id || updated.id,
                    `Case: ${updated.standard} (${state.selectedPsv?.tag || 'Unknown'})`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: 'Deactivated sizing case (soft delete)',
                        projectId: state.selectedProject?.id,
                    }
                );
            }

            set((state: PsvStore) => ({
                sizingCaseList: state.sizingCaseList.map((c) =>
                    c.id === updated.id ? updated : c
                )
            }));
            toast.success('Sizing case deactivated');
        } catch (error) {
            toast.error('Failed to deactivate sizing case');
            throw error;
        }
    },

    reactivateSizingCase: async (id) => {
        try {
            const state = get();
            const updated = await dataService.updateSizingCase(id, { isActive: true });

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'update',
                    'protective_system',
                    state.selectedPsv?.id || updated.id,
                    `Case: ${updated.standard} (${state.selectedPsv?.tag || 'Unknown'})`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: 'Reactivated sizing case',
                        projectId: state.selectedProject?.id,
                    }
                );
            }

            set((state: PsvStore) => ({
                sizingCaseList: state.sizingCaseList.map((c) =>
                    c.id === updated.id ? updated : c
                )
            }));
            toast.success('Sizing case reactivated');
        } catch (error) {
            toast.error('Failed to reactivate sizing case');
            throw error;
        }
    },

    updatePsv: async (updatedPsv) => {
        try {
            const state = get();
            const existing = state.protectiveSystems.find((p) => p.id === updatedPsv.id) ?? state.selectedPsv;

            const currentVersion = updatedPsv.version ?? existing?.version ?? 1;

            const currentRevisionChanged =
                updatedPsv.currentRevisionId !== undefined
                && updatedPsv.currentRevisionId !== existing?.currentRevisionId;

            const nextPayload = { ...updatedPsv };

            if (nextPayload.version === undefined) {
                nextPayload.version = currentVersion;
            }

            if (currentRevisionChanged && (existing?.status ?? nextPayload.status) !== 'issued') {
                const rev = state.revisionHistory.find((r) => r.id === updatedPsv.currentRevisionId);
                nextPayload.status = derivePsvStatusFromRevision(rev, existing?.status ?? nextPayload.status);
            }

            const updated = await dataService.updateProtectiveSystem(updatedPsv.id, nextPayload);

            if (existing) {
                const currentUser = useAuthStore.getState().currentUser;
                const changes = detectChanges(existing, updatedPsv, [
                    'name', 'tag', 'type', 'designCode', 'serviceFluid', 'fluidPhase',
                    'setPressure', 'mawp', 'status', 'valveType', 'currentRevisionId'
                ]);
                if (changes.length > 0 && currentUser) {
                    const isStatusChange = changes.some(c => c.field === 'status');
                    createAuditLog(
                        isStatusChange ? 'status_change' : 'update',
                        'protective_system',
                        updated.id,
                        `${updated.tag} : ${updated.name}`,
                        currentUser.id,
                        currentUser.name,
                        {
                            userRole: currentUser.role,
                            changes,
                            projectId: state.selectedProject?.id,
                            projectName: state.selectedProject?.name,
                        }
                    );
                }
            }

            set((state: PsvStore) => {
                const newList = state.psvList.map(p => p.id === updated.id ? updated : p);
                return {
                    psvList: newList,
                    protectiveSystems: state.protectiveSystems.map(p => p.id === updated.id ? updated : p),
                    selectedPsv: state.selectedPsv?.id === updated.id ? updated : state.selectedPsv,
                };
            });
            toast.success('PSV updated');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update PSV';

            if (message.includes('Conflict: Version mismatch')) {
                const state = get();
                const existing = state.protectiveSystems.find((p) => p.id === updatedPsv.id) ?? state.selectedPsv;

                if (existing) {
                    try {
                        const serverData = await dataService.getProtectiveSystem(updatedPsv.id);
                        const conflict = checkVersionConflict(existing, serverData, updatedPsv);

                        if (conflict) {
                            useConflictStore.getState().setConflict(conflict);
                            useConflictStore.getState().setCallbacks({
                                onReloadDiscard: async () => {
                                    try {
                                        const freshData = await dataService.getProtectiveSystem(updatedPsv.id);
                                        set((state: PsvStore) => ({
                                            protectiveSystems: state.protectiveSystems.map(p =>
                                                p.id === freshData.id ? freshData : p
                                            ),
                                            selectedPsv: state.selectedPsv?.id === freshData.id ? freshData : state.selectedPsv,
                                            psvList: state.psvList.map(p =>
                                                p.id === freshData.id ? freshData : p
                                            ),
                                        }));
                                        toast.info('Data reloaded from server');
                                    } catch (err) {
                                        console.error('Failed to reload PSV:', err);
                                        state.initialize();
                                    }
                                },
                                onForceSave: () => {
                                    get().updatePsv({ ...updatedPsv, version: serverData.version } as ProtectiveSystem);
                                },
                                onMergeComplete: (mergedData) => {
                                    get().updatePsv({ ...mergedData, id: updatedPsv.id } as ProtectiveSystem);
                                }
                            });
                            return;
                        }
                    } catch (fetchError) {
                        console.error('Failed to fetch latest PSV data for conflict resolution', fetchError);
                    }
                }
            }

            toast.error('Failed to update PSV', { description: message });
            throw error;
        }
    },

    deletePsv: async (id) => {
        try {
            await dataService.deleteProtectiveSystem(id);
            const state = get();
            set((state: PsvStore) => ({
                psvList: state.psvList.filter((p) => p.id !== id),
                protectiveSystems: state.protectiveSystems.filter((p) => p.id !== id),
                selectedPsv: state.selectedPsv?.id === id ? null : state.selectedPsv,
                selection: state.selectedPsv?.id === id ? { ...state.selection, psvId: null } : state.selection,
            }));

            if (state.selectedPsv?.id === id && state.selection.projectId) {
                state.selectProject(state.selection.projectId);
            }
            toast.success('PSV deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete PSV';
            toast.error('Failed to delete PSV', { description: message });
            throw error;
        }
    },

    addScenario: async (newScenario) => {
        try {
            const psv = get().selectedPsv;
            if (!psv) throw new Error('No PSV selected');
            if (psv.isActive === false) throw new Error('Cannot add scenario to inactive PSV');

            const created = await dataService.createScenario(psv.id, newScenario);
            set((state: PsvStore) => ({
                scenarioList: [...state.scenarioList, created],
            }));

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'create',
                    'protective_system',
                    psv.id,
                    `${created.cause} - ${psv.tag}`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: created.description || 'Created new scenario',
                        projectId: get().selectedProject?.id,
                    }
                );
            }

            toast.success('Scenario added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add scenario';
            toast.error('Failed to add scenario', { description: message });
            throw error;
        }
    },

    updateScenario: async (updatedScenario) => {
        try {
            const state = get();
            if (state.selectedPsv?.isActive === false) throw new Error('Cannot update scenario of inactive PSV');

            const existing = state.scenarioList.find(s => s.id === updatedScenario.id);
            const currentVersion = updatedScenario.version ?? existing?.version ?? 1;
            const nextPayload = { ...updatedScenario };

            if (nextPayload.version === undefined) {
                nextPayload.version = currentVersion;
            }

            const updated = await dataService.updateScenario(updatedScenario.id, nextPayload);
            set((state: PsvStore) => ({
                scenarioList: state.scenarioList.map((s) =>
                    s.id === updated.id ? updated : s
                ),
            }));

            const currentUser = useAuthStore.getState().currentUser;
            const psv = state.selectedPsv;
            if (currentUser && existing) {
                const changes = detectChanges(existing, updatedScenario, [
                    'cause', 'description', 'relievingTemp', 'relievingPressure',
                    'phase', 'relievingRate', 'isGoverning', 'currentRevisionId'
                ]);
                if (changes.length > 0) {
                    const isGoverningChange = changes.some(c => c.field === 'isGoverning');
                    createAuditLog(
                        isGoverningChange ? 'status_change' : 'update',
                        'protective_system',
                        psv?.id || updated.id,
                        `${updated.cause} - ${psv?.tag || 'Unknown'}`,
                        currentUser.id,
                        currentUser.name,
                        {
                            userRole: currentUser.role,
                            changes,
                            description: isGoverningChange && updatedScenario.isGoverning ? 'Set as governing case' : undefined,
                            projectId: state.selectedProject?.id,
                        }
                    );
                }
            }

            toast.success('Scenario updated');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update scenario';

            if (message.includes('Conflict: Version mismatch')) {
                const state = get();
                const existing = state.scenarioList.find(s => s.id === updatedScenario.id);

                if (existing) {
                    try {
                        const serverData = await dataService.getScenario(updatedScenario.id);

                        if (serverData) {
                            const conflict = checkVersionConflict(
                                existing as any as ProtectiveSystem,
                                serverData as any as ProtectiveSystem,
                                updatedScenario as any as ProtectiveSystem
                            );

                            if (conflict) {
                                conflict.entityType = 'scenario';
                                useConflictStore.getState().setConflict(conflict);
                                useConflictStore.getState().setCallbacks({
                                    onReloadDiscard: () => {
                                        state.initialize();
                                    },
                                    onForceSave: () => {
                                        get().updateScenario({ ...updatedScenario, version: serverData.version } as OverpressureScenario);
                                    },
                                    onMergeComplete: (mergedData) => {
                                        get().updateScenario({ ...mergedData, id: updatedScenario.id } as any as OverpressureScenario);
                                    }
                                });
                                return;
                            }
                        }
                    } catch (fetchError) {
                        console.error('Failed to resolve scenario conflict', fetchError);
                    }
                }
            }

            toast.error('Failed to update scenario', { description: message });
            throw error;
        }
    },

    deleteScenario: async (id) => {
        try {
            const state = get();
            const existing = state.scenarioList.find(s => s.id === id);
            await dataService.deleteScenario(id);
            set((state: PsvStore) => ({
                scenarioList: state.scenarioList.filter((s) => s.id !== id),
            }));

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                createAuditLog(
                    'delete',
                    'protective_system',
                    state.selectedPsv?.id || id,
                    `${existing.cause} - ${state.selectedPsv?.tag || 'Unknown'}`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: 'Permanently deleted scenario',
                        projectId: state.selectedProject?.id,
                    }
                );
            }

            toast.success('Scenario permanently deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete scenario';
            toast.error('Failed to delete scenario', { description: message });
            throw error;
        }
    },

    softDeleteScenario: async (id) => {
        try {
            const state = get();
            const existing = state.scenarioList.find(s => s.id === id);
            if (!existing) return;

            const updated = await dataService.updateScenario(id, { isActive: false });
            set((state: PsvStore) => ({
                scenarioList: state.scenarioList.map((s) =>
                    s.id === updated.id ? updated : s
                ),
            }));

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'delete',
                    'protective_system',
                    state.selectedPsv?.id || updated.id,
                    `${updated.cause} - ${state.selectedPsv?.tag || 'Unknown'}`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: 'Deactivated scenario (soft delete)',
                        projectId: state.selectedProject?.id,
                    }
                );
            }
            toast.success('Scenario deactivated');
        } catch (error) {
            toast.error('Failed to deactivate scenario');
            throw error;
        }
    },

    reactivateScenario: async (id) => {
        try {
            const state = get();
            const updated = await dataService.updateScenario(id, { isActive: true });

            set((state: PsvStore) => ({
                scenarioList: state.scenarioList.map((s) =>
                    s.id === updated.id ? updated : s
                ),
            }));

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'update',
                    'protective_system',
                    state.selectedPsv?.id || updated.id,
                    `${updated.cause} - ${state.selectedPsv?.tag || 'Unknown'}`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: 'Reactivated scenario',
                        projectId: state.selectedProject?.id,
                    }
                );
            }
            toast.success('Scenario reactivated');
        } catch (error) {
            toast.error('Failed to reactivate scenario');
            throw error;
        }
    },

    addPsvTag: async (psvId, tag) => {
        try {
            const psv = get().psvList.find(p => p.id === psvId);
            if (!psv) return;
            if (psv.isActive === false) throw new Error('Cannot add tag to inactive PSV');

            const updated = await dataService.updateProtectiveSystem(psvId, { tags: [...psv.tags, tag] });

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'update',
                    'protective_system',
                    psvId,
                    `${updated.tag} : ${updated.name}`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: `Added tag: ${tag}`,
                        changes: [{ field: 'tags', oldValue: psv.tags.join(', '), newValue: updated.tags.join(', ') }]
                    }
                );
            }

            set((state: PsvStore) => {
                const newPsvList = state.psvList.map(p => p.id === psvId ? updated : p);
                return {
                    psvList: newPsvList,
                    protectiveSystems: state.protectiveSystems.map(p => p.id === psvId ? updated : p),
                    selectedPsv: state.selectedPsv?.id === psvId ? updated : state.selectedPsv,
                };
            });
            toast.success('Tag added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add tag';
            toast.error('Failed to add tag', { description: message });
            throw error;
        }
    },

    removePsvTag: async (psvId, tag) => {
        try {
            const psv = get().psvList.find(p => p.id === psvId);
            if (!psv) return;
            if (psv.isActive === false) throw new Error('Cannot remove tag from inactive PSV');

            const updated = await dataService.updateProtectiveSystem(psvId, { tags: psv.tags.filter(t => t !== tag) });

            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog(
                    'update',
                    'protective_system',
                    psvId,
                    `${updated.tag} : ${updated.name}`,
                    currentUser.id,
                    currentUser.name,
                    {
                        userRole: currentUser.role,
                        description: `Removed tag: ${tag}`,
                        changes: [{ field: 'tags', oldValue: psv.tags.join(', '), newValue: updated.tags.join(', ') }]
                    }
                );
            }

            set((state: PsvStore) => {
                const newPsvList = state.psvList.map(p => p.id === psvId ? updated : p);
                return {
                    psvList: newPsvList,
                    protectiveSystems: state.protectiveSystems.map(p => p.id === psvId ? updated : p),
                    selectedPsv: state.selectedPsv?.id === psvId ? updated : state.selectedPsv,
                };
            });
            toast.success('Tag removed');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove tag';
            toast.error('Failed to remove tag', { description: message });
            throw error;
        }
    },

    linkEquipment: async ({ psvId, equipmentId, isPrimary = false, scenarioId, relationship, notes }) => {
        try {
            const state = get();
            if (state.selectedPsv?.id === psvId && state.selectedPsv.isActive === false) {
                throw new Error('Cannot link equipment to inactive PSV');
            }
            const created = await dataService.createEquipmentLink({
                protectiveSystemId: psvId,
                equipmentId,
                isPrimary,
                scenarioId,
                relationship,
                notes,
            });
            set((state: PsvStore) => ({
                equipmentLinkList: [...state.equipmentLinkList, created],
            }));
            toast.success('Equipment linked');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to link equipment';
            toast.error('Failed to link equipment', { description: message });
            throw error;
        }
    },

    unlinkEquipment: async (linkId) => {
        try {
            const state = get();
            if (state.selectedPsv?.isActive === false) throw new Error('Cannot unlink equipment from inactive PSV');

            await dataService.deleteEquipmentLink(linkId);
            set((state: PsvStore) => ({
                equipmentLinkList: state.equipmentLinkList.filter(l => l.id !== linkId)
            }));
            toast.success('Equipment unlinked');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to unlink equipment';
            toast.error('Failed to unlink equipment', { description: message });
            throw error;
        }
    },

    deleteAttachment: async (id) => {
        try {
            await dataService.deleteAttachment(id);
            set((state: PsvStore) => ({
                attachmentList: state.attachmentList.filter(a => a.id !== id),
            }));
            toast.success('Attachment permanently deleted');
        } catch (error) {
            toast.error('Failed to remove attachment');
            throw error;
        }
    },

    softDeleteAttachment: async (id) => {
        try {
            const state = get();
            const attachment = state.attachmentList.find(a => a.id === id);
            if (!attachment) throw new Error('Attachment not found');

            // Using update logic if dataService supports it, otherwise manually updating state
            const updated = { ...attachment, isActive: false };
            await dataService.updateAttachment?.(id, { isActive: false }); // Optional chain if not yet in dataService
            set((state: PsvStore) => ({
                attachmentList: state.attachmentList.map(a => a.id === id ? updated : a),
            }));
            toast.success('Attachment deactivated');
        } catch (error) {
            toast.error('Failed to deactivate attachment');
            throw error;
        }
    },

    addAttachment: async (attachment) => {
        try {
            const state = get();
            if (state.selectedPsv?.isActive === false) throw new Error('Cannot add attachment to inactive PSV');
            const created = await dataService.createAttachment(attachment);
            set((state: PsvStore) => ({
                attachmentList: [...state.attachmentList, created]
            }));
            toast.success('Attachment added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add attachment';
            toast.error('Failed to add attachment', { description: message });
            throw error;
        }
    },

    addProtectiveSystem: async (psv) => {
        try {
            const created = await dataService.createProtectiveSystem(psv);
            set((state: PsvStore) => ({
                psvList: [...state.psvList, created],
                protectiveSystems: [...state.protectiveSystems, created],
            }));
            toast.success('PSV created');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create PSV';
            toast.error('Failed to create PSV', { description: message });
            throw error;
        }
    },

    updateProtectiveSystem: async (id, updates) => {
        try {
            const updated = await dataService.updateProtectiveSystem(id, updates);
            set((state: PsvStore) => ({
                psvList: state.psvList.map(p => p.id === id ? updated : p),
                protectiveSystems: state.protectiveSystems.map(p => p.id === id ? updated : p),
                selectedPsv: state.selectedPsv?.id === id ? updated : state.selectedPsv,
            }));
            toast.success('PSV updated');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update PSV';
            toast.error('Failed to update PSV', { description: message });
            throw error;
        }
    },

    deleteProtectiveSystem: async (id) => {
        try {
            await dataService.deleteProtectiveSystem(id);
            set((state: PsvStore) => ({
                psvList: state.psvList.filter(p => p.id !== id),
                protectiveSystems: state.protectiveSystems.filter(p => p.id !== id),
                selectedPsv: state.selectedPsv?.id === id ? null : state.selectedPsv,
            }));
            toast.success('PSV deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete PSV';
            toast.error('Failed to delete PSV', { description: message });
            throw error;
        }
    },

    softDeleteProtectiveSystem: async (id) => {
        try {
            const state = get();
            const psv = state.protectiveSystems.find(p => p.id === id);
            if (!psv) throw new Error('PSV not found');

            if (psv.isActive !== false) {
                const updated = await dataService.updateProtectiveSystem(id, { isActive: false });

                const currentUser = useAuthStore.getState().currentUser;
                if (currentUser) {
                    createAuditLog(
                        'delete',
                        'protective_system',
                        id,
                        `${psv.tag} : ${psv.name}`,
                        currentUser.id,
                        currentUser.name,
                        {
                            userRole: currentUser.role,
                            description: 'Deactivated PSV (soft delete)',
                            projectId: state.selectedProject?.id,
                        }
                    );
                }

                set((state: PsvStore) => {
                    return {
                        psvList: state.psvList.map(p => p.id === updated.id ? updated : p),
                        protectiveSystems: state.protectiveSystems.map(p => p.id === updated.id ? updated : p),
                        selectedPsv: state.selectedPsv?.id === updated.id ? updated : state.selectedPsv,
                    };
                });
                toast.success('PSV deactivated');
            } else {
                toast.info('PSV already inactive');
            }
        } catch (error) {
            toast.error('Failed to deactivate PSV');
            throw error;
        }
    },

    addEquipment: async (data) => {
        try {
            const created = await dataService.createEquipment(data);
            set((state: PsvStore) => ({
                equipment: [...state.equipment, created],
            }));
            toast.success('Equipment added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add equipment';
            toast.error('Failed to add equipment', { description: message });
            throw error;
        }
    },

    updateEquipment: async (id, updates) => {
        try {
            const updated = await dataService.updateEquipment(id, updates);
            set((state: PsvStore) => ({
                equipment: state.equipment.map(e => e.id === id ? updated : e),
            }));
            toast.success('Equipment updated');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update equipment';
            toast.error('Failed to update equipment', { description: message });
            throw error;
        }
    },

    deleteEquipment: async (id) => {
        try {
            await dataService.deleteEquipment(id);
            set((state: PsvStore) => ({
                equipment: state.equipment.filter(e => e.id !== id),
            }));
            toast.success('Equipment deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete equipment';
            toast.error('Failed to delete equipment', { description: message });
            throw error;
        }
    },

    getEquipmentByArea: (areaId) => {
        return get().equipment.filter(eq => eq.areaId === areaId);
    },
});
