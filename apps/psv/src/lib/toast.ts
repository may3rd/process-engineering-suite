// Toast utility using sonner
// Provides a clean interface for showing toast notifications throughout the app

import { toast as sonnerToast } from 'sonner';

export const toast = {
    success: (message: string, options?: { description?: string; duration?: number }) => {
        sonnerToast.success(message, {
            description: options?.description,
            duration: options?.duration || 3000,
        });
    },

    error: (message: string, options?: { description?: string; duration?: number }) => {
        sonnerToast.error(message, {
            description: options?.description,
            duration: options?.duration || 5000,
        });
    },

    info: (message: string, options?: { description?: string; duration?: number }) => {
        sonnerToast.info(message, {
            description: options?.description,
            duration: options?.duration || 3000,
        });
    },

    loading: (message: string) => {
        return sonnerToast.loading(message);
    },

    promise: <T,>(
        promise: Promise<T>,
        {
            loading,
            success,
            error,
        }: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: any) => string);
        }
    ) => {
        return sonnerToast.promise(promise, { loading, success, error });
    },
};
