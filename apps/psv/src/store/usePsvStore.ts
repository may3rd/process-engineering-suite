import { create } from 'zustand';
import {
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
import {
    customers,
    plants,
    units,
    areas,
    projects,
    protectiveSystems,
    scenarios,
    sizingCases,
    attachments,
    todos,
    comments,
    getPlantsByCustomer,
    getUnitsByPlant,
    getAreasByUnit,
    getProjectsByArea,
    getProtectiveSystemsByArea,
    getProtectiveSystemsByProject,
    getScenariosByProtectiveSystem,
    getSizingCasesByProtectiveSystem,
    getEquipmentLinksByPsv,
    getEquipmentByArea,
} from '@/data/mockData';

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

    // Actions
    selectCustomer: (id: string | null) => void;
    selectPlant: (id: string | null) => void;
    selectUnit: (id: string | null) => void;
    selectArea: (id: string | null) => void;
    selectProject: (id: string | null) => void;
    selectPsv: (id: string | null) => void;
    setActiveTab: (tab: number) => void;
    setCurrentPage: (page: 'hierarchy' | 'dashboard' | 'account' | null) => void;
    toggleSidebar: () => void;
    clearSelection: () => void;
    navigateToLevel: (level: 'customer' | 'plant' | 'unit' | 'area' | 'project' | 'psv') => void;
    updateSizingCase: (updatedCase: SizingCase) => void;
    addSizingCase: (newCase: SizingCase) => void;
    deleteSizingCase: (id: string) => void;
    updatePsv: (updatedPsv: ProtectiveSystem) => void;

    // Scenario Actions
    addScenario: (newScenario: OverpressureScenario) => void;
    updateScenario: (updatedScenario: OverpressureScenario) => void;
    deleteScenario: (id: string) => void;

    // Tag Actions
    addPsvTag: (psvId: string, tag: string) => void;
    removePsvTag: (psvId: string, tag: string) => void;

    // Equipment Link Actions
    linkEquipment: (link: EquipmentLink) => void;
    unlinkEquipment: (linkId: string) => void;
    deletePsv: (id: string) => void;
    deleteAttachment: (id: string) => void;
    addAttachment: (attachment: Attachment) => void;
    attachmentList: Attachment[];

    // Hierarchy CRUD Actions
    addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
    updateCustomer: (id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>) => void;
    deleteCustomer: (id: string) => void;

    addPlant: (plant: Omit<Plant, 'id' | 'createdAt'>) => void;
    updatePlant: (id: string, updates: Partial<Omit<Plant, 'id' | 'createdAt'>>) => void;
    deletePlant: (id: string) => void;

    addUnit: (unit: Omit<Unit, 'id' | 'createdAt'>) => void;
    updateUnit: (id: string, updates: Partial<Omit<Unit, 'id' | 'createdAt'>>) => void;
    deleteUnit: (id: string) => void;

    addArea: (area: Omit<Area, 'id' | 'createdAt'>) => void;
    updateArea: (id: string, updates: Partial<Omit<Area, 'id' | 'createdAt'>>) => void;
    deleteArea: (id: string) => void;

    addProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
    updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
    deleteProject: (id: string) => void;

    addProtectiveSystem: (psv: Omit<ProtectiveSystem, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateProtectiveSystem: (id: string, updates: Partial<Omit<ProtectiveSystem, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    deleteProtectiveSystem: (id: string) => void;

    addEquipment: (equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateEquipment: (id: string, updates: Partial<Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    deleteEquipment: (id: string) => void;

    // Todo Actions
    addTodo: (todo: TodoItem) => void;
    deleteTodo: (id: string) => void;
    toggleTodo: (id: string) => void;
    todoList: TodoItem[];

    // Comment Actions
    addComment: (comment: Comment) => void;
    deleteComment: (id: string) => void;
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

    // State arrays (initialized with mock data)
    customers: [...customers],
    plants: [...plants],
    units: [...units],
    areas: [...areas],
    projects: [...projects],
    protectiveSystems: [...protectiveSystems],
    equipment: [],

    // Initial lists (filtered/computed)
    customerList: customers,
    plantList: [],
    unitList: [],
    areaList: [],
    projectList: [],
    psvList: [],
    scenarioList: [],
    sizingCaseList: [],
    equipmentLinkList: [],
    attachmentList: attachments,
    todoList: todos,
    commentList: comments,

    // UI state
    activeTab: 0,
    sidebarOpen: true,
    currentPage: null,

    // Actions
    selectCustomer: (id) => {
        const customer = id ? customers.find(c => c.id === id) || null : null;
        const plantList = id ? getPlantsByCustomer(id) : [];

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
            unitList: [],
            areaList: [],
            projectList: [],
            psvList: [],
            scenarioList: [],
            sizingCaseList: [],
            equipmentLinkList: [],
        });
    },

    selectPlant: (id) => {
        const plant = id ? plants.find(p => p.id === id) || null : null;
        const unitList = id ? getUnitsByPlant(id) : [];

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
            areaList: [],
            projectList: [],
            psvList: [],
            scenarioList: [],
            sizingCaseList: [],
        }));
    },

    selectUnit: (id) => {
        const unit = id ? units.find(u => u.id === id) || null : null;
        const areaList = id ? getAreasByUnit(id) : [];

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
            projectList: [],
            psvList: [],
            scenarioList: [],
            sizingCaseList: [],
        }));
    },

    selectArea: (id) => {
        const area = id ? areas.find(a => a.id === id) || null : null;
        const projectList = id ? getProjectsByArea(id) : [];

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
            psvList: [],
            scenarioList: [],
            sizingCaseList: [],
        }));
    },

    selectProject: (id) => {
        const { selection } = get();
        const project = projects.find(p => p.id === id);
        // PSVs are now children of Area, not Project
        const psvList = project ? getProtectiveSystemsByArea(project.areaId) : [];

        set((state) => ({
            selection: {
                ...state.selection,
                projectId: id,
                psvId: null,
            },
            selectedProject: project,
            selectedPsv: null,
            psvList,
            scenarioList: [],
            sizingCaseList: [],
            attachmentList: attachments,
            todoList: todos,
            commentList: comments,
        }));
    },

    selectPsv: (id) => {
        const psv = id ? protectiveSystems.find(p => p.id === id) || null : null;
        const scenarioList = id ? getScenariosByProtectiveSystem(id) : [];
        const sizingCaseList = id ? getSizingCasesByProtectiveSystem(id) : [];
        const equipmentLinkList = id ? getEquipmentLinksByPsv(id) : [];

        set((state) => ({
            selection: {
                ...state.selection,
                psvId: id,
            },
            selectedPsv: psv,
            scenarioList,
            sizingCaseList,
            equipmentLinkList,
            activeTab: 0, // Reset to overview tab
        }));
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    setCurrentPage: (page) => set({
        currentPage: page,
        selectedPsv: page ? null : get().selectedPsv // Clear selectedPsv when navigating to special pages
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

    updateSizingCase: (updatedCase) => {
        set((state) => ({
            sizingCaseList: state.sizingCaseList.map((c) =>
                c.id === updatedCase.id ? updatedCase : c
            )
        }));
    },

    addSizingCase: (newCase) => {
        set((state) => ({
            sizingCaseList: [...state.sizingCaseList, newCase],
        }));
    },

    updatePsv: (updatedPsv: ProtectiveSystem) => {
        set((state) => {
            const newList = state.psvList.map(p => p.id === updatedPsv.id ? updatedPsv : p);
            return {
                psvList: newList,
                selectedPsv: state.selectedPsv?.id === updatedPsv.id ? updatedPsv : state.selectedPsv,
            };
        });
    },

    deleteSizingCase: (id) => {
        set((state) => ({
            sizingCaseList: state.sizingCaseList.filter((c) => c.id !== id),
        }));
    },

    addScenario: (newScenario) => {
        set((state) => ({
            scenarioList: [...state.scenarioList, newScenario],
        }));
    },

    updateScenario: (updatedScenario) => {
        set((state) => ({
            scenarioList: state.scenarioList.map((s) =>
                s.id === updatedScenario.id ? updatedScenario : s
            ),
        }));
    },

    deleteScenario: (id) => {
        set((state) => ({
            scenarioList: state.scenarioList.filter((s) => s.id !== id),
        }));
    },

    addPsvTag: (psvId, tag) => {
        set((state) => {
            const psv = state.psvList.find(p => p.id === psvId);
            if (!psv) return state;

            const updatedPsv = { ...psv, tags: [...psv.tags, tag] };
            const newPsvList = state.psvList.map(p => p.id === psvId ? updatedPsv : p);

            return {
                psvList: newPsvList,
                selectedPsv: state.selectedPsv?.id === psvId ? updatedPsv : state.selectedPsv,
            };
        });
    },

    removePsvTag: (psvId, tag) => {
        set((state) => {
            const psv = state.psvList.find(p => p.id === psvId);
            if (!psv) return state;

            const updatedPsv = { ...psv, tags: psv.tags.filter(t => t !== tag) };
            const newPsvList = state.psvList.map(p => p.id === psvId ? updatedPsv : p);

            return {
                psvList: newPsvList,
                selectedPsv: state.selectedPsv?.id === psvId ? updatedPsv : state.selectedPsv,
            };
        });
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

    deletePsv: (id) => {
        const state = get();
        set((state) => ({
            psvList: state.psvList.filter((p) => p.id !== id),
            // If the deleted PSV was selected, clear selection
            selectedPsv: state.selectedPsv?.id === id ? null : state.selectedPsv,
            selection: state.selectedPsv?.id === id ? { ...state.selection, psvId: null } : state.selection,
        }));

        // Navigate back to project level if the deleted PSV was selected
        if (state.selectedPsv?.id === id && state.selection.projectId) {
            state.selectProject(state.selection.projectId);
        }
    },

    deleteAttachment: (id: string) => {
        set((state) => ({
            attachmentList: state.attachmentList.filter((a) => a.id !== id)
        }));
    },

    addAttachment: (attachment: Attachment) => {
        set((state) => ({
            attachmentList: [...state.attachmentList, attachment]
        }));
    },

    // Todo Actions
    addTodo: (todo) => {
        set((state) => ({
            todoList: [...state.todoList, todo]
        }));
    },

    deleteTodo: (id) => {
        set((state) => ({
            todoList: state.todoList.filter((t) => t.id !== id)
        }));
    },

    toggleTodo: (id) => {
        set((state) => ({
            todoList: state.todoList.map((t) =>
                t.id === id ? { ...t, completed: !t.completed } : t
            )
        }));
    },

    // Comment Actions
    addComment: (comment) => {
        set((state) => ({
            commentList: [...state.commentList, comment]
        }));
    },

    deleteComment: (id) => {
        set((state) => ({
            commentList: state.commentList.filter((c) => c.id !== id)
        }));
    },

    // Hierarchy CRUD Actions
    // Customer
    addCustomer: (customer) => {
        const newCustomer: Customer = {
            ...customer,
            id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
        };
        set((state) => ({
            customers: [...state.customers, newCustomer],
            customerList: [...state.customers, newCustomer],
        }));
    },

    updateCustomer: (id, updates) => {
        set((state) => {
            const customers = state.customers.map(c =>
                c.id === id ? { ...c, ...updates } : c
            );
            return {
                customers,
                customerList: customers,
                selectedCustomer: state.selectedCustomer?.id === id
                    ? { ...state.selectedCustomer, ...updates }
                    : state.selectedCustomer,
            };
        });
    },

    deleteCustomer: (id) => {
        const hasChildren = get().plants.filter(p => p.customerId === id).length > 0;
        if (hasChildren) {
            throw new Error('Cannot delete customer with existing plants');
        }
        set((state) => {
            const customers = state.customers.filter(c => c.id !== id);
            return {
                customers,
                customerList: customers,
                selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer,
            };
        });
    },

    // Plant
    addPlant: (plant) => {
        const newPlant: Plant = {
            ...plant,
            id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
        };
        set((state) => ({
            plants: [...state.plants, newPlant],
        }));
    },

    updatePlant: (id, updates) => {
        set((state) => ({
            plants: state.plants.map(p =>
                p.id === id ? { ...p, ...updates } : p
            ),
            selectedPlant: state.selectedPlant?.id === id
                ? { ...state.selectedPlant, ...updates }
                : state.selectedPlant,
        }));
    },

    deletePlant: (id) => {
        const hasChildren = get().units.filter(u => u.plantId === id).length > 0;
        if (hasChildren) {
            throw new Error('Cannot delete plant with existing units');
        }
        set((state) => ({
            plants: state.plants.filter(p => p.id !== id),
            selectedPlant: state.selectedPlant?.id === id ? null : state.selectedPlant,
        }));
    },

    // Unit
    addUnit: (unit) => {
        const newUnit: Unit = {
            ...unit,
            id: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
        };
        set((state) => ({
            units: [...state.units, newUnit],
        }));
    },

    updateUnit: (id, updates) => {
        set((state) => ({
            units: state.units.map(u =>
                u.id === id ? { ...u, ...updates } : u
            ),
            selectedUnit: state.selectedUnit?.id === id
                ? { ...state.selectedUnit, ...updates }
                : state.selectedUnit,
        }));
    },

    deleteUnit: (id) => {
        const hasChildren = get().areas.filter(a => a.unitId === id).length > 0;
        if (hasChildren) {
            throw new Error('Cannot delete unit with existing areas');
        }
        set((state) => ({
            units: state.units.filter(u => u.id !== id),
            selectedUnit: state.selectedUnit?.id === id ? null : state.selectedUnit,
        }));
    },

    // Area
    addArea: (area) => {
        const newArea: Area = {
            ...area,
            id: `area-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
        };
        set((state) => ({
            areas: [...state.areas, newArea],
        }));
    },

    updateArea: (id, updates) => {
        set((state) => ({
            areas: state.areas.map(a =>
                a.id === id ? { ...a, ...updates } : a
            ),
            selectedArea: state.selectedArea?.id === id
                ? { ...state.selectedArea, ...updates }
                : state.selectedArea,
        }));
    },

    deleteArea: (id) => {
        const state = get();
        const hasProjects = state.projects.filter(p => p.areaId === id).length > 0;
        const hasPsvs = state.protectiveSystems.filter(p => p.areaId === id).length > 0;
        const hasEquipment = state.equipment.filter(e => e.areaId === id).length > 0;

        if (hasProjects || hasPsvs || hasEquipment) {
            throw new Error('Cannot delete area with existing projects, PSVs, or equipment');
        }

        set((state) => ({
            areas: state.areas.filter(a => a.id !== id),
            selectedArea: state.selectedArea?.id === id ? null : state.selectedArea,
        }));
    },

    // Project
    addProject: (project) => {
        const newProject: Project = {
            ...project,
            id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
        };
        set((state) => ({
            projects: [...state.projects, newProject],
        }));
    },

    updateProject: (id, updates) => {
        set((state) => ({
            projects: state.projects.map(p =>
                p.id === id ? { ...p, ...updates } : p
            ),
            selectedProject: state.selectedProject?.id === id
                ? { ...state.selectedProject, ...updates }
                : state.selectedProject,
        }));
    },

    deleteProject: (id) => {
        // Remove project ID from all PSVs that reference it
        set((state) => ({
            protectiveSystems: state.protectiveSystems.map(psv => ({
                ...psv,
                projectIds: (psv.projectIds || []).filter(pid => pid !== id)
            })),
            projects: state.projects.filter(p => p.id !== id),
            selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
        }));
    },

    // PSVs / Protective Systems
    addProtectiveSystem: (psv) => {
        const newPsv: ProtectiveSystem = {
            ...psv,
            id: `psv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: psv.tags || [],
        };
        set((state) => ({
            protectiveSystems: [...state.protectiveSystems, newPsv],
        }));
    },

    updateProtectiveSystem: (id, updates) => {
        set((state) => ({
            protectiveSystems: state.protectiveSystems.map(p =>
                p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
            ),
            selectedPsv: state.selectedPsv?.id === id
                ? { ...state.selectedPsv, ...updates, updatedAt: new Date().toISOString() }
                : state.selectedPsv,
        }));
    },

    deleteProtectiveSystem: (id) => {
        const hasLinks = getEquipmentLinksByPsv(id).length > 0;
        if (hasLinks) {
            throw new Error('Cannot delete PSV that is linked to equipment');
        }
        set((state) => ({
            protectiveSystems: state.protectiveSystems.filter(p => p.id !== id),
            selectedPsv: state.selectedPsv?.id === id ? null : state.selectedPsv,
        }));
    },

    // Equipment
    addEquipment: (equipment) => {
        const newEquipment: Equipment = {
            ...equipment,
            id: `equip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        set((state) => ({
            equipment: [...state.equipment, newEquipment],
        }));
    },

    updateEquipment: (id, updates) => {
        set((state) => ({
            equipment: state.equipment.map(e =>
                e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
            ),
        }));
    },

    deleteEquipment: (id) => {
        const hasLinks = getEquipmentLinksByPsv(id).length > 0;
        if (hasLinks) {
            throw new Error('Cannot delete equipment that is linked to PSVs');
        }
        set((state) => ({
            equipment: state.equipment.filter(e => e.id !== id),
        }));
    },
}));
