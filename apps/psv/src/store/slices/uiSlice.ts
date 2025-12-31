import { StateCreator } from 'zustand';
import { PsvStore } from '../types';
import { getDataService } from '@/lib/api';

const dataService = getDataService();

export interface UISlice {
    activeTab: number;
    sidebarOpen: boolean;
    currentPage: 'hierarchy' | 'dashboard' | 'account' | 'scenario_consideration' | 'activity' | null;
    dashboardTab: "Customers" | "Plants" | "Units" | "Areas" | "Projects" | "Equipment" | "PSVs" | "Users" | "System" | null;
    editingScenarioId: string | null;
    isLoading: boolean;
    error: string | null;
    summaryCounts: {
        customers: number;
        plants: number;
        units: number;
        areas: number;
        projects: number;
        psvs: number;
        equipment: number;
    } | null;

    setActiveTab: (tab: number) => void;
    setCurrentPage: (page: UISlice['currentPage']) => void;
    setDashboardTab: (tab: UISlice['dashboardTab']) => void;
    toggleSidebar: () => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    fetchSummaryCounts: () => Promise<void>;
}

export const createUISlice: StateCreator<PsvStore, [], [], UISlice> = (set) => ({
    activeTab: 0,
    sidebarOpen: true,
    currentPage: null,
    dashboardTab: null,
    editingScenarioId: null,
    isLoading: false,
    error: null,
    summaryCounts: null,

    setActiveTab: (tab) => set({ activeTab: tab }),
    setCurrentPage: (page) => set({ currentPage: page }),
    setDashboardTab: (tab) => set({ dashboardTab: tab }),
    toggleSidebar: () => set((state: PsvStore) => ({ sidebarOpen: !state.sidebarOpen })),
    setIsLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    fetchSummaryCounts: async () => {
        try {
            const counts = await dataService.getSummaryCounts();
            set({ summaryCounts: counts });
        } catch (error) {
            console.error('Failed to fetch summary counts:', error);
        }
    },
});
