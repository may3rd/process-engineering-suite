// API client for PSV application.
// This module provides a typed interface to the backend API,
// with automatic error handling and retry logic.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// --- Types (matching backend responses) ---

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
}

export interface LoginResponse {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    user: User;
}

export interface Customer {
    id: string;
    name: string;
    code: string;
    status: string;
    ownerId: string;
    createdAt: string;
}

export interface Plant {
    id: string;
    customerId: string;
    name: string;
    code: string;
    location: string | null;
    status: string;
    ownerId: string;
    createdAt: string;
}

export interface Unit {
    id: string;
    plantId: string;
    name: string;
    code: string;
    service: string | null;
    status: string;
    ownerId: string;
    createdAt: string;
}

export interface Area {
    id: string;
    unitId: string;
    name: string;
    code: string;
    status: string;
    createdAt: string;
}

export interface Project {
    id: string;
    areaId: string;
    name: string;
    code: string;
    phase: string;
    status: string;
    startDate: string;
    endDate?: string;
    leadId: string;
    createdAt: string;
}

export interface ProtectiveSystem {
    id: string;
    areaId: string;
    projectIds?: string[];
    name: string;
    tag: string;
    type: string;
    designCode: string;
    serviceFluid?: string;
    fluidPhase: string;
    setPressure: number;
    mawp: number;
    ownerId: string;
    status: string;
    valveType?: string;
    tags: string[];
    inletNetwork?: any;
    outletNetwork?: any;
    createdAt: string;
    updatedAt: string;
}

