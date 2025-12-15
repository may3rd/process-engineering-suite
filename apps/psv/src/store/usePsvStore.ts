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
    ProjectNote,
    RevisionHistory,
    RevisionEntityType,
} from '@/data/types';
import { getDataService } from '@/lib/api';
import { toast } from '@/lib/toast';

// Get the appropriate data service based on environment
const dataService = getDataService();

function handleOptionalFetch<T>(promise: Promise<T>, label: string, fallback: T): Promise<T> {
    return promise.catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`${label} unavailable: ${message}`);
        return fallback;
    });
}

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
    currentPage: 'hierarchy' | 'dashboard' | 'account' | 'scenario_consideration' | null;
    dashboardTab: 'Customers' | 'Plants' | 'Units' | 'Areas' | 'Projects' | 'Equipment' | 'PSVs' | 'Users' | null;
    editingScenarioId: string | null;
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
    setDashboardTab: (tab: PsvStore['dashboardTab']) => void;
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
    linkEquipment: (link: { psvId: string; equipmentId: string; isPrimary?: boolean; scenarioId?: string; relationship?: string; notes?: string }) => Promise<void>;
    unlinkEquipment: (linkId: string) => Promise<void>;
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

    // Notes Actions (async)
    addNote: (note: ProjectNote) => Promise<void>;
    updateNote: (id: string, updates: Partial<ProjectNote>) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    noteList: ProjectNote[];

    // Comment Actions (async)
    addComment: (comment: Comment) => Promise<void>;
    updateComment: (id: string, updates: Partial<Comment>) => Promise<void>;
    deleteComment: (id: string) => Promise<void>;
    commentList: Comment[];

    // Revision History Actions
    revisionHistory: RevisionHistory[];
    loadRevisionHistory: (entityType: RevisionEntityType, entityId: string) => Promise<void>;
    createRevision: (entityType: RevisionEntityType, entityId: string, revisionCode: string, description?: string) => Promise<RevisionHistory>;
    updateRevisionLifecycle: (revisionId: string, field: 'checkedBy' | 'approvedBy', userId: string) => Promise<void>;
    getCurrentRevision: (entityType: RevisionEntityType, entityId: string) => RevisionHistory | undefined;
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
    noteList: [],
    commentList: [],

    // UI state
    activeTab: 0,
    sidebarOpen: true,
    currentPage: null,
    dashboardTab: null,
    editingScenarioId: null,
    isLoading: false,
    error: null,

    // Initialize - fetch initial data from API
    initialize: async () => {
        set({ isLoading: true, error: null });
        try {
            // Fetch customers
            const customers = await dataService.getCustomers();

            // Fetch FULL Hierarchy for Dashboard counts
            // Cascade: Customers -> Plants -> Units -> Areas -> Projects

            // 1. All Plants
            let allPlants: Plant[] = [];
            try {
                const plantsResults = await Promise.all(
                    customers.map(c => dataService.getPlantsByCustomer(c.id))
                );
                allPlants = plantsResults.flat();
            } catch (err) {
                console.error("Failed to fetch plants:", err);
            }

            // 2. All Units
            let allUnits: Unit[] = [];
            try {
                const unitsResults = await Promise.all(
                    allPlants.map(p => dataService.getUnitsByPlant(p.id))
                );
                allUnits = unitsResults.flat();
            } catch (err) {
                console.error("Failed to fetch units:", err);
            }

            // 3. All Areas
            let allAreas: Area[] = [];
            try {
                const areasResults = await Promise.all(
                    allUnits.map(u => dataService.getAreasByUnit(u.id))
                );
                allAreas = areasResults.flat();
            } catch (err) {
                console.error("Failed to fetch areas:", err);
            }

            // 4. All Projects
            let allProjects: Project[] = [];
            try {
                const projectsResults = await Promise.all(
                    allAreas.map(a => dataService.getProjectsByArea(a.id))
                );
                allProjects = projectsResults.flat();
            } catch (err) {
                console.error("Failed to fetch projects:", err);
            }

            // 5. All Protective Systems (Global fetch supported)
            let allPsvs: ProtectiveSystem[] = [];
            try {
                allPsvs = await dataService.getProtectiveSystems();
            } catch (err) {
                console.error("Failed to fetch PSVs:", err);
            }

            // Fetch equipment (fallback to empty if API fails)
            let equipmentList: Equipment[] = [];
            try {
                equipmentList = await dataService.getEquipment();
            } catch {
                // If API fails, import mock data as fallback
                const mockData = await import('@/data/mockData');
                equipmentList = mockData.equipment;
            }

            set({
                customers,
                customerList: customers,
                plants: allPlants,
                plantList: allPlants,
                units: allUnits,
                unitList: allUnits,
                areas: allAreas,
                areaList: allAreas,
                projects: allProjects,
                projectList: allProjects,
                protectiveSystems: allPsvs,
                psvList: allPsvs,
                equipment: equipmentList,
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

            // If selecting a customer, fetch fresh plants for that customer
            let newPlants = get().plants;
            let displayedPlants: Plant[] = [];

            if (id) {
                const fetchedPlants = await dataService.getPlantsByCustomer(id);
                // Update global cache: remove old plants for this customer and add fresh ones
                newPlants = [
                    ...newPlants.filter(p => p.customerId !== id),
                    ...fetchedPlants
                ];
                displayedPlants = fetchedPlants;
            } else {
                // If clearing selection, show all cached plants
                displayedPlants = newPlants;
            }

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
                plantList: displayedPlants,
                plants: newPlants, // Update cache, don't overwrite with subset!
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

            let newUnits = get().units;
            let displayedUnits: Unit[] = [];

            if (id) {
                const fetchedUnits = await dataService.getUnitsByPlant(id);
                // Merge units into global cache
                newUnits = [
                    ...newUnits.filter(u => u.plantId !== id),
                    ...fetchedUnits
                ];
                displayedUnits = fetchedUnits;
            } else {
                displayedUnits = newUnits;
            }

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
                unitList: displayedUnits,
                units: newUnits, // Preserve global cache
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

            let newAreas = get().areas;
            let displayedAreas: Area[] = [];

            if (id) {
                const fetchedAreas = await dataService.getAreasByUnit(id);
                // Merge areas into global cache
                newAreas = [
                    ...newAreas.filter(a => a.unitId !== id),
                    ...fetchedAreas
                ];
                displayedAreas = fetchedAreas;
            } else {
                displayedAreas = newAreas;
            }

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
                areaList: displayedAreas,
                areas: newAreas, // Preserve global cache
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

            let newProjects = get().projects;
            let displayedProjects: Project[] = [];

            if (id) {
                const fetchedProjects = await dataService.getProjectsByArea(id);
                // Merge projects into global cache
                newProjects = [
                    ...newProjects.filter(p => p.areaId !== id),
                    ...fetchedProjects
                ];
                displayedProjects = fetchedProjects;
            } else {
                displayedProjects = newProjects;
            }

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
                projectList: displayedProjects,
                projects: newProjects, // Preserve global cache
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
            // PSVs are children of Area, not Project, but often filtered by Project context if needed
            // For now, API gets PSVs by Area. 
            // Better to display PSVs relevant to the project's area? 
            // Or if backend supports getProtectiveSystems(projectId)? 
            // Current code passes project.areaId. This assumes we want ALL PSVs in that area.

            let newPsvs = get().protectiveSystems;
            let displayedPsvs: ProtectiveSystem[] = [];

            if (project) {
                const fetchedPsvs = await dataService.getProtectiveSystems(project.areaId);
                // Merge into global cache
                newPsvs = [
                    ...newPsvs.filter(p => p.areaId !== project.areaId),
                    ...fetchedPsvs
                ];
                // Filter specifically for this project if possible? 
                // The current API behavior (based on old code) fetches by areaId. 
                // And presumably displays them. 
                // But filtering strictly for this project ID might be better for "Project View".
                // Let's stick to what it was doing: Fetch by Area. 
                // But wait, if multiple projects share an area, this shows PSVs from other projects in the same area?
                // Yes, unless we filter locally.
                displayedPsvs = fetchedPsvs.filter(p => !p.projectIds || p.projectIds.includes(project.id));
            } else {
                displayedPsvs = newPsvs;
            }

            set((state) => ({
                selection: {
                    ...state.selection,
                    projectId: id,
                    psvId: null,
                },
                selectedProject: project,
                selectedPsv: null,
                psvList: displayedPsvs,
                protectiveSystems: newPsvs, // Preserve global cache
                scenarioList: [],
                sizingCaseList: [],
                attachmentList: [],
                todoList: [],
                noteList: [],
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
            const psv = id ? await dataService.getProtectiveSystem(id) : null;
            const [scenarioList, sizingCaseList, todoList, commentList, noteList, equipmentLinks] = id ? await Promise.all([
                dataService.getScenarios(id),
                dataService.getSizingCases(id),
                dataService.getTodos(id),
                handleOptionalFetch(dataService.getComments(id), 'Comments', []),
                handleOptionalFetch(dataService.getNotes(id), 'Notes', []),
                handleOptionalFetch(dataService.getEquipmentLinks(id), 'Equipment links', []),
            ]) : [[], [], [], [], [], []];

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
                noteList,
                equipmentLinkList: equipmentLinks,
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

    setDashboardTab: (tab) => set({ dashboardTab: tab }),

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
            const updated = await dataService.updateSizingCase(updatedCase.id, updatedCase);
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
            const created = await dataService.createSizingCase(get().selectedPsv!.id, newCase);
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
            const updated = await dataService.updateProtectiveSystem(updatedPsv.id, updatedPsv);
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
            await dataService.deleteSizingCase(id);
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
            const created = await dataService.createScenario(get().selectedPsv!.id, newScenario);
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
            const updated = await dataService.updateScenario(updatedScenario.id, updatedScenario);
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
            await dataService.deleteScenario(id);
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

            // Optimistic update logic was flawed. Now using API response.
            // But API update requires just the tags array usually if using Partial.
            const updated = await dataService.updateProtectiveSystem(psvId, { tags: [...psv.tags, tag] });

            set((state) => {
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

            const updated = await dataService.updateProtectiveSystem(psvId, { tags: psv.tags.filter(t => t !== tag) });

            set((state) => {
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
            const created = await dataService.createEquipmentLink({
                protectiveSystemId: psvId,
                equipmentId,
                isPrimary,
                scenarioId,
                relationship,
                notes,
            });
            set((state) => ({
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
            await dataService.deleteEquipmentLink(linkId);
            set((state) => ({
                equipmentLinkList: state.equipmentLinkList.filter(l => l.id !== linkId)
            }));
            toast.success('Equipment unlinked');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to unlink equipment';
            toast.error('Failed to unlink equipment', { description: message });
            throw error;
        }
    },

    deletePsv: async (id) => {
        try {
            await dataService.deleteProtectiveSystem(id);
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
            await dataService.deleteAttachment(id);
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
            const created = await dataService.createAttachment(attachment);
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
            const created = await dataService.createTodo(todo);
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
            await dataService.deleteTodo(id);
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

            const updated = await dataService.updateTodo(id, { completed: !todo.completed });
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

    // Notes Actions
    addNote: async (note) => {
        try {
            const created = await dataService.createNote(note);
            set((state) => ({
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
        const payload: Partial<ProjectNote> = {
            ...updates,
            updatedAt: updates.updatedAt || new Date().toISOString(),
        };
        try {
            const updated = await dataService.updateNote(id, payload);
            set((state) => ({
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
            await dataService.deleteNote(id);
            set((state) => ({
                noteList: state.noteList.filter((n) => n.id !== id)
            }));
            toast.success('Note deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete note';
            toast.error('Failed to delete note', { description: message });
            throw error;
        }
    },

    // Comment Actions
    addComment: async (comment) => {
        try {
            const created = await dataService.createComment(comment);
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

    updateComment: async (id, updates) => {
        const payload: Partial<Comment> = {
            ...updates,
            updatedAt: updates.updatedAt || new Date().toISOString(),
        };
        try {
            const updated = await dataService.updateComment(id, payload);
            set((state) => ({
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
            const created = await dataService.createCustomer(customer);
            set((state) => ({
                customers: [...state.customers, created],
                customerList: [...state.customerList, created], // Assuming customerList follows customers
            }));
            toast.success('Customer added');
        } catch (error) {
            toast.error('Failed to add customer');
            throw error;
        }
    },

    updateCustomer: async (id, updates) => {
        try {
            const updated = await dataService.updateCustomer(id, updates);
            set((state) => ({
                customers: state.customers.map(c => c.id === id ? updated : c),
                customerList: state.customerList.map(c => c.id === id ? updated : c),
                selectedCustomer: state.selectedCustomer?.id === id ? updated : state.selectedCustomer,
            }));
            toast.success('Customer updated');
        } catch (error) {
            toast.error('Failed to update customer');
            throw error;
        }
    },

    deleteCustomer: async (id) => {
        try {
            await dataService.deleteCustomer(id);
            set((state) => ({
                customers: state.customers.filter(c => c.id !== id),
                customerList: state.customerList.filter(c => c.id !== id),
                selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer,
            }));
            toast.success('Customer deleted');
        } catch (error) {
            toast.error('Failed to delete customer');
            throw error;
        }
    },

    addPlant: async (plant) => {
        try {
            const created = await dataService.createPlant(plant);
            set((state) => ({
                plants: [...state.plants, created],
                plantList: state.selectedCustomer?.id === created.customerId ? [...state.plantList, created] : state.plantList,
            }));
            toast.success('Plant added');
        } catch (error) {
            toast.error('Failed to add plant');
            throw error;
        }
    },

    updatePlant: async (id, updates) => {
        try {
            const updated = await dataService.updatePlant(id, updates);
            set((state) => ({
                plants: state.plants.map(p => p.id === id ? updated : p),
                plantList: state.plantList.map(p => p.id === id ? updated : p),
                selectedPlant: state.selectedPlant?.id === id ? updated : state.selectedPlant,
            }));
            toast.success('Plant updated');
        } catch (error) {
            toast.error('Failed to update plant');
            throw error;
        }
    },

    deletePlant: async (id) => {
        try {
            await dataService.deletePlant(id);
            set((state) => ({
                plants: state.plants.filter(p => p.id !== id),
                plantList: state.plantList.filter(p => p.id !== id),
                selectedPlant: state.selectedPlant?.id === id ? null : state.selectedPlant,
            }));
            toast.success('Plant deleted');
        } catch (error) {
            toast.error('Failed to delete plant');
            throw error;
        }
    },

    addUnit: async (unit) => {
        try {
            const created = await dataService.createUnit(unit);
            set((state) => ({
                units: [...state.units, created],
                unitList: state.selectedPlant?.id === created.plantId ? [...state.unitList, created] : state.unitList,
            }));
            toast.success('Unit added');
        } catch (error) {
            toast.error('Failed to add unit');
            throw error;
        }
    },

    updateUnit: async (id, updates) => {
        try {
            const updated = await dataService.updateUnit(id, updates);
            set((state) => ({
                units: state.units.map(u => u.id === id ? updated : u),
                unitList: state.unitList.map(u => u.id === id ? updated : u),
                selectedUnit: state.selectedUnit?.id === id ? updated : state.selectedUnit,
            }));
            toast.success('Unit updated');
        } catch (error) {
            toast.error('Failed to update unit');
            throw error;
        }
    },

    deleteUnit: async (id) => {
        try {
            await dataService.deleteUnit(id);
            set((state) => ({
                units: state.units.filter(u => u.id !== id),
                unitList: state.unitList.filter(u => u.id !== id),
                selectedUnit: state.selectedUnit?.id === id ? null : state.selectedUnit,
            }));
            toast.success('Unit deleted');
        } catch (error) {
            toast.error('Failed to delete unit');
            throw error;
        }
    },

    addArea: async (area) => {
        try {
            const created = await dataService.createArea(area);
            set((state) => ({
                areas: [...state.areas, created],
                areaList: state.selectedUnit?.id === created.unitId ? [...state.areaList, created] : state.areaList,
            }));
            toast.success('Area added');
        } catch (error) {
            toast.error('Failed to add area');
            throw error;
        }
    },

    updateArea: async (id, updates) => {
        try {
            const updated = await dataService.updateArea(id, updates);
            set((state) => ({
                areas: state.areas.map(a => a.id === id ? updated : a),
                areaList: state.areaList.map(a => a.id === id ? updated : a),
                selectedArea: state.selectedArea?.id === id ? updated : state.selectedArea,
            }));
            toast.success('Area updated');
        } catch (error) {
            toast.error('Failed to update area');
            throw error;
        }
    },

    deleteArea: async (id) => {
        try {
            await dataService.deleteArea(id);
            set((state) => ({
                areas: state.areas.filter(a => a.id !== id),
                areaList: state.areaList.filter(a => a.id !== id),
                selectedArea: state.selectedArea?.id === id ? null : state.selectedArea,
            }));
            toast.success('Area deleted');
        } catch (error) {
            toast.error('Failed to delete area');
            throw error;
        }
    },

    addProject: async (project) => {
        try {
            const created = await dataService.createProject(project);
            set((state) => ({
                projects: [...state.projects, created],
                projectList: state.selectedArea?.id === created.areaId ? [...state.projectList, created] : state.projectList,
            }));
            toast.success('Project added');
        } catch (error) {
            toast.error('Failed to add project');
            throw error;
        }
    },

    updateProject: async (id, updates) => {
        try {
            const updated = await dataService.updateProject(id, updates);
            set((state) => ({
                projects: state.projects.map(p => p.id === id ? updated : p),
                projectList: state.projectList.map(p => p.id === id ? updated : p),
                selectedProject: state.selectedProject?.id === id ? updated : state.selectedProject,
            }));
            toast.success('Project updated');
        } catch (error) {
            toast.error('Failed to update project');
            throw error;
        }
    },

    deleteProject: async (id) => {
        try {
            await dataService.deleteProject(id);
            set((state) => ({
                projects: state.projects.filter(p => p.id !== id),
                projectList: state.projectList.filter(p => p.id !== id),
                selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
            }));
            toast.success('Project deleted');
        } catch (error) {
            toast.error('Failed to delete project');
            throw error;
        }
    },

    addProtectiveSystem: async (psv) => {
        try {
            const created = await dataService.createProtectiveSystem(psv);
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
            const updated = await dataService.updateProtectiveSystem(id, updates);
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
            await dataService.deleteProtectiveSystem(id);
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

    addEquipment: async (data) => {
        try {
            const created = await dataService.createEquipment(data);
            set((state) => ({
                equipment: [...state.equipment, created],
            }));
            toast.success('Equipment created');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create equipment';
            toast.error('Failed to create equipment', { description: message });
            throw error;
        }
    },
    updateEquipment: async (id, updates) => {
        try {
            const updated = await dataService.updateEquipment(id, updates);
            set((state) => ({
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
            set((state) => ({
                equipment: state.equipment.filter(e => e.id !== id),
            }));
            toast.success('Equipment deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete equipment';
            toast.error('Failed to delete equipment', { description: message });
            throw error;
        }
    },

    // --- Revision History ---
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

        // Get entity snapshot based on type
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

        const newRevision = await dataService.createRevision(entityType, entityId, {
            revisionCode,
            description,
            snapshot,
            originatedBy: undefined, // TODO: Get from auth store
        });

        // Update entity's currentRevisionId
        if (entityType === 'protective_system') {
            await dataService.updateProtectiveSystem(entityId, { currentRevisionId: newRevision.id });
            set((state) => ({
                protectiveSystems: state.protectiveSystems.map(p =>
                    p.id === entityId ? { ...p, currentRevisionId: newRevision.id } : p
                ),
                selectedPsv: state.selectedPsv?.id === entityId
                    ? { ...state.selectedPsv, currentRevisionId: newRevision.id }
                    : state.selectedPsv,
                revisionHistory: [newRevision, ...state.revisionHistory],
            }));
        } else if (entityType === 'scenario') {
            await dataService.updateScenario(entityId, { currentRevisionId: newRevision.id });
            set((state) => ({
                scenarioList: state.scenarioList.map((s: OverpressureScenario) =>
                    s.id === entityId ? { ...s, currentRevisionId: newRevision.id } : s
                ),
                revisionHistory: [newRevision, ...state.revisionHistory],
            }));
        } else if (entityType === 'sizing_case') {
            await dataService.updateSizingCase(entityId, { currentRevisionId: newRevision.id });
            set((state) => ({
                sizingCaseList: state.sizingCaseList.map((c: SizingCase) =>
                    c.id === entityId ? { ...c, currentRevisionId: newRevision.id } : c
                ),
                revisionHistory: [newRevision, ...state.revisionHistory],
            }));
        }

        toast.success(`Created revision ${revisionCode}`);
        return newRevision;
    },

    updateRevisionLifecycle: async (revisionId, field, userId) => {
        const now = new Date().toISOString();
        const updates: Partial<RevisionHistory> = {
            [field]: userId,
            [`${field.replace('By', 'At')}`]: now,
        };

        await dataService.updateRevision(revisionId, updates);
        set((state) => ({
            revisionHistory: state.revisionHistory.map(r =>
                r.id === revisionId ? { ...r, ...updates } : r
            ),
        }));

        const action = field === 'checkedBy' ? 'Checked' : 'Approved';
        toast.success(`Revision ${action}`);
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
}));
