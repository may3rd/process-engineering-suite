// Storage keys for Process Engineering Suite
export const STORAGE_KEYS = {
    THEME: 'ept-pes-theme',
    VIEW_SETTINGS: 'ept-pes-view-settings',
} as const;

/**
 * Get a value from localStorage with type safety
 */
export function getStoredValue<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;

    try {
        const stored = localStorage.getItem(key);
        if (stored === null) return defaultValue;
        return JSON.parse(stored) as T;
    } catch {
        return defaultValue;
    }
}

/**
 * Set a value in localStorage
 */
export function setStoredValue<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
}

/**
 * Remove a value from localStorage
 */
export function removeStoredValue(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
}
