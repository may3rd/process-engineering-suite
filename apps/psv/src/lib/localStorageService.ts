// localStorage service for PSV application demo mode.
// This module provides a typed interface using localStorage for offline/demo use.
// Mirrors the API client interface exactly.

import { v4 as uuidv4 } from 'uuid';
import {
    Customer,
    Plant,
    Unit,
    Area,
    Project,
    ProtectiveSystem,
    OverpressureScenario as Scenario,
    SizingCase,
    Equipment,
    EquipmentLink,
    Attachment,
    Comment,
    TodoItem,
    User,
    MockCredential,
    ProjectNote,
} from '@/data/types';
import {
    users as mockUsers,
    customers as mockCustomers,
    plants as mockPlants,
    units as mockUnits,
    areas as mockAreas,
    projects as mockProjects,
    protectiveSystems as mockPsvs,
    scenarios as mockScenarios,
    sizingCases as mockSizingCases,
    equipment as mockEquipment,
    equipmentLinks as mockEquipmentLinks,
    attachments as mockAttachments,
    comments as mockComments,
    todos as mockTodos,
    credentials as mockCredentials,
    notes as mockNotes,
} from '@/data/mockData';

// localStorage keys
const STORAGE_KEYS = {
    CUSTOMERS: 'psv_demo_customers',
    PLANTS: 'psv_demo_plants',
    UNITS: 'psv_demo_units',
    AREAS: 'psv_demo_areas',
    PROJECTS: 'psv_demo_projects',
    PSVS: 'psv_demo_psvs',
    SCENARIOS: 'psv_demo_scenarios',
    SIZING_CASES: 'psv_demo_sizing_cases',
    EQUIPMENT: 'psv_demo_equipment',
    EQUIPMENT_LINKS: 'psv_demo_equipment_links',
    ATTACHMENTS: 'psv_demo_attachments',
    NOTES: 'psv_demo_notes',
    COMMENTS: 'psv_demo_comments',
    TODOS: 'psv_demo_todos',
    USERS: 'psv_demo_users',
    CREDENTIALS: 'psv_demo_credentials',
    CURRENT_USER: 'psv_demo_current_user',
    INITIALIZED: 'psv_demo_initialized',
};

export interface LoginResponse {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    user: User;
}

// --- Helper Functions ---

function getItem<T>(key: string, defaultValue: T[]): T[] {
    if (typeof window === 'undefined') return defaultValue;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
}

function setItem<T>(key: string, value: T[]): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

function now(): string {
    return new Date().toISOString();
}

// Initialize with mock data if not already initialized
function initializeIfNeeded(): void {
    if (typeof window === 'undefined') return;

    const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!initialized) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(mockCustomers));
        localStorage.setItem(STORAGE_KEYS.PLANTS, JSON.stringify(mockPlants));
        localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(mockUnits));
        localStorage.setItem(STORAGE_KEYS.AREAS, JSON.stringify(mockAreas));
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(mockProjects));
        localStorage.setItem(STORAGE_KEYS.PSVS, JSON.stringify(mockPsvs));
        localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(mockScenarios));
        localStorage.setItem(STORAGE_KEYS.SIZING_CASES, JSON.stringify(mockSizingCases));
        localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(mockEquipment));
        localStorage.setItem(STORAGE_KEYS.EQUIPMENT_LINKS, JSON.stringify(mockEquipmentLinks));
        localStorage.setItem(STORAGE_KEYS.ATTACHMENTS, JSON.stringify(mockAttachments));
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(mockNotes));
        localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(mockComments));
        localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(mockTodos));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mockUsers));
        localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(mockCredentials));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
}

// --- LocalStorage Service Class ---

class LocalStorageService {
    constructor() {
        initializeIfNeeded();
    }

    // --- Auth ---

