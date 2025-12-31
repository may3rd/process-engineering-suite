"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Session guard hook that monitors session expiration.
 * - Checks session validity every 60 seconds
 * - Shows warning toast 5 minutes before expiry
 * - Auto-logs out when session expires
 */
export function useSessionGuard() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const sessionExpiresAt = useAuthStore((state) => state.sessionExpiresAt);
    const logout = useAuthStore((state) => state.logout);
    const warningShownRef = useRef(false);

    const checkSession = useCallback(() => {
        if (!isAuthenticated || !sessionExpiresAt) return;

        const now = Date.now();
        const timeRemaining = sessionExpiresAt - now;

        // Session expired - auto logout
        if (timeRemaining <= 0) {
            console.log("[SessionGuard] Session expired, logging out...");
            logout();
            warningShownRef.current = false;
            return;
        }

        // Warning: 5 minutes before expiry
        const FIVE_MINUTES = 5 * 60 * 1000;
        if (timeRemaining <= FIVE_MINUTES && !warningShownRef.current) {
            warningShownRef.current = true;
            const minutesLeft = Math.ceil(timeRemaining / 60000);
            console.log(`[SessionGuard] Session expires in ${minutesLeft} minute(s)`);
            // In a real app, you'd show a toast/snackbar here
            // For now, we just log it
        }

        // Reset warning flag if session was extended
        if (timeRemaining > FIVE_MINUTES) {
            warningShownRef.current = false;
        }
    }, [isAuthenticated, sessionExpiresAt, logout]);

    useEffect(() => {
        // Initial check
        checkSession();

        // Check every 60 seconds
        const intervalId = setInterval(checkSession, 60 * 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [checkSession]);

    // Also check on visibility change (tab becomes visible)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                checkSession();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [checkSession]);
}

/**
 * Component wrapper that uses the session guard hook.
 * Place this inside your provider tree.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
    useSessionGuard();
    return <>{ children } </>;
}
