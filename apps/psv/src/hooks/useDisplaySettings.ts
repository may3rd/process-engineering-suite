"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { DisplaySettings } from "@/data/types";

// Default display settings
export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
    decimalPlaces: {
        pressure: 2,
        temperature: 1,
        flow: 0,
        length: 2,
        general: 2,
    },
};

/**
 * Hook to access user's display settings with defaults.
 * Returns the current user's display settings merged with defaults.
 */
export function useDisplaySettings(): DisplaySettings {
    const currentUser = useAuthStore((state) => state.currentUser);
    const userSettings = currentUser?.displaySettings;

    return {
        decimalPlaces: {
            ...DEFAULT_DISPLAY_SETTINGS.decimalPlaces,
            ...userSettings?.decimalPlaces,
        },
    };
}

/**
 * Get decimal places for a specific field type.
 */
export function useDecimalPlaces(type: keyof DisplaySettings['decimalPlaces']): number {
    const settings = useDisplaySettings();
    return settings.decimalPlaces[type] ?? settings.decimalPlaces.general;
}