    async login(username: string, password: string): Promise<LoginResponse> {
        const storedCreds = getItem<MockCredential>(STORAGE_KEYS.CREDENTIALS, mockCredentials);
        const credential = storedCreds.find((c) => c.username === username && c.password === password);

        if (!credential) {
            throw new Error('Invalid username or password');
        }

        const users = getItem<User>(STORAGE_KEYS.USERS, mockUsers);
        const user = users.find(u => u.id === credential.userId);

        if (!user || user.status !== 'active') {
            throw new Error('User not found or inactive');
        }

        // Store current user
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

        return {
            accessToken: `demo_token_${uuidv4()}`,
            tokenType: 'Bearer',
            expiresIn: 86400,
            user,
        };
    }

    async logout(): Promise<void> {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }

    async getCurrentUser(): Promise<User> {
        const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (!stored) {
            throw new Error('Not authenticated');
        }
        return JSON.parse(stored);
    }

    async updateMe(data: { name?: string; email?: string }): Promise<User> {
        const user = await this.getCurrentUser();
        const users = getItem<User>(STORAGE_KEYS.USERS, mockUsers);
        const updatedUser: User = {
            ...user,
            ...(data.name ? { name: data.name } : {}),
            ...(data.email ? { email: data.email.toLowerCase() } : {}),
        };
        setItem(STORAGE_KEYS.USERS, users.map((u) => (u.id === user.id ? updatedUser : u)));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
        return updatedUser;
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
        const user = await this.getCurrentUser();

        if (!newPassword || newPassword.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        const creds = getItem<MockCredential>(STORAGE_KEYS.CREDENTIALS, mockCredentials);
        const index = creds.findIndex((c) => c.userId === user.id);

        if (index === -1) throw new Error('Credential not found');
        if (creds[index].password !== currentPassword) {
            throw new Error('Current password is incorrect');
        }

        const next = [...creds];
        next[index] = { ...next[index], password: newPassword };
        setItem(STORAGE_KEYS.CREDENTIALS, next);

        return { success: true };
    }

    // --- Admin: Users (demo mode) ---

    async getUsers(): Promise<User[]> {
        return getItem<User>(STORAGE_KEYS.USERS, mockUsers);
    }

    async createUser(data: { name: string; email: string; role: User['role']; status?: User['status']; username: string; temporaryPassword: string }): Promise<User> {
        const users = getItem<User>(STORAGE_KEYS.USERS, mockUsers);
        const creds = getItem<MockCredential>(STORAGE_KEYS.CREDENTIALS, mockCredentials);

        if (creds.some((c) => c.username === data.username)) {
            throw new Error('Username already exists');
        }
        const newUser: User = {
            id: uuidv4(),
            name: data.name,
            email: data.email.toLowerCase(),
            role: data.role,
            status: data.status || 'active',
        };
        users.push(newUser);
        setItem(STORAGE_KEYS.USERS, users);

        const newCredential = { userId: newUser.id, username: data.username, password: data.temporaryPassword };
        creds.push(newCredential);
        setItem(STORAGE_KEYS.CREDENTIALS, creds);

        return newUser;
    }

    async updateUser(id: string, data: Partial<Pick<User, 'name' | 'email' | 'role' | 'status'>>): Promise<User> {
        const users = getItem<User>(STORAGE_KEYS.USERS, mockUsers);
        const index = users.findIndex((u) => u.id === id);
        if (index === -1) throw new Error('User not found');
        const updated: User = { ...users[index], ...data, ...(data.email ? { email: data.email.toLowerCase() } : {}) };
        users[index] = updated;
        setItem(STORAGE_KEYS.USERS, users);
        return updated;
    }

    async deleteUser(id: string): Promise<{ success: boolean }> {
        const users = getItem<User>(STORAGE_KEYS.USERS, mockUsers);
        const creds = getItem<MockCredential>(STORAGE_KEYS.CREDENTIALS, mockCredentials);
        setItem(STORAGE_KEYS.USERS, users.filter((u) => u.id !== id));
        setItem(STORAGE_KEYS.CREDENTIALS, creds.filter((c) => c.userId !== id));
        return { success: true };
    }
    // --- Hierarchy: Customers ---

    async getCustomers(): Promise<Customer[]> {
        return getItem<Customer>(STORAGE_KEYS.CUSTOMERS, mockCustomers);
    }

    async createCustomer(data: Partial<Customer>): Promise<Customer> {
        const customers = await this.getCustomers();
        const newCustomer: Customer = {
            id: uuidv4(),
            name: data.name || '',
            code: data.code || '',
            status: data.status || 'active',
            ownerId: data.ownerId || '',
            createdAt: now(),
        };
        customers.push(newCustomer);
        setItem(STORAGE_KEYS.CUSTOMERS, customers);
        return newCustomer;
    }

    async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
        const customers = await this.getCustomers();
        const index = customers.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Customer not found');

        customers[index] = { ...customers[index], ...data };
        setItem(STORAGE_KEYS.CUSTOMERS, customers);
        return customers[index];
    }

