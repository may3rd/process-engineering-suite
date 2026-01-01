import { StateCreator } from 'zustand';
import { PsvStore, HierarchySelection } from '../types';
import { getDataService } from '@/lib/api';
import { toast } from '@/lib/toast';
import { handleOptionalFetch } from '../utils';
import { createAuditLog, detectChanges } from '@/lib/auditLogService';
import { useAuthStore } from '@/store/useAuthStore';
import type {
    Customer, Plant, Unit, Area, Project, ProtectiveSystem
} from '@/data/types';

const dataService = getDataService();

export interface NavigationSlice {
    selection: HierarchySelection;
    selectedCustomer: Customer | null;
    selectedPlant: Plant | null;
    selectedUnit: Unit | null;
    selectedArea: Area | null;
    selectedProject: Project | null;
    selectedPsv: ProtectiveSystem | null;

    customers: Customer[];
    plants: Plant[];
    units: Unit[];
    areas: Area[];
    projects: Project[];
    protectiveSystems: ProtectiveSystem[];

    customerList: Customer[];
    plantList: Plant[];
    unitList: Unit[];
    areaList: Area[];
    projectList: Project[];
    psvList: ProtectiveSystem[];

    arePlantsLoaded: boolean;
    areUnitsLoaded: boolean;
    areAreasLoaded: boolean;
    areProjectsLoaded: boolean;
    arePsvsLoaded: boolean;
    areEquipmentLoaded: boolean;

    initialize: () => Promise<void>;
    fetchAllPlants: () => Promise<void>;
    fetchAllUnits: () => Promise<void>;
    fetchAllAreas: () => Promise<void>;
    fetchAllProjects: () => Promise<void>;
    fetchAllProtectiveSystems: () => Promise<void>;
    fetchAllEquipment: () => Promise<void>;

    selectCustomer: (id: string | null) => Promise<void>;
    selectPlant: (id: string | null) => Promise<void>;
    selectUnit: (id: string | null) => Promise<void>;
    selectArea: (id: string | null) => Promise<void>;
    selectProject: (id: string | null) => Promise<void>;
    selectPsv: (id: string | null) => Promise<void>;
    clearSelection: () => void;
    navigateToLevel: (level: 'customer' | 'plant' | 'unit' | 'area' | 'project' | 'psv') => void;