export interface Scenario {
    id: string;
    protectiveSystemId: string;
    cause: string;
    description?: string;
    relievingTemp: number;
    relievingPressure: number;
    phase: string;
    relievingRate: number;
    accumulationPct: number;
    requiredCapacity: number;
    assumptions: string[];
    codeRefs: string[];
    isGoverning: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SizingCase {
    id: string;
    protectiveSystemId: string;
    scenarioId?: string;
    standard: string;
    method: string;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    revisionNo: number;
    status: string;
    createdBy: string;
    approvedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Equipment {
    id: string;
    areaId: string;
    type: string;
    tag: string;
    name: string;
    description?: string;
    designPressure?: number;
    mawp?: number;
    designTemperature?: number;
    ownerId: string;
    status: string;
    locationRef?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Comment {
    id: string;
    protectiveSystemId: string;
    body: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface TodoItem {
    id: string;
    protectiveSystemId: string;
    text: string;
    completed: boolean;
    assignedTo?: string;
    dueDate?: string;
    createdBy: string;
    createdAt: string;
}

// --- API Client Class ---

class ApiClient {
    private token: string | null = null;

    constructor() {
        // Load token from localStorage on initialization
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('accessToken');
        }
    }

    setToken(token: string | null) {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('accessToken', token);
            } else {
                localStorage.removeItem('accessToken');
            }
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // --- Auth ---

    async login(username: string, password: string): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        this.setToken(response.accessToken);
        return response;
    }

    async logout(): Promise<void> {
        await this.request('/auth/logout', { method: 'POST' });
        this.setToken(null);
    }

    async getCurrentUser(): Promise<User> {
        return this.request<User>('/auth/me');
    }

    // --- Hierarchy ---

    async getCustomers(): Promise<Customer[]> {
        return this.request<Customer[]>('/hierarchy/customers');
    }

    async getPlantsByCustomer(customerId: string): Promise<Plant[]> {
        return this.request<Plant[]>(`/hierarchy/customers/${customerId}/plants`);
    }

    async getUnitsByPlant(plantId: string): Promise<Unit[]> {
        return this.request<Unit[]>(`/hierarchy/plants/${plantId}/units`);
    }

    async getAreasByUnit(unitId: string): Promise<Area[]> {
        return this.request<Area[]>(`/hierarchy/units/${unitId}/areas`);
    }

    async getProjectsByArea(areaId: string): Promise<Project[]> {
        return this.request<Project[]>(`/hierarchy/areas/${areaId}/projects`);
    }

    // --- PSV ---

    async getProtectiveSystems(areaId?: string): Promise<ProtectiveSystem[]> {
        const query = areaId ? `?area_id=${areaId}` : '';
        return this.request<ProtectiveSystem[]>(`/psv${query}`);
    }

    async getProtectiveSystem(id: string): Promise<ProtectiveSystem> {
        return this.request<ProtectiveSystem>(`/psv/${id}`);
    }

    async createProtectiveSystem(data: Partial<ProtectiveSystem>): Promise<ProtectiveSystem> {
        return this.request<ProtectiveSystem>('/psv', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateProtectiveSystem(id: string, data: Partial<ProtectiveSystem>): Promise<ProtectiveSystem> {
        return this.request<ProtectiveSystem>(`/psv/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteProtectiveSystem(id: string): Promise<void> {
        await this.request(`/psv/${id}`, { method: 'DELETE' });
    }

    // --- Scenarios ---

    async getScenarios(psvId: string): Promise<Scenario[]> {
        return this.request<Scenario[]>(`/psv/${psvId}/scenarios`);
    }

    async createScenario(psvId: string, data: Partial<Scenario>): Promise<Scenario> {
        return this.request<Scenario>(`/psv/${psvId}/scenarios`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateScenario(id: string, data: Partial<Scenario>): Promise<Scenario> {
        return this.request<Scenario>(`/psv/scenarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteScenario(id: string): Promise<void> {
        await this.request(`/psv/scenarios/${id}`, { method: 'DELETE' });
    }

    // --- Sizing Cases ---

    async getSizingCases(psvId: string): Promise<SizingCase[]> {
        return this.request<SizingCase[]>(`/psv/${psvId}/sizing-cases`);
    }

    async createSizingCase(psvId: string, data: Partial<SizingCase>): Promise<SizingCase> {
        return this.request<SizingCase>(`/psv/${psvId}/sizing-cases`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateSizingCase(id: string, data: Partial<SizingCase>): Promise<SizingCase> {
        return this.request<SizingCase>(`/psv/sizing-cases/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteSizingCase(id: string): Promise<void> {
        await this.request(`/psv/sizing-cases/${id}`, { method: 'DELETE' });
    }

    // --- Equipment ---

    async getEquipment(areaId?: string): Promise<Equipment[]> {
        const query = areaId ? `?area_id=${areaId}` : '';
        return this.request<Equipment[]>(`/equipment${query}`);
    }

    // --- Comments ---

    async getComments(psvId: string): Promise<Comment[]> {
        return this.request<Comment[]>(`/psv/${psvId}/comments`);
    }

    async createComment(data: Partial<Comment>): Promise<Comment> {
        return this.request<Comment>('/comments', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteComment(id: string): Promise<void> {
        await this.request(`/comments/${id}`, { method: 'DELETE' });
    }

    // --- Todos ---

    async getTodos(psvId: string): Promise<TodoItem[]> {
        return this.request<TodoItem[]>(`/psv/${psvId}/todos`);
    }

    async createTodo(data: Partial<TodoItem>): Promise<TodoItem> {
        return this.request<TodoItem>('/todos', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateTodo(id: string, data: Partial<TodoItem>): Promise<TodoItem> {
        return this.request<TodoItem>(`/todos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteTodo(id: string): Promise<void> {
        await this.request(`/todos/${id}`, { method: 'DELETE' });
    }

    // --- Attachments ---

    async getAttachments(psvId: string): Promise<any[]> {
        return this.request<any[]>(`/psv/${psvId}/attachments`);
    }

    async createAttachment(data: any): Promise<any> {
        return this.request<any>('/attachments', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteAttachment(id: string): Promise<void> {
        await this.request(`/attachments/${id}`, { method: 'DELETE' });
    }

    // --- Admin ---

    async getDataSource(): Promise<{ source: 'mock' | 'database' }> {
        return this.request<{ source: 'mock' | 'database' }>('/admin/data-source');
    }

    async seedFromMock(): Promise<{ message: string; counts: Record<string, number> }> {
        return this.request('/admin/seed-from-mock', { method: 'POST' });
    }
}

// Export singleton instance
export const api = new ApiClient();