    async deleteCustomer(id: string): Promise<void> {
        const customers = await this.getCustomers();
        setItem(STORAGE_KEYS.CUSTOMERS, customers.filter(c => c.id !== id));
    }

    // --- Hierarchy: Plants ---

    async getPlantsByCustomer(customerId: string): Promise<Plant[]> {
        const plants = getItem<Plant>(STORAGE_KEYS.PLANTS, mockPlants);
        return plants.filter(p => p.customerId === customerId);
    }

    async createPlant(data: Partial<Plant>): Promise<Plant> {
        const plants = getItem<Plant>(STORAGE_KEYS.PLANTS, mockPlants);
        const newPlant: Plant = {
            id: uuidv4(),
            customerId: data.customerId || '',
            name: data.name || '',
            code: data.code || '',
            location: data.location || '',
            status: data.status || 'active',
            ownerId: data.ownerId || '',
            createdAt: now(),
        };
        plants.push(newPlant);
        setItem(STORAGE_KEYS.PLANTS, plants);
        return newPlant;
    }

    async updatePlant(id: string, data: Partial<Plant>): Promise<Plant> {
        const plants = getItem<Plant>(STORAGE_KEYS.PLANTS, mockPlants);
        const index = plants.findIndex(p => p.id === id);
        if (index === -1) throw new Error('Plant not found');

        plants[index] = { ...plants[index], ...data };
        setItem(STORAGE_KEYS.PLANTS, plants);
        return plants[index];
    }

    async deletePlant(id: string): Promise<void> {
        const plants = getItem<Plant>(STORAGE_KEYS.PLANTS, mockPlants);
        setItem(STORAGE_KEYS.PLANTS, plants.filter(p => p.id !== id));
    }

    // --- Hierarchy: Units ---

    async getUnitsByPlant(plantId: string): Promise<Unit[]> {
        const units = getItem<Unit>(STORAGE_KEYS.UNITS, mockUnits);
        return units.filter(u => u.plantId === plantId);
    }

    async createUnit(data: Partial<Unit>): Promise<Unit> {
        const units = getItem<Unit>(STORAGE_KEYS.UNITS, mockUnits);
        const newUnit: Unit = {
            id: uuidv4(),
            plantId: data.plantId || '',
            name: data.name || '',
            code: data.code || '',
            service: data.service || '',
            status: data.status || 'active',
            ownerId: data.ownerId || '',
            createdAt: now(),
        };
        units.push(newUnit);
        setItem(STORAGE_KEYS.UNITS, units);
        return newUnit;
    }

    async updateUnit(id: string, data: Partial<Unit>): Promise<Unit> {
        const units = getItem<Unit>(STORAGE_KEYS.UNITS, mockUnits);
        const index = units.findIndex(u => u.id === id);
        if (index === -1) throw new Error('Unit not found');

        units[index] = { ...units[index], ...data };
        setItem(STORAGE_KEYS.UNITS, units);
        return units[index];
    }

    async deleteUnit(id: string): Promise<void> {
        const units = getItem<Unit>(STORAGE_KEYS.UNITS, mockUnits);
        setItem(STORAGE_KEYS.UNITS, units.filter(u => u.id !== id));
    }

