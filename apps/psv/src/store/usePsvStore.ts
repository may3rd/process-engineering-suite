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
    EquipmentLink,
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
    getPlantsByCustomer,
    getUnitsByPlant,
    getAreasByUnit,
    getProjectsByArea,
    getProtectiveSystemsByProject,
    getScenariosByProtectiveSystem,
    getSizingCasesByProtectiveSystem,
    getEquipmentLinksByPsv,
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

    // Lists for current level
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

    // Actions
    selectCustomer: (id: string | null) => void;
    selectPlant: (id: string | null) => void;
    selectUnit: (id: string | null) => void;
    selectArea: (id: string | null) => void;
    selectProject: (id: string | null) => void;
    selectPsv: (id: string | null) => void;
    setActiveTab: (tab: number) => void;
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

    // Initial lists
    customerList: customers,
    plantList: [],
    unitList: [],
    areaList: [],
    projectList: [],
    psvList: [],
    scenarioList: [],
    sizingCaseList: [],
    equipmentLinkList: [],

    // UI state
    activeTab: 0,
    sidebarOpen: true,

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
        const project = id ? projects.find(p => p.id === id) || null : null;
        const psvList = id ? getProtectiveSystemsByProject(id) : [];

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
}));
