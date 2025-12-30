// Server health check hook for PSV application.
// Monitors database connection status with periodic health checks.

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';

export type HealthStatus = 'checking' | 'healthy' | 'error' | 'idle' | 'db-disconnected';

export interface ServerHealth {
    status: HealthStatus;
    lastChecked?: Date;
    error?: string;
    apiUrl: string;
    database?: 'connected' | 'disconnected';
}

interface HealthCheckResponse {
    status: 'healthy' | 'unhealthy';
    database?: 'connected' | 'disconnected';
    timestamp: string;
}

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const INITIAL_RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRY_DELAY = 60000; // 60 seconds

export function useServerHealth(enabled: boolean = true): ServerHealth {
    const [health, setHealth] = useState<ServerHealth>({
        status: 'idle',
        apiUrl: API_BASE_URL,
    });
    const [retryDelay, setRetryDelay] = useState(INITIAL_RETRY_DELAY);

    const checkHealth = useCallback(async () => {
        if (!enabled) return;

        setHealth((prev) => ({ ...prev, status: 'checking' }));

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await fetch(`${API_BASE_URL}/health`, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data: HealthCheckResponse = await response.json();
            const databaseStatus = data.database;
            const isDatabaseDisconnected = databaseStatus === 'disconnected';
            const status: HealthStatus = isDatabaseDisconnected
                ? 'db-disconnected'
                : data.status === 'healthy'
                    ? 'healthy'
                    : 'error';
            const error = isDatabaseDisconnected
                ? 'Database connection unavailable'
                : data.status === 'healthy'
                    ? undefined
                    : 'Server reported unhealthy';

            setHealth({
                status,
                lastChecked: new Date(),
                error,
                apiUrl: API_BASE_URL,
                database: databaseStatus,
            });

            // Reset retry delay on success
            setRetryDelay(INITIAL_RETRY_DELAY);
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.name === 'AbortError'
                        ? 'Connection timeout'
                        : error.message
                    : 'Unknown error';

            setHealth({
                status: 'error',
                lastChecked: new Date(),
                error: errorMessage,
                apiUrl: API_BASE_URL,
            });

            // Exponential backoff for retries
            setRetryDelay((prev) => Math.min(prev * 2, MAX_RETRY_DELAY));
        }
    }, [enabled]);

    // Initial check and periodic checks
    useEffect(() => {
        if (!enabled) {
            setHealth({ status: 'idle', apiUrl: API_BASE_URL });
            return;
        }

        // Initial check
        checkHealth();

        // Set up periodic checks
        const intervalId = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

        return () => {
            clearInterval(intervalId);
        };
    }, [enabled, checkHealth]);

    // Retry mechanism on error
    useEffect(() => {
        if (!enabled || health.status !== 'error') return;

        const timeoutId = setTimeout(checkHealth, retryDelay);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [enabled, health.status, retryDelay, checkHealth]);

    return health;
}