    // Hierarchy CRUD Actions
    addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateCustomer: (id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    deleteCustomer: (id: string) => Promise<void>;
    softDeleteCustomer: (id: string) => Promise<{ deactivatedCount: number }>;

    addPlant: (plant: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updatePlant: (id: string, updates: Partial<Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    deletePlant: (id: string) => Promise<void>;
    softDeletePlant: (id: string) => Promise<{ deactivatedCount: number }>;

    addUnit: (unit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateUnit: (id: string, updates: Partial<Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    deleteUnit: (id: string) => Promise<void>;
    softDeleteUnit: (id: string) => Promise<{ deactivatedCount: number }>;

    addArea: (area: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateArea: (id: string, updates: Partial<Omit<Area, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    deleteArea: (id: string) => Promise<void>;
    softDeleteArea: (id: string) => Promise<{ deactivatedCount: number }>;
    softDeleteEquipment: (id: string) => Promise<void>;

    addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    softDeleteProject: (id: string) => Promise<void>;
}

export const createNavigationSlice: StateCreator<PsvStore, [], [], NavigationSlice> = (set, get) => ({
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

    customers: [],
    plants: [],
    units: [],
    areas: [],
    projects: [],
    protectiveSystems: [],

    customerList: [],
    plantList: [],
    unitList: [],
    areaList: [],
    projectList: [],
    psvList: [],

    arePlantsLoaded: false,
    areUnitsLoaded: false,
    areAreasLoaded: false,
    areProjectsLoaded: false,
    arePsvsLoaded: false,
    areEquipmentLoaded: false,

    initialize: async () => {
        get().setIsLoading(true);
        get().setError(null);
        try {
            const customers = await dataService.getCustomers();
            set({
                customers,
                customerList: customers,
                arePlantsLoaded: false,
                areUnitsLoaded: false,
                areAreasLoaded: false,
                areProjectsLoaded: false,
                arePsvsLoaded: false,
            });
            get().setIsLoading(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load data';
            get().setError(message);
            get().setIsLoading(false);
            toast.error('Failed to load data', { description: message });
        }
    },

    fetchAllPlants: async () => {
        if (get().arePlantsLoaded) return;
        try {
            const customers = get().customers;
            const plantsResults = await Promise.all(
                customers.map(c => dataService.getPlantsByCustomer(c.id))
            );
            const allPlants = plantsResults.flat();
            set({
                plants: allPlants,
                plantList: allPlants,
                arePlantsLoaded: true,
            });
        } catch (error) {
            console.error("Failed to fetch all plants:", error);
            toast.error("Failed to load plants");
        }
    },

    fetchAllUnits: async () => {
        if (get().areUnitsLoaded) return;
        try {
            if (!get().arePlantsLoaded) {
                await get().fetchAllPlants();
            }
            const allPlants = get().plants;
            const unitsResults = await Promise.all(
                allPlants.map(p => dataService.getUnitsByPlant(p.id))
            );
            const allUnits = unitsResults.flat();
            set({
                units: allUnits,
                unitList: allUnits,
                areUnitsLoaded: true,
            });
        } catch (error) {
            console.error("Failed to fetch all units:", error);
            toast.error("Failed to load units");
        }
    },

    fetchAllAreas: async () => {
        if (get().areAreasLoaded) return;
        try {
            if (!get().areUnitsLoaded) {
                await get().fetchAllUnits();
            }
            const allUnits = get().units;
            const areasResults = await Promise.all(
                allUnits.map(u => dataService.getAreasByUnit(u.id))
            );
            const allAreas = areasResults.flat();
            set({
                areas: allAreas,
                areaList: allAreas,
                areAreasLoaded: true,
            });
        } catch (error) {
            console.error("Failed to fetch all areas:", error);
            toast.error("Failed to load areas");
        }
    },

    fetchAllProjects: async () => {
        if (get().areProjectsLoaded) return;
        try {
            if (!get().areAreasLoaded) {
                await get().fetchAllAreas();
            }
            const allAreas = get().areas;
            const projectsResults = await Promise.all(
                allAreas.map(a => dataService.getProjectsByArea(a.id))
            );
            const allProjects = projectsResults.flat();
            set({
                projects: allProjects,
                projectList: allProjects,
                areProjectsLoaded: true,
            });
        } catch (error) {
            console.error("Failed to fetch all projects:", error);
            toast.error("Failed to load projects");
        }
    },

    fetchAllProtectiveSystems: async () => {
        if (get().arePsvsLoaded) return;
        try {
            const allPsvs = await dataService.getProtectiveSystems();
            set({
                protectiveSystems: allPsvs,
                psvList: allPsvs,
                arePsvsLoaded: true,
            });
        } catch (error) {
            console.error("Failed to fetch all PSVs:", error);
            toast.error("Failed to load PSVs");
        }
    },

    fetchAllEquipment: async () => {
        if (get().areEquipmentLoaded) return;
        try {
            const allEquipment = await dataService.getEquipment();
            set({
                equipment: allEquipment,
                areEquipmentLoaded: true,
            });
        } catch (error) {
            console.error("Failed to fetch all equipment:", error);
            toast.error("Failed to load equipment");
        }
    },

    selectCustomer: async (id) => {
        get().setIsLoading(true);
        get().setError(null);
        try {
            const customer = id ? get().customers.find(c => c.id === id) || null : null;
            let newPlants = get().plants;
            let displayedPlants: Plant[] = [];

            if (id) {
                const fetchedPlants = await dataService.getPlantsByCustomer(id);
                newPlants = [
                    ...newPlants.filter(p => p.customerId !== id),
                    ...fetchedPlants
                ];
                displayedPlants = fetchedPlants;
            } else {
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
                plants: newPlants,
                unitList: [],
                areaList: [],
                projectList: [],
                psvList: [],
                scenarioList: [],
                sizingCaseList: [],
                equipmentLinkList: [],
            });
            get().setIsLoading(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load plants';
            get().setError(message);
            get().setIsLoading(false);
            toast.error('Failed to load plants', { description: message });
        }
    },

    selectPlant: async (id) => {
        get().setIsLoading(true);
        get().setError(null);
        try {
            const plant = id ? get().plants.find(p => p.id === id) || null : null;
            let newUnits = get().units;
            let displayedUnits: Unit[] = [];

            if (id) {
                const fetchedUnits = await dataService.getUnitsByPlant(id);
                newUnits = [
                    ...newUnits.filter(u => u.plantId !== id),
                    ...fetchedUnits
                ];
                displayedUnits = fetchedUnits;
            } else {
                displayedUnits = newUnits;
            }

            set((state: PsvStore) => ({
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
                units: newUnits,
                areaList: [],
                projectList: [],
                psvList: [],
                scenarioList: [],
                sizingCaseList: [],
            }));
            get().setIsLoading(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load units';
            get().setError(message);
            get().setIsLoading(false);
            toast.error('Failed to load units', { description: message });
        }
    },

    selectUnit: async (id) => {
        get().setIsLoading(true);
        get().setError(null);
        try {
            const unit = id ? get().units.find(u => u.id === id) || null : null;
            let newAreas = get().areas;
            let displayedAreas: Area[] = [];

            if (id) {
                const fetchedAreas = await dataService.getAreasByUnit(id);
                newAreas = [
                    ...newAreas.filter(a => a.unitId !== id),
                    ...fetchedAreas
                ];
                displayedAreas = fetchedAreas;
            } else {
                displayedAreas = newAreas;
            }

            set((state: PsvStore) => ({
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
                areas: newAreas,
                projectList: [],
                psvList: [],
                scenarioList: [],
                sizingCaseList: [],
            }));
            get().setIsLoading(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load areas';
            get().setError(message);
            get().setIsLoading(false);
            toast.error('Failed to load areas', { description: message });
        }
    },

    selectArea: async (id) => {
        get().setIsLoading(true);
        get().setError(null);
        try {
            const area = id ? get().areas.find(a => a.id === id) || null : null;
            let newProjects = get().projects;
            let displayedProjects: Project[] = [];

            if (id) {
                const fetchedProjects = await dataService.getProjectsByArea(id);
                newProjects = [
                    ...newProjects.filter(p => p.areaId !== id),
                    ...fetchedProjects
                ];
                displayedProjects = fetchedProjects;
            } else {
                displayedProjects = newProjects;
            }

            set((state: PsvStore) => ({
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
                projects: newProjects,
                psvList: [],
                scenarioList: [],
                sizingCaseList: [],
            }));
            get().setIsLoading(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load projects';
            get().setError(message);
            get().setIsLoading(false);
            toast.error('Failed to load projects', { description: message });
        }
    },

    selectProject: async (id) => {
        get().setIsLoading(true);
        get().setError(null);
        try {
            const project = id ? get().projects.find(p => p.id === id) || null : null;
            let newPsvs = get().protectiveSystems;
            let displayedPsvs: ProtectiveSystem[] = [];

            if (project) {
                const fetchedPsvs = await dataService.getProtectiveSystems(project.areaId);
                newPsvs = [
                    ...newPsvs.filter(p => p.areaId !== project.areaId),
                    ...fetchedPsvs
                ];
                displayedPsvs = fetchedPsvs.filter(p => !p.projectIds || p.projectIds.includes(project.id));
            } else {
                displayedPsvs = newPsvs;
            }

            set((state: PsvStore) => ({
                selection: {
                    ...state.selection,
                    projectId: id,
                    psvId: null,
                },
                selectedProject: project,
                selectedPsv: null,
                psvList: displayedPsvs,
                protectiveSystems: newPsvs,
                scenarioList: [],
                sizingCaseList: [],
                attachmentList: [],
                todoList: [],
                noteList: [],
                commentList: [],
            }));
            get().setIsLoading(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load PSVs';
            get().setError(message);
            get().setIsLoading(false);
            toast.error('Failed to load PSVs', { description: message });
        }
    },

    selectPsv: async (id) => {
        get().setIsLoading(true);
        get().setError(null);
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

            set((state: PsvStore) => ({
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
                activeTab: 0,
            }));
            get().setIsLoading(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load PSV details';
            get().setError(message);
            get().setIsLoading(false);
            toast.error('Failed to load PSV details', { description: message });
        }
    },

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
                if (state.selection.customerId) state.selectCustomer(state.selection.customerId);
                break;
            case 'unit':
                if (state.selection.plantId) state.selectPlant(state.selection.plantId);
                break;
            case 'area':
                if (state.selection.unitId) state.selectUnit(state.selection.unitId);
                break;
            case 'project':
                if (state.selection.areaId) state.selectArea(state.selection.areaId);
                break;
            case 'psv':
                if (state.selection.projectId) state.selectProject(state.selection.projectId);
                break;
        }
    },

    // Hierarchy CRUD Actions Implementation
    addCustomer: async (customer) => {
        try {
            const created = await dataService.createCustomer(customer);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog('create', 'project', created.id, `Customer: ${created.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role });
            }
            set((state: PsvStore) => ({
                customers: [...state.customers, created],
                customerList: [...state.customerList, created],
            }));
            toast.success('Customer added');
        } catch (error) {
            toast.error('Failed to add customer');
            throw error;
        }
    },
    updateCustomer: async (id, updates) => {
        try {
            const state = get();
            const existing = state.customers.find(c => c.id === id);
            const updated = await dataService.updateCustomer(id, updates);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                const changes = detectChanges(existing, updates, ['name', 'code']);
                if (changes.length > 0) {
                    createAuditLog('update', 'project', id, `Customer: ${updated.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role, changes });
                }
            }
            set((state: PsvStore) => ({
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
            const state = get();
            const existing = state.customers.find(c => c.id === id);
            await dataService.deleteCustomer(id);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                createAuditLog('delete', 'project', id, `Customer: ${existing.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role });
            }
            set((state: PsvStore) => ({
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
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog('create', 'project', created.id, `Plant: ${created.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role });
            }
            set((state: PsvStore) => ({
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
            const state = get();
            const existing = state.plants.find(p => p.id === id);
            const updated = await dataService.updatePlant(id, updates);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                const changes = detectChanges(existing, updates, ['name', 'code']);
                if (changes.length > 0) {
                    createAuditLog('update', 'project', id, `Plant: ${updated.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role, changes });
                }
            }
            set((state: PsvStore) => ({
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
            const state = get();
            const existing = state.plants.find(p => p.id === id);
            await dataService.deletePlant(id);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                createAuditLog('delete', 'project', id, `Plant: ${existing.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role });
            }
            set((state: PsvStore) => ({
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
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog('create', 'project', created.id, `Unit: ${created.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role });
            }
            set((state: PsvStore) => ({
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
            const state = get();
            const existing = state.units.find(u => u.id === id);
            const updated = await dataService.updateUnit(id, updates);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                const changes = detectChanges(existing, updates, ['name', 'code']);
                if (changes.length > 0) {
                    createAuditLog('update', 'project', id, `Unit: ${updated.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role, changes });
                }
            }
            set((state: PsvStore) => ({
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
            const state = get();
            const existing = state.units.find(u => u.id === id);
            await dataService.deleteUnit(id);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                createAuditLog('delete', 'project', id, `Unit: ${existing.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role });
            }
            set((state: PsvStore) => ({
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
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog('create', 'project', created.id, `Area: ${created.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role });
            }
            set((state: PsvStore) => ({
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
            const state = get();
            const existing = state.areas.find(a => a.id === id);
            const updated = await dataService.updateArea(id, updates);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                const changes = detectChanges(existing, updates, ['name', 'code']);
                if (changes.length > 0) {
                    createAuditLog('update', 'project', id, `Area: ${updated.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role, changes });
                }
            }
            set((state: PsvStore) => ({
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
            const state = get();
            const existing = state.areas.find(a => a.id === id);
            await dataService.deleteArea(id);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                createAuditLog('delete', 'project', id, `Area: ${existing.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role });
            }
            set((state: PsvStore) => ({
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
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser) {
                createAuditLog('create', 'project', created.id, `Project: ${created.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role });
            }
            set((state: PsvStore) => ({
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
            const state = get();
            const existing = state.projects.find(p => p.id === id);
            const updated = await dataService.updateProject(id, updates);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                const changes = detectChanges(existing, updates, ['name', 'code']);
                if (changes.length > 0) {
                    createAuditLog('update', 'project', id, `Project: ${updated.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role, changes });
                }
            }
            set((state: PsvStore) => ({
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
            const state = get();
            const existing = state.projects.find(p => p.id === id);
            await dataService.deleteProject(id);
            const currentUser = useAuthStore.getState().currentUser;
            if (currentUser && existing) {
                createAuditLog('delete', 'project', id, `Project: ${existing.name}`, currentUser.id, currentUser.name, { userRole: currentUser.role });
            }
            set((state: PsvStore) => ({
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

    // Soft Delete with Cascade (Recursive)
    softDeleteCustomer: async (id) => {
        try {
            const state = get();
            const customer = state.customers.find(c => c.id === id);
            if (!customer) throw new Error('Customer not found');

            // Recursively deactivate all child Plants (which cascades to Units, Areas, Equipment, Projects, PSVs)
            const affectedPlants = state.plants.filter(p => p.customerId === id);
            let deactivatedCount = 0;

            for (const plant of affectedPlants) {
                const result = await get().softDeletePlant(plant.id);
                deactivatedCount += result?.deactivatedCount ?? 0;
            }

            // Finally deactivate the customer
            if (customer.status === 'active') {
                await get().updateCustomer(id, { status: 'inactive' });
                deactivatedCount++;
            }

            toast.success(`Deactivated customer and ${deactivatedCount - 1} related items`);
            return { deactivatedCount };
        } catch (error) {
            toast.error('Failed to deactivate customer');
            throw error;
        }
    },

    softDeletePlant: async (id) => {
        try {
            const state = get();
            const plant = state.plants.find(p => p.id === id);
            if (!plant) throw new Error('Plant not found');

            // Recursively deactivate all child Units (which cascades to Areas, Equipment, Projects, PSVs)
            const affectedUnits = state.units.filter(u => u.plantId === id);
            let deactivatedCount = 0;

            for (const unit of affectedUnits) {
                const result = await get().softDeleteUnit(unit.id);
                deactivatedCount += result?.deactivatedCount ?? 0;
            }

            // Deactivate the plant itself
            if (plant.status === 'active') {
                await get().updatePlant(id, { status: 'inactive' });
                deactivatedCount++;
            }

            return { deactivatedCount };
        } catch (error) {
            toast.error('Failed to deactivate plant');
            throw error;
        }
    },

    softDeleteUnit: async (id) => {
        try {
            const state = get();
            const unit = state.units.find(u => u.id === id);
            if (!unit) throw new Error('Unit not found');

            // Recursively deactivate all child Areas (which cascades to Equipment, Projects, PSVs)
            const affectedAreas = state.areas.filter(a => a.unitId === id);
            let deactivatedCount = 0;

            for (const area of affectedAreas) {
                const result = await get().softDeleteArea(area.id);
                deactivatedCount += result?.deactivatedCount ?? 0;
            }

            // Deactivate the unit itself
            if (unit.status === 'active') {
                await get().updateUnit(id, { status: 'inactive' });
                deactivatedCount++;
            }

            return { deactivatedCount };
        } catch (error) {
            toast.error('Failed to deactivate unit');
            throw error;
        }
    },

    softDeleteArea: async (id) => {
        try {
            const state = get();
            const area = state.areas.find(a => a.id === id);
            if (!area) throw new Error('Area not found');

            const affectedEquipment = state.equipment.filter(e => e.areaId === id);
            const affectedProjects = state.projects.filter(p => p.areaId === id);
            const affectedPsvs = state.protectiveSystems.filter(p => p.areaId === id);

            let deactivatedCount = 0;

            for (const equip of affectedEquipment) {
                if (equip.status === 'active') {
                    await get().updateEquipment(equip.id, { status: 'inactive' });
                    deactivatedCount++;
                }
            }

            for (const project of affectedProjects) {
                if (project.isActive) {
                    await get().updateProject(project.id, { isActive: false });
                    deactivatedCount++;
                }
            }

            for (const psv of affectedPsvs) {
                if (psv.isActive) {
                    await get().updateProtectiveSystem(psv.id, { isActive: false });
                    deactivatedCount++;
                }
            }

            if (area.status === 'active') {
                await get().updateArea(id, { status: 'inactive' });
                deactivatedCount++;
            }

            toast.success(`Deactivated area and ${deactivatedCount - 1} related items`);
            return { deactivatedCount };
        } catch (error) {
            toast.error('Failed to deactivate area');
            throw error;
        }
    },

    softDeleteProject: async (id) => {
        try {
            const state = get();
            const project = state.projects.find(p => p.id === id);
            if (!project) throw new Error('Project not found');

            // Find PSVs tagged with this project
            const affectedPsvs = state.protectiveSystems.filter(p => p.projectIds?.includes(id));

            if (project.isActive) {
                await get().updateProject(id, { isActive: false });

                // Note: We DON'T necessarily deactivate PSVs just because a project is deactivated, 
                // as a PSV might be part of multiple projects. 
                // But we should probably provide feedback or handle it if the user expects cascade.
                // For now, only deactivate the project itself.

                toast.success('Project deactivated');
            } else {
                toast.info('Project already inactive');
            }
        } catch (error) {
            toast.error('Failed to deactivate project');
            throw error;
        }
    },

    softDeleteEquipment: async (id) => {
        try {
            const state = get();
            const equipment = state.equipment.find(e => e.id === id);
            if (!equipment) throw new Error('Equipment not found');

            if (equipment.status === 'active') {
                await get().updateEquipment(id, { status: 'inactive' });
                toast.success('Equipment deactivated');
            } else {
                toast.info('Equipment already inactive');
            }
        } catch (error) {
            toast.error('Failed to deactivate equipment');
            throw error;
        }
    },
});
