import { create } from 'zustand';
import type {
    Customer,
    Plant,
    Unit,
    Area,
    Project,
    ProtectiveSystem,
    OverpressureScenario,
    SizingCase,
    Attachment,
    TodoItem,
    EquipmentLink,
    Equipment,
    Comment,
} from '@/data/types';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

interface HierarchySelection {
    customerId: string | null;
    plantId: string | null;
    unitId: string | null;
    areaId: string | null;
    projectId: string | null;
    psvId: string | null;
}

interface PsvStore {
    // Selection state
    selection: HierarchySelection;

    // Derived data (computed from selection)
    selectedCustomer: Customer | null;
    selectedPlant: Plant | null;
    selectedUnit: Unit | null;
    selectedArea: Area | null;
    selectedProject: Project | null;
    selectedPsv: ProtectiveSystem | null;

    // State arrays (mutable data)
    customers: Customer[];
    plants: Plant[];
    units: Unit[];
    areas: Area[];
    projects: Project[];
    protectiveSystems: ProtectiveSystem[];
    equipment: Equipment[];

    // Lists for current level (filtered/computed)
    customerList: Customer[];
    plantList: Plant[];
    unitList: Unit[];
    areaList: Area[];
    projectList: Project[];
    psvList: ProtectiveSystem[];
    scenarioList: OverpressureScenario[];
    sizingCaseList: SizingCase[];
    equipmentLinkList: EquipmentLink[];

    // UI state
    activeTab: number;
    sidebarOpen: boolean;
    currentPage: 'hierarchy' | 'dashboard' | 'account' | null;
    isLoading: boolean;
    error: string | null;

    // Initialize data
    initialize: () => Promise<void>;

    // Actions (now async)
    selectCustomer: (id: string | null) => Promise<void>;
    selectPlant: (id: string | null) => Promise<void>;
    selectUnit: (id: string | null) => Promise<void>;
    selectArea: (id: string | null) => Promise<void>;
    selectProject: (id: string | null) => Promise<void>;
    selectPsv: (id: string | null) => Promise<void>;
    setActiveTab: (tab: number) => void;
    setCurrentPage: (page: 'hierarchy' | 'dashboard' | 'account' | null) => void;
    toggleSidebar: () => void;
    clearSelection: () => void;
    navigateToLevel: (level: 'customer' | 'plant' | 'unit' | 'area' | 'project' | 'psv') => void;
    updateSizingCase: (updatedCase: SizingCase) => Promise<void>;
    addSizingCase: (newCase: SizingCase) => Promise<void>;
    deleteSizingCase: (id: string) => Promise<void>;
    updatePsv: (updatedPsv: ProtectiveSystem) => Promise<void>;

    // Scenario Actions (async)
    addScenario: (newScenario: OverpressureScenario) => Promise<void>;
    updateScenario: (updatedScenario: OverpressureScenario) => Promise<void>;
    deleteScenario: (id: string) => Promise<void>;

    // Tag Actions
    addPsvTag: (psvId: string, tag: string) => Promise<void>;
    removePsvTag: (psvId: string, tag: string) => Promise<void>;

    // Equipment Link Actions
    linkEquipment: (link: EquipmentLink) => void;
    unlinkEquipment: (linkId: string) => void;
    deletePsv: (id: string) => Promise<void>;
    deleteAttachment: (id: string) => Promise<void>;
    addAttachment: (attachment: Attachment) => Promise<void>;
    attachmentList: Attachment[];

    // Hierarchy CRUD Actions (async)
    addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
    updateCustomer: (id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>) => Promise<void>;
    deleteCustomer: (id: string) => Promise<void>;

    addPlant: (plant: Omit<Plant, 'id' | 'createdAt'>) => Promise<void>;
    updatePlant: (id: string, updates: Partial<Omit<Plant, 'id' | 'createdAt'>>) => Promise<void>;
    deletePlant: (id: string) => Promise<void>;

    addUnit: (unit: Omit<Unit, 'id' | 'createdAt'>) => Promise<void>;
    updateUnit: (id: string, updates: Partial<Omit<Unit, 'id' | 'createdAt'>>) => Promise<void>;
    deleteUnit: (id: string) => Promise<void>;