    // --- Hierarchy: Areas ---

    async getAreasByUnit(unitId: string): Promise<Area[]> {
        const areas = getItem<Area>(STORAGE_KEYS.AREAS, mockAreas);
        return areas.filter(a => a.unitId === unitId);
    }

    async createArea(data: Partial<Area>): Promise<Area> {
        const areas = getItem<Area>(STORAGE_KEYS.AREAS, mockAreas);
        const newArea: Area = {
            id: uuidv4(),
            unitId: data.unitId || '',
            name: data.name || '',
            code: data.code || '',
            status: data.status || 'active',
            createdAt: now(),
        };
        areas.push(newArea);
        setItem(STORAGE_KEYS.AREAS, areas);
        return newArea;
    }

    async updateArea(id: string, data: Partial<Area>): Promise<Area> {
        const areas = getItem<Area>(STORAGE_KEYS.AREAS, mockAreas);
        const index = areas.findIndex(a => a.id === id);
        if (index === -1) throw new Error('Area not found');

        areas[index] = { ...areas[index], ...data };
        setItem(STORAGE_KEYS.AREAS, areas);
        return areas[index];
    }

    async deleteArea(id: string): Promise<void> {
        const areas = getItem<Area>(STORAGE_KEYS.AREAS, mockAreas);
        setItem(STORAGE_KEYS.AREAS, areas.filter(a => a.id !== id));
    }

    // --- Hierarchy: Projects ---

    async getProjectsByArea(areaId: string): Promise<Project[]> {
        const projects = getItem<Project>(STORAGE_KEYS.PROJECTS, mockProjects);
        return projects.filter(p => p.areaId === areaId);
    }

    async createProject(data: Partial<Project>): Promise<Project> {
        const projects = getItem<Project>(STORAGE_KEYS.PROJECTS, mockProjects);
        const newProject: Project = {
            id: uuidv4(),
            areaId: data.areaId || '',
            name: data.name || '',
            code: data.code || '',
            phase: data.phase || 'design',
            status: data.status || 'draft',
            leadId: data.leadId || '',
            startDate: data.startDate || now().split('T')[0],
            endDate: data.endDate,
            createdAt: now(),
        };
        projects.push(newProject);
        setItem(STORAGE_KEYS.PROJECTS, projects);
        return newProject;
    }

    async updateProject(id: string, data: Partial<Project>): Promise<Project> {
        const projects = getItem<Project>(STORAGE_KEYS.PROJECTS, mockProjects);
        const index = projects.findIndex(p => p.id === id);
        if (index === -1) throw new Error('Project not found');

        projects[index] = { ...projects[index], ...data };
        setItem(STORAGE_KEYS.PROJECTS, projects);
        return projects[index];
    }

    async deleteProject(id: string): Promise<void> {
        const projects = getItem<Project>(STORAGE_KEYS.PROJECTS, mockProjects);
        setItem(STORAGE_KEYS.PROJECTS, projects.filter(p => p.id !== id));
    }

    // --- PSV ---

    async getProtectiveSystems(areaId?: string): Promise<ProtectiveSystem[]> {
        const psvs = getItem<ProtectiveSystem>(STORAGE_KEYS.PSVS, mockPsvs);
        return areaId ? psvs.filter(p => p.areaId === areaId) : psvs;
    }

    async getProtectiveSystem(id: string): Promise<ProtectiveSystem> {
        const psvs = await this.getProtectiveSystems();
        const psv = psvs.find(p => p.id === id);
        if (!psv) throw new Error('PSV not found');
        return psv;
    }

