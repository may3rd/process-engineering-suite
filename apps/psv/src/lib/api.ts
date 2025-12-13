// API client for PSV application.
// This module provides a typed interface to the backend API,
// with automatic error handling and retry logic.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    ProjectNote,
} from '@/data/types';

export interface LoginResponse {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    user: User;
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

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
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

    async createCustomer(data: Partial<Customer>): Promise<Customer> {
        return this.request<Customer>('/hierarchy/customers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
        return this.request<Customer>(`/hierarchy/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteCustomer(id: string): Promise<void> {
        await this.request(`/hierarchy/customers/${id}`, { method: 'DELETE' });
    }

    async createPlant(data: Partial<Plant>): Promise<Plant> {
        return this.request<Plant>('/hierarchy/plants', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updatePlant(id: string, data: Partial<Plant>): Promise<Plant> {
        return this.request<Plant>(`/hierarchy/plants/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deletePlant(id: string): Promise<void> {
        await this.request(`/hierarchy/plants/${id}`, { method: 'DELETE' });
    }

    async createUnit(data: Partial<Unit>): Promise<Unit> {
        return this.request<Unit>('/hierarchy/units', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateUnit(id: string, data: Partial<Unit>): Promise<Unit> {
        return this.request<Unit>(`/hierarchy/units/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteUnit(id: string): Promise<void> {
        await this.request(`/hierarchy/units/${id}`, { method: 'DELETE' });
    }

    async createArea(data: Partial<Area>): Promise<Area> {
        return this.request<Area>('/hierarchy/areas', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateArea(id: string, data: Partial<Area>): Promise<Area> {
        return this.request<Area>(`/hierarchy/areas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteArea(id: string): Promise<void> {
        await this.request(`/hierarchy/areas/${id}`, { method: 'DELETE' });
    }

    async createProject(data: Partial<Project>): Promise<Project> {
        return this.request<Project>('/hierarchy/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateProject(id: string, data: Partial<Project>): Promise<Project> {
        return this.request<Project>(`/hierarchy/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteProject(id: string): Promise<void> {
        await this.request(`/hierarchy/projects/${id}`, { method: 'DELETE' });
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

    async createEquipment(data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment> {
        return this.request<Equipment>('/equipment', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateEquipment(id: string, data: Partial<Equipment>): Promise<Equipment> {
        return this.request<Equipment>(`/equipment/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteEquipment(id: string): Promise<void> {
        await this.request(`/equipment/${id}`, { method: 'DELETE' });
    }

    private mapEquipmentLink(raw: any): EquipmentLink {
        return {
            id: raw.id,
            psvId: raw.protectiveSystemId ?? raw.psvId,
            equipmentId: raw.equipmentId,
            isPrimary: raw.isPrimary ?? false,
            scenarioId: raw.scenarioId ?? raw.scenarioID,
            relationship: raw.relationship,
            notes: raw.notes,
            createdAt: raw.createdAt,
        };
    }

    private mapNote(raw: any): ProjectNote {
        return {
            id: raw.id,
            protectiveSystemId: raw.protectiveSystemId ?? raw.psvId,
            body: raw.body,
            createdBy: raw.createdBy,
            createdAt: raw.createdAt,
            updatedBy: raw.updatedBy,
            updatedAt: raw.updatedAt,
        };
    }

    // --- Equipment Links ---

    async getEquipmentLinks(psvId: string): Promise<EquipmentLink[]> {
        const response = await this.request<any[]>(`/psv/${psvId}/equipment-links`);
        return response.map((item) => this.mapEquipmentLink(item));
    }

    async createEquipmentLink(data: {
        protectiveSystemId: string;
        equipmentId: string;
        isPrimary?: boolean;
        scenarioId?: string;
        relationship?: string;
        notes?: string;
    }): Promise<EquipmentLink> {
        const created = await this.request<any>('/equipment-links', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return this.mapEquipmentLink(created);
    }

    async deleteEquipmentLink(id: string): Promise<void> {
        await this.request(`/equipment-links/${id}`, { method: 'DELETE' });
    }

    // --- Notes ---

    async getNotes(psvId: string): Promise<ProjectNote[]> {
        const response = await this.request<any[]>(`/psv/${psvId}/notes`);
        return response.map((item) => this.mapNote(item));
    }

    async createNote(data: Partial<ProjectNote>): Promise<ProjectNote> {
        const response = await this.request<any>('/notes', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return this.mapNote(response);
    }

    async updateNote(id: string, data: Partial<ProjectNote>): Promise<ProjectNote> {
        const response = await this.request<any>(`/notes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return this.mapNote(response);
    }

    async deleteNote(id: string): Promise<void> {
        await this.request(`/notes/${id}`, { method: 'DELETE' });
    }

    // --- Comments ---

    private mapComment(raw: any): Comment {
        return {
            id: raw.id,
            protectiveSystemId: raw.protectiveSystemId ?? raw.psvId,
            body: raw.body,
            createdBy: raw.createdBy,
            createdAt: raw.createdAt,
            updatedBy: raw.updatedBy,
            updatedAt: raw.updatedAt,
        };
    }

    async getComments(psvId: string): Promise<Comment[]> {
        const response = await this.request<any[]>(`/psv/${psvId}/comments`);
        return response.map((item) => this.mapComment(item));
    }

    async createComment(data: Partial<Comment>): Promise<Comment> {
        const response = await this.request<any>('/comments', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return this.mapComment(response);
    }

    async updateComment(id: string, data: Partial<Comment>): Promise<Comment> {
        const response = await this.request<any>(`/comments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return this.mapComment(response);
    }

    async deleteComment(id: string): Promise<void> {
        await this.request(`/comments/${id}`, { method: 'DELETE' });
    }

    // --- Todos ---

    private mapTodo(raw: any): TodoItem {
        return {
            id: raw.id,
            protectiveSystemId: raw.protectiveSystemId ?? raw.psvId,
            text: raw.text,
            completed: raw.completed ?? false,
            assignedTo: raw.assignedTo,
            dueDate: raw.dueDate,
            createdBy: raw.createdBy,
            createdAt: raw.createdAt,
        };
    }

    async getTodos(psvId: string): Promise<TodoItem[]> {
        const response = await this.request<any[]>(`/psv/${psvId}/todos`);
        return response.map((item) => this.mapTodo(item));
    }

    async createTodo(data: Partial<TodoItem>): Promise<TodoItem> {
        const response = await this.request<any>('/todos', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return this.mapTodo(response);
    }

    async updateTodo(id: string, data: Partial<TodoItem>): Promise<TodoItem> {
        const response = await this.request<any>(`/todos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return this.mapTodo(response);
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

// Environment variable to toggle between API and localStorage
// Default to localStorage when not explicitly disabled to ensure the demo works without a backend.
export const USE_LOCAL_STORAGE = process.env.NEXT_PUBLIC_USE_LOCAL_STORAGE !== 'false';

// Export singleton instance
export const api = new ApiClient();

// Import localStorage service for demo mode
import { localStorageService } from './localStorageService';

// Factory function to get the appropriate data service
export function getDataService() {
    return USE_LOCAL_STORAGE ? localStorageService : api;
}

// Export type for the data service (union of both interfaces)
export type DataService = typeof api | typeof localStorageService;