    addArea: (area: Omit<Area, 'id' | 'createdAt'>) => Promise<void>;
    updateArea: (id: string, updates: Partial<Omit<Area, 'id' | 'createdAt'>>) => Promise<void>;
    deleteArea: (id: string) => Promise<void>;

    addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
    updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;

    addProtectiveSystem: (psv: Omit<ProtectiveSystem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateProtectiveSystem: (id: string, updates: Partial<Omit<ProtectiveSystem, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    deleteProtectiveSystem: (id: string) => Promise<void>;

    addEquipment: (equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateEquipment: (id: string, updates: Partial<Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    deleteEquipment: (id: string) => void;

    // Todo Actions (async)
    addTodo: (todo: TodoItem) => Promise<void>;
    deleteTodo: (id: string) => Promise<void>;
    toggleTodo: (id: string) => Promise<void>;
    todoList: TodoItem[];

    // Comment Actions (async)
    addComment: (comment: Comment) => Promise<void>;
    deleteComment: (id: string) => Promise<void>;
    commentList: Comment[];
}

export const usePsvStore = create<PsvStore>((set, get) => ({
    // Initial selection state
    selection: {
        customerId: null,
        plantId: null,
        unitId: null,
        areaId: null,
        projectId: null,
        psvId: null,
    },

    // Initial derived data
    selectedCustomer: null,
    selectedPlant: null,
    selectedUnit: null,
    selectedArea: null,
    selectedProject: null,
    selectedPsv: null,

    // State arrays (will be populated by initialize())
    customers: [],
    plants: [],
    units: [],
    areas: [],
    projects: [],
    protectiveSystems: [],
    equipment: [],

    // Initial lists (filtered/computed)
    customerList: [],
    plantList: [],
    unitList: [],
    areaList: [],
    projectList: [],
    psvList: [],
    scenarioList: [],
    sizingCaseList: [],
    equipmentLinkList: [],
    attachmentList: [],
    todoList: [],
    commentList: [],

    // UI state
    activeTab: 0,
    sidebarOpen: true,
    currentPage: null,
    isLoading: false,
    error: null,

    // Initialize - fetch initial data from API
    initialize: async () => {
        set({ isLoading: true, error: null });
        try {
            const customers = await api.getCustomers();
            set({
                customers,
                customerList: customers,
                isLoading: false
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load data';
            set({ error: message, isLoading: false });
            toast.error('Failed to load data', { description: message });
        }
    },

    // Actions
    selectCustomer: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const customer = id ? get().customers.find(c => c.id === id) || null : null;
            const plantList = id ? await api.getPlantsByCustomer(id) : [];

            set({
                selection: {
                    customerId: id,
                    plantId: null,
                    unitId: null,
                    areaId: null,
                    projectId: null,
                    psvId: null,
                },
                selectedCustomer: customer,
                selectedPlant: null,
                selectedUnit: null,
                selectedArea: null,
                selectedProject: null,
                selectedPsv: null,
                plantList,
                plants: plantList, // Cache for future use
                unitList: [],
                areaList: [],
                projectList: [],
                psvList: [],
                scenarioList: [],
                sizingCaseList: [],
                equipmentLinkList: [],
                isLoading: false
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load plants';
            set({ error: message, isLoading: false });
            toast.error('Failed to load plants', { description: message });
        }
    },

    selectPlant: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const plant = id ? get().plants.find(p => p.id === id) || null : null;
            const unitList = id ? await api.getUnitsByPlant(id) : [];

            set((state) => ({
                selection: {
                    ...state.selection,
                    plantId: id,
                    unitId: null,
                    areaId: null,
                    projectId: null,
                    psvId: null,
                },
                selectedPlant: plant,
                selectedUnit: null,
                selectedArea: null,
                selectedProject: null,
                selectedPsv: null,
                unitList,
                units: unitList,
                areaList: [],
                projectList: [],
                psvList: [],
                scenarioList: [],
                sizingCaseList: [],
                isLoading: false
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load units';
            set({ error: message, isLoading: false });
            toast.error('Failed to load units', { description: message });
        }
    },

    selectUnit: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const unit = id ? get().units.find(u => u.id === id) || null : null;
            const areaList = id ? await api.getAreasByUnit(id) : [];

            set((state) => ({
                selection: {
                    ...state.selection,
                    unitId: id,
                    areaId: null,
                    projectId: null,
                    psvId: null,
                },
                selectedUnit: unit,
                selectedArea: null,
                selectedProject: null,
                selectedPsv: null,
                areaList,
                areas: areaList,
                projectList: [],
                psvList: [],
                scenarioList: [],
                sizingCaseList: [],
                isLoading: false
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load areas';
            set({ error: message, isLoading: false });
            toast.error('Failed to load areas', { description: message });
        }
    },

    selectArea: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const area = id ? get().areas.find(a => a.id === id) || null : null;
            const projectList = id ? await api.getProjectsByArea(id) : [];

            set((state) => ({
                selection: {
                    ...state.selection,
                    areaId: id,
                    projectId: null,
                    psvId: null,
                },
                selectedArea: area,
                selectedProject: null,
                selectedPsv: null,
                projectList,
                projects: projectList,
                psvList: [],
                scenarioList: [],
                sizingCaseList: [],
                isLoading: false
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load projects';
            set({ error: message, isLoading: false });
            toast.error('Failed to load projects', { description: message });
        }
    },

    selectProject: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const project = id ? get().projects.find(p => p.id === id) || null : null;
            // PSVs are children of Area, not Project
            const psvList = project ? await api.getProtectiveSystems(project.areaId) : [];

            set((state) => ({
                selection: {
                    ...state.selection,
                    projectId: id,
                    psvId: null,
                },
                selectedProject: project,
                selectedPsv: null,
                psvList,
                protectiveSystems: psvList,
                scenarioList: [],
                sizingCaseList: [],
                attachmentList: [],
                todoList: [],
                commentList: [],
                isLoading: false
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load PSVs';
            set({ error: message, isLoading: false });
            toast.error('Failed to load PSVs', { description: message });
        }
    },

    selectPsv: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const psv = id ? await api.getProtectiveSystem(id) : null;
            const [scenarioList, sizingCaseList, todoList, commentList] = id ? await Promise.all([
                api.getScenarios(id),
                api.getSizingCases(id),
                api.getTodos(id),
                api.getComments(id),
            ]) : [[], [], [], []];

            set((state) => ({
                selection: {
                    ...state.selection,
                    psvId: id,
                },
                selectedPsv: psv,
                scenarioList,
                sizingCaseList,
                todoList,
                commentList,
                activeTab: 0, // Reset to overview tab
                isLoading: false
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load PSV details';
            set({ error: message, isLoading: false });
            toast.error('Failed to load PSV details', { description: message });
        }
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    setCurrentPage: (page) => set({
        currentPage: page,
        selectedPsv: page ? null : get().selectedPsv
    }),

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    clearSelection: () => {
        set({
            selection: {
                customerId: null,
                plantId: null,
                unitId: null,
                areaId: null,
                projectId: null,
                psvId: null,
            },
            selectedCustomer: null,
            selectedPlant: null,
            selectedUnit: null,
            selectedArea: null,
            selectedProject: null,
            selectedPsv: null,
            plantList: [],
            unitList: [],
            areaList: [],
            projectList: [],
            psvList: [],
            scenarioList: [],
            sizingCaseList: [],
            equipmentLinkList: [],
        });
    },

    navigateToLevel: (level) => {
        const state = get();

        switch (level) {
            case 'customer':
                state.clearSelection();
                break;
            case 'plant':
                if (state.selection.customerId) {
                    state.selectCustomer(state.selection.customerId);
                }
                break;
            case 'unit':
                if (state.selection.plantId) {
                    state.selectPlant(state.selection.plantId);
                }
                break;
            case 'area':
                if (state.selection.unitId) {
                    state.selectUnit(state.selection.unitId);
                }
                break;
            case 'project':
                if (state.selection.areaId) {
                    state.selectArea(state.selection.areaId);
                }
                break;
            case 'psv':
                if (state.selection.projectId) {
                    state.selectProject(state.selection.projectId);
                }
                break;
        }
    },

    updateSizingCase: async (updatedCase) => {
        try {
            const updated = await api.updateSizingCase(updatedCase.id, updatedCase);
            set((state) => ({
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
            if (!get().selectedPsv) throw new Error('No PSV selected');
            const created = await api.createSizingCase(get().selectedPsv!.id, newCase);
            set((state) => ({
                sizingCaseList: [...state.sizingCaseList, created],
            }));
            toast.success('Sizing case added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add sizing case';
            toast.error('Failed to add sizing case', { description: message });
            throw error;
        }
    },

    updatePsv: async (updatedPsv) => {
        try {
            const updated = await api.updateProtectiveSystem(updatedPsv.id, updatedPsv);
            set((state) => {
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
            toast.error('Failed to update PSV', { description: message });
            throw error;
        }
    },

    deleteSizingCase: async (id) => {
        try {
            await api.deleteSizingCase(id);
            set((state) => ({
                sizingCaseList: state.sizingCaseList.filter((c) => c.id !== id),
            }));
            toast.success('Sizing case deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete sizing case';
            toast.error('Failed to delete sizing case', { description: message });
            throw error;
        }
    },

    addScenario: async (newScenario) => {
        try {
            if (!get().selectedPsv) throw new Error('No PSV selected');
            const created = await api.createScenario(get().selectedPsv!.id, newScenario);
            set((state) => ({
                scenarioList: [...state.scenarioList, created],
            }));
            toast.success('Scenario added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add scenario';
            toast.error('Failed to add scenario', { description: message });
            throw error;
        }
    },

    updateScenario: async (updatedScenario) => {
        try {
            const updated = await api.updateScenario(updatedScenario.id, updatedScenario);
            set((state) => ({
                scenarioList: state.scenarioList.map((s) =>
                    s.id === updated.id ? updated : s
                ),
            }));
            toast.success('Scenario updated');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update scenario';
            toast.error('Failed to update scenario', { description: message });
            throw error;
        }
    },

    deleteScenario: async (id) => {
        try {
            await api.deleteScenario(id);
            set((state) => ({
                scenarioList: state.scenarioList.filter((s) => s.id !== id),
            }));
            toast.success('Scenario deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete scenario';
            toast.error('Failed to delete scenario', { description: message });
            throw error;
        }
    },

    addPsvTag: async (psvId, tag) => {
        try {
            const psv = get().psvList.find(p => p.id === psvId);
            if (!psv) return;

            const updatedPsv = { ...psv, tags: [...psv.tags, tag] };
            await api.updateProtectiveSystem(psvId, { tags: updatedPsv.tags });

            set((state) => {
                const newPsvList = state.psvList.map(p => p.id === psvId ? updatedPsv : p);
                return {
                    psvList: newPsvList,
                    protectiveSystems: state.protectiveSystems.map(p => p.id === psvId ? updatedPsv : p),
                    selectedPsv: state.selectedPsv?.id === psvId ? updatedPsv : state.selectedPsv,
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

            const updatedPsv = { ...psv, tags: psv.tags.filter(t => t !== tag) };
            await api.updateProtectiveSystem(psvId, { tags: updatedPsv.tags });

            set((state) => {
                const newPsvList = state.psvList.map(p => p.id === psvId ? updatedPsv : p);
                return {
                    psvList: newPsvList,
                    protectiveSystems: state.protectiveSystems.map(p => p.id === psvId ? updatedPsv : p),
                    selectedPsv: state.selectedPsv?.id === psvId ? updatedPsv : state.selectedPsv,
                };
            });
            toast.success('Tag removed');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove tag';
            toast.error('Failed to remove tag', { description: message });
            throw error;
        }
    },

    linkEquipment: (link) => {
        set((state) => ({
            equipmentLinkList: [...state.equipmentLinkList, link]
        }));
    },

    unlinkEquipment: (linkId) => {
        set((state) => ({
            equipmentLinkList: state.equipmentLinkList.filter(l => l.id !== linkId)
        }));
    },

    deletePsv: async (id) => {
        try {
            await api.deleteProtectiveSystem(id);
            const state = get();
            set((state) => ({
                psvList: state.psvList.filter((p) => p.id !== id),
                protectiveSystems: state.protectiveSystems.filter((p) => p.id !== id),
                selectedPsv: state.selectedPsv?.id === id ? null : state.selectedPsv,
                selection: state.selectedPsv?.id === id ? { ...state.selection, psvId: null } : state.selection,
            }));

            // Navigate back to project level if the deleted PSV was selected
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

    deleteAttachment: async (id) => {
        try {
            await api.deleteAttachment(id);
            set((state) => ({
                attachmentList: state.attachmentList.filter((a) => a.id !== id)
            }));
            toast.success('Attachment deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete attachment';
            toast.error('Failed to delete attachment', { description: message });
            throw error;
        }
    },

    addAttachment: async (attachment) => {
        try {
            const created = await api.createAttachment(attachment);
            set((state) => ({
                attachmentList: [...state.attachmentList, created]
            }));
            toast.success('Attachment added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add attachment';
            toast.error('Failed to add attachment', { description: message });
            throw error;
        }
    },

    // Todo Actions
    addTodo: async (todo) => {
        try {
            const created = await api.createTodo(todo);
            set((state) => ({
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
            await api.deleteTodo(id);
            set((state) => ({
                todoList: state.todoList.filter((t) => t.id !== id)
            }));
            toast.success('Todo deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete todo';
            toast.error('Failed to delete todo', { description: message });
            throw error;
        }
    },

    toggleTodo: async (id) => {
        try {
            const todo = get().todoList.find((t) => t.id === id);
            if (!todo) return;

            const updated = await api.updateTodo(id, { completed: !todo.completed });
            set((state) => ({
                todoList: state.todoList.map((t) =>
                    t.id === id ? updated : t
                )
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to toggle todo';
            toast.error('Failed to toggle todo', { description: message });
            throw error;
        }
    },

    // Comment Actions
    addComment: async (comment) => {
        try {
            const created = await api.createComment(comment);
            set((state) => ({
                commentList: [...state.commentList, created]
            }));
            toast.success('Comment added');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add comment';
            toast.error('Failed to add comment', { description: message });
            throw error;
        }
    },

    deleteComment: async (id) => {
        try {
            await api.deleteComment(id);
            set((state) => ({
                commentList: state.commentList.filter((c) => c.id !== id)
            }));
            toast.success('Comment deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete comment';
            toast.error('Failed to delete comment', { description: message });
            throw error;
        }
    },

    // Hierarchy CRUD Actions
    // Customer
    addCustomer: async (customer) => {
        try {
            const newCustomer = { ...customer, status: customer.status || 'active', ownerId: customer.ownerId || 'user-maetee' };
            // Note: API doesn't have create customer endpoint yet, would throw
            toast.error('Create customer not implemented yet');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add customer';
            toast.error('Failed to add customer', { description: message });
            throw error;
        }
    },

    updateCustomer: async (id, updates) => {
        try {
            // Note: API doesn't have update customer endpoint yet
            toast.error('Update customer not implemented yet');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update customer';
            toast.error('Failed to update customer', { description: message });
            throw error;
        }
    },

    deleteCustomer: async (id) => {
        try {
            // Note: API doesn't have delete customer endpoint yet
            toast.error('Delete customer not implemented yet');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete customer';
            toast.error('Failed to delete customer', { description: message });
            throw error;
        }
    },

    // Similar stubs for Plant, Unit, Area, Project, Equipment
    addPlant: async () => { toast.error('Not implemented yet'); },
    updatePlant: async () => { toast.error('Not implemented yet'); },
    deletePlant: async () => { toast.error('Not implemented yet'); },

    addUnit: async () => { toast.error('Not implemented yet'); },
    updateUnit: async () => { toast.error('Not implemented yet'); },
    deleteUnit: async () => { toast.error('Not implemented yet'); },

    addArea: async () => { toast.error('Not implemented yet'); },
    updateArea: async () => { toast.error('Not implemented yet'); },
    deleteArea: async () => { toast.error('Not implemented yet'); },

    addProject: async () => { toast.error('Not implemented yet'); },
    updateProject: async () => { toast.error('Not implemented yet'); },
    deleteProject: async () => { toast.error('Not implemented yet'); },

    addProtectiveSystem: async (psv) => {
        try {
            const created = await api.createProtectiveSystem(psv);
            set((state) => ({
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
            const updated = await api.updateProtectiveSystem(id, updates);
            set((state) => ({
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
            await api.deleteProtectiveSystem(id);
            set((state) => ({
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

    addEquipment: () => { toast.error('Not implemented yet'); },
    updateEquipment: () => { toast.error('Not implemented yet'); },
    deleteEquipment: () => { toast.error('Not implemented yet'); },
}));