    async createProtectiveSystem(data: Partial<ProtectiveSystem>): Promise<ProtectiveSystem> {
        const psvs = await this.getProtectiveSystems();
        const newPsv: ProtectiveSystem = {
            id: uuidv4(),
            areaId: data.areaId || '',
            projectIds: data.projectIds || [],
            name: data.name || '',
            tag: data.tag || '',
            type: data.type || 'psv',
            designCode: data.designCode || 'API-520',
            serviceFluid: data.serviceFluid || '',
            fluidPhase: data.fluidPhase || 'gas',
            setPressure: data.setPressure || 0,
            mawp: data.mawp || 0,
            ownerId: data.ownerId || '',
            status: data.status || 'draft',
            revisionNo: data.revisionNo ?? 1,
            valveType: data.valveType,
            tags: data.tags || [],
            inletNetwork: data.inletNetwork,
            outletNetwork: data.outletNetwork,
            createdAt: now(),
            updatedAt: now(),
        };
        psvs.push(newPsv);
        setItem(STORAGE_KEYS.PSVS, psvs);
        return newPsv;
    }

    async updateProtectiveSystem(id: string, data: Partial<ProtectiveSystem>): Promise<ProtectiveSystem> {
        const psvs = await this.getProtectiveSystems();
        const index = psvs.findIndex(p => p.id === id);
        if (index === -1) throw new Error('PSV not found');

        psvs[index] = { ...psvs[index], ...data, updatedAt: now() };
        setItem(STORAGE_KEYS.PSVS, psvs);
        return psvs[index];
    }

    async deleteProtectiveSystem(id: string): Promise<void> {
        const psvs = await this.getProtectiveSystems();
        setItem(STORAGE_KEYS.PSVS, psvs.filter(p => p.id !== id));
    }

    // --- Scenarios ---

    async getScenarios(psvId: string): Promise<Scenario[]> {
        const scenarios = getItem<Scenario>(STORAGE_KEYS.SCENARIOS, mockScenarios);
        return scenarios.filter(s => s.protectiveSystemId === psvId);
    }

    async createScenario(psvId: string, data: Partial<Scenario>): Promise<Scenario> {
        const scenarios = getItem<Scenario>(STORAGE_KEYS.SCENARIOS, mockScenarios);
        const newScenario: Scenario = {
            id: uuidv4(),
            protectiveSystemId: psvId,
            revisionNo: data.revisionNo ?? 1,
            cause: data.cause || 'blocked_outlet',
            description: data.description || '',
            relievingTemp: data.relievingTemp || 0,
            relievingPressure: data.relievingPressure || 0,
            phase: data.phase || 'gas',
            relievingRate: data.relievingRate || 0,
            accumulationPct: data.accumulationPct || 10,
            requiredCapacity: data.requiredCapacity || 0,
            assumptions: data.assumptions || [],
            codeRefs: data.codeRefs || [],
            isGoverning: data.isGoverning || false,
            caseConsideration: data.caseConsideration,
            createdAt: now(),
            updatedAt: now(),
        };
        scenarios.push(newScenario);
        setItem(STORAGE_KEYS.SCENARIOS, scenarios);
        return newScenario;
    }

    async updateScenario(id: string, data: Partial<Scenario>): Promise<Scenario> {
        console.log('[localStorage] updateScenario called with id:', id);
        console.log('[localStorage] updateScenario data keys:', Object.keys(data));
        console.log('[localStorage] caseConsideration value:', data.caseConsideration?.substring(0, 50));

        const scenarios = getItem<Scenario>(STORAGE_KEYS.SCENARIOS, mockScenarios);
        const index = scenarios.findIndex(s => s.id === id);
        if (index === -1) throw new Error('Scenario not found');

        scenarios[index] = { ...scenarios[index], ...data, updatedAt: now() };
        console.log('[localStorage] Updated scenario caseConsideration:', scenarios[index].caseConsideration?.substring(0, 50));
        setItem(STORAGE_KEYS.SCENARIOS, scenarios);
        return scenarios[index];
    }

    async deleteScenario(id: string): Promise<void> {
        const scenarios = getItem<Scenario>(STORAGE_KEYS.SCENARIOS, mockScenarios);
        setItem(STORAGE_KEYS.SCENARIOS, scenarios.filter(s => s.id !== id));
    }

    // --- Sizing Cases ---

