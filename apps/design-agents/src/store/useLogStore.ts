import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ActivityLog } from '../components/common/ActivityMonitor/ActivityMonitor';

interface LogStore {
  logs: ActivityLog[];
  isActive: boolean;
  addLog: (message: string, type?: ActivityLog['type']) => void;
  setActive: (active: boolean) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogStore>()(
  devtools(
    (set) => ({
      logs: [],
      isActive: false,
      addLog: (message, type = 'info') => set((state) => ({
        logs: [...state.logs, {
          id: Math.random().toString(36).substr(2, 9),
          message,
          timestamp: Date.now(),
          type
        }]
      })),
      setActive: (active) => set({ isActive: active }),
      clearLogs: () => set({ logs: [] })
    }),
    { name: 'LogStore' }
  )
);