    async getSizingCases(psvId: string): Promise<SizingCase[]> {
        const cases = getItem<SizingCase>(STORAGE_KEYS.SIZING_CASES, mockSizingCases);
        return cases.filter(c => c.protectiveSystemId === psvId);
    }

    async createSizingCase(psvId: string, data: Partial<SizingCase>): Promise<SizingCase> {
        const cases = getItem<SizingCase>(STORAGE_KEYS.SIZING_CASES, mockSizingCases);
        const defaultInputs = {
            massFlowRate: 0,
            molecularWeight: 28,
            compressibilityZ: 1.0,
            specificHeatRatio: 1.4,
            temperature: 25,
            pressure: 1.0,
            backpressure: 0,
            backpressureType: 'superimposed' as const,
        };
        const defaultOutputs = {
            requiredArea: 0,
            requiredAreaIn2: 0,
            selectedOrifice: '',
            orificeArea: 0,
            percentUsed: 0,
            ratedCapacity: 0,
            dischargeCoefficient: 0.975,
            backpressureCorrectionFactor: 1.0,
            isCriticalFlow: false,
            numberOfValves: 1,
            messages: [],
        };
        const defaultUnitPreferences = {
            pressure: 'barg',
            temperature: 'C',
            flow: 'kg/h',
            length: 'm',
            area: 'mm²',
            density: 'kg/m³',
            viscosity: 'cP',
        };
        const newCase: SizingCase = {
            id: uuidv4(),
            protectiveSystemId: psvId,
            scenarioId: data.scenarioId || '',
            standard: data.standard || 'API-520',
            method: data.method || 'gas',
            inputs: data.inputs || defaultInputs,
            outputs: data.outputs || defaultOutputs,
            unitPreferences: data.unitPreferences || defaultUnitPreferences,
            revisionNo: data.revisionNo ?? 1,
            status: data.status || 'draft',
            createdBy: data.createdBy || '',
            approvedBy: data.approvedBy,
            createdAt: now(),
            updatedAt: now(),
        };
        cases.push(newCase);
        setItem(STORAGE_KEYS.SIZING_CASES, cases);
        return newCase;
    }

    async updateSizingCase(id: string, data: Partial<SizingCase>): Promise<SizingCase> {
        const cases = getItem<SizingCase>(STORAGE_KEYS.SIZING_CASES, mockSizingCases);
        const index = cases.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Sizing case not found');

        cases[index] = { ...cases[index], ...data, updatedAt: now() };
        setItem(STORAGE_KEYS.SIZING_CASES, cases);
        return cases[index];
    }

    async deleteSizingCase(id: string): Promise<void> {
        const cases = getItem<SizingCase>(STORAGE_KEYS.SIZING_CASES, mockSizingCases);
        setItem(STORAGE_KEYS.SIZING_CASES, cases.filter(c => c.id !== id));
    }

    // --- Equipment ---

    async getEquipment(areaId?: string): Promise<Equipment[]> {
        const equipment = getItem<Equipment>(STORAGE_KEYS.EQUIPMENT, mockEquipment);
        return areaId ? equipment.filter(e => e.areaId === areaId) : equipment;
    }

    async getEquipmentLinks(psvId: string): Promise<EquipmentLink[]> {
        const links = getItem<EquipmentLink>(STORAGE_KEYS.EQUIPMENT_LINKS, mockEquipmentLinks);
        return links.filter(link => link.psvId === psvId);
    }

    async createEquipmentLink(data: {
        protectiveSystemId: string;
        equipmentId: string;
        isPrimary?: boolean;
        scenarioId?: string;
        relationship?: string;
        notes?: string;
    }): Promise<EquipmentLink> {
        const links = getItem<EquipmentLink>(STORAGE_KEYS.EQUIPMENT_LINKS, mockEquipmentLinks);
        const newLink: EquipmentLink = {
            id: uuidv4(),
            psvId: data.protectiveSystemId,
            equipmentId: data.equipmentId,
            isPrimary: data.isPrimary ?? false,
            scenarioId: data.scenarioId,
            relationship: data.relationship,
            notes: data.notes,
            createdAt: now(),
        };
        links.push(newLink);
        setItem(STORAGE_KEYS.EQUIPMENT_LINKS, links);
        return newLink;
    }

    async deleteEquipmentLink(id: string): Promise<void> {
        const links = getItem<EquipmentLink>(STORAGE_KEYS.EQUIPMENT_LINKS, mockEquipmentLinks);
        setItem(STORAGE_KEYS.EQUIPMENT_LINKS, links.filter(link => link.id !== id));
    }

    async createEquipment(data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment> {
        const equipment = getItem<Equipment>(STORAGE_KEYS.EQUIPMENT, mockEquipment);
        const newEquipment: Equipment = {
            id: uuidv4(),
            ...data,
            createdAt: now(),
            updatedAt: now(),
        };
        equipment.push(newEquipment);
        setItem(STORAGE_KEYS.EQUIPMENT, equipment);
        return newEquipment;
    }

    async updateEquipment(id: string, data: Partial<Equipment>): Promise<Equipment> {
        const equipment = getItem<Equipment>(STORAGE_KEYS.EQUIPMENT, mockEquipment);
        const index = equipment.findIndex(e => e.id === id);
        if (index === -1) throw new Error('Equipment not found');

        equipment[index] = { ...equipment[index], ...data, updatedAt: now() };
        setItem(STORAGE_KEYS.EQUIPMENT, equipment);
        return equipment[index];
    }

    async deleteEquipment(id: string): Promise<void> {
        const equipment = getItem<Equipment>(STORAGE_KEYS.EQUIPMENT, mockEquipment);
        setItem(STORAGE_KEYS.EQUIPMENT, equipment.filter(e => e.id !== id));
    }

    // --- Notes ---

    async getNotes(psvId: string): Promise<ProjectNote[]> {
        const notes = getItem<ProjectNote>(STORAGE_KEYS.NOTES, mockNotes);
        return notes.filter(n => n.protectiveSystemId === psvId);
    }

    async createNote(data: Partial<ProjectNote>): Promise<ProjectNote> {
        const notes = getItem<ProjectNote>(STORAGE_KEYS.NOTES, mockNotes);
        const newNote: ProjectNote = {
            id: uuidv4(),
            protectiveSystemId: data.protectiveSystemId || '',
            body: data.body || '',
            createdBy: data.createdBy || '',
            createdAt: now(),
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
        };
        notes.push(newNote);
        setItem(STORAGE_KEYS.NOTES, notes);
        return newNote;
    }

    async updateNote(id: string, data: Partial<ProjectNote>): Promise<ProjectNote> {
        const notes = getItem<ProjectNote>(STORAGE_KEYS.NOTES, mockNotes);
        const index = notes.findIndex(n => n.id === id);
        if (index === -1) throw new Error('Note not found');
        const updated: ProjectNote = {
            ...notes[index],
            ...data,
            updatedAt: data.updatedAt || now(),
            updatedBy: data.updatedBy ?? notes[index].updatedBy,
        };
        notes[index] = updated;
        setItem(STORAGE_KEYS.NOTES, notes);
        return updated;
    }

    async deleteNote(id: string): Promise<void> {
        const notes = getItem<ProjectNote>(STORAGE_KEYS.NOTES, mockNotes);
        setItem(STORAGE_KEYS.NOTES, notes.filter(n => n.id !== id));
    }

    // --- Comments ---

    async getComments(psvId: string): Promise<Comment[]> {
        const comments = getItem<Comment>(STORAGE_KEYS.COMMENTS, mockComments);
        return comments.filter(c => c.protectiveSystemId === psvId);
    }

    async createComment(data: Partial<Comment>): Promise<Comment> {
        const comments = getItem<Comment>(STORAGE_KEYS.COMMENTS, mockComments);
        const newComment: Comment = {
            id: uuidv4(),
            protectiveSystemId: data.protectiveSystemId || '',
            body: data.body || '',
            createdBy: data.createdBy || '',
            createdAt: now(),
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
        };
        comments.push(newComment);
        setItem(STORAGE_KEYS.COMMENTS, comments);
        return newComment;
    }

    async updateComment(id: string, data: Partial<Comment>): Promise<Comment> {
        const comments = getItem<Comment>(STORAGE_KEYS.COMMENTS, mockComments);
        const index = comments.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Comment not found');
        const updated: Comment = {
            ...comments[index],
            ...data,
            updatedAt: data.updatedAt || now(),
            updatedBy: data.updatedBy ?? comments[index].updatedBy,
        };
        comments[index] = updated;
        setItem(STORAGE_KEYS.COMMENTS, comments);
        return updated;
    }

    async deleteComment(id: string): Promise<void> {
        const comments = getItem<Comment>(STORAGE_KEYS.COMMENTS, mockComments);
        setItem(STORAGE_KEYS.COMMENTS, comments.filter(c => c.id !== id));
    }

    // --- Todos ---

    async getTodos(psvId: string): Promise<TodoItem[]> {
        const todos = getItem<TodoItem>(STORAGE_KEYS.TODOS, mockTodos);
        return todos.filter(t => t.protectiveSystemId === psvId);
    }

    async createTodo(data: Partial<TodoItem>): Promise<TodoItem> {
        const todos = getItem<TodoItem>(STORAGE_KEYS.TODOS, mockTodos);
        const newTodo: TodoItem = {
            id: uuidv4(),
            protectiveSystemId: data.protectiveSystemId || '',
            text: data.text || '',
            completed: data.completed || false,
            assignedTo: data.assignedTo,
            dueDate: data.dueDate,
            createdBy: data.createdBy || '',
            createdAt: now(),
        };
        todos.push(newTodo);
        setItem(STORAGE_KEYS.TODOS, todos);
        return newTodo;
    }

    async updateTodo(id: string, data: Partial<TodoItem>): Promise<TodoItem> {
        const todos = getItem<TodoItem>(STORAGE_KEYS.TODOS, mockTodos);
        const index = todos.findIndex(t => t.id === id);
        if (index === -1) throw new Error('Todo not found');

        todos[index] = { ...todos[index], ...data };
        setItem(STORAGE_KEYS.TODOS, todos);
        return todos[index];
    }

    async deleteTodo(id: string): Promise<void> {
        const todos = getItem<TodoItem>(STORAGE_KEYS.TODOS, mockTodos);
        setItem(STORAGE_KEYS.TODOS, todos.filter(t => t.id !== id));
    }

    // --- Attachments ---

    async getAttachments(psvId: string): Promise<Attachment[]> {
        const attachments = getItem<Attachment>(STORAGE_KEYS.ATTACHMENTS, mockAttachments);
        return attachments.filter(a => a.protectiveSystemId === psvId);
    }

    async createAttachment(data: any): Promise<Attachment> {
        const attachments = getItem<Attachment>(STORAGE_KEYS.ATTACHMENTS, mockAttachments);
        const newAttachment: Attachment = {
            id: uuidv4(),
            protectiveSystemId: data.protectiveSystemId || '',
            fileUri: data.fileUri || '',
            fileName: data.fileName || '',
            mimeType: data.mimeType || '',
            size: data.size || 0,
            uploadedBy: data.uploadedBy || '',
            createdAt: now(),
        };
        attachments.push(newAttachment);
        setItem(STORAGE_KEYS.ATTACHMENTS, attachments);
        return newAttachment;
    }

    async deleteAttachment(id: string): Promise<void> {
        const attachments = getItem<Attachment>(STORAGE_KEYS.ATTACHMENTS, mockAttachments);
        setItem(STORAGE_KEYS.ATTACHMENTS, attachments.filter(a => a.id !== id));
    }

    // --- Utility: Reset demo data ---

    resetDemoData(): void {
        localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
        initializeIfNeeded();
    }
}

// Export singleton instance
export const localStorageService = new LocalStorageService();
