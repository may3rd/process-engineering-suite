/**
 * Audit Logging Service
 * 
 * Provides centralized audit logging for all entity changes.
 * In demo mode (USE_LOCAL_STORAGE=true), logs are stored in localStorage.
 * In API mode, logs are sent to the backend.
 */

import { AuditLog, AuditAction, AuditEntityType, AuditFieldChange } from '@/data/types';
import { api, USE_LOCAL_STORAGE } from './api';

const AUDIT_LOG_KEY = 'psv_audit_logs';
const MAX_LOGS = 1000; // Limit stored logs to prevent localStorage overflow

/**
 * Get all audit logs from storage (localStorage mode only)
 */
function getLocalAuditLogs(): AuditLog[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(AUDIT_LOG_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored) as AuditLog[];
    } catch {
        return [];
    }
}

/**
 * Get all audit logs
 * In API mode, this fetches from the backend with default pagination.
 */
export async function getAuditLogsAsync(filters?: {
    entityType?: AuditEntityType;
    entityId?: string;
    limit?: number;
    offset?: number;
}): Promise<AuditLog[]> {
    if (USE_LOCAL_STORAGE) {
        let logs = getLocalAuditLogs();
        if (filters?.entityType) {
            logs = logs.filter(l => l.entityType === filters.entityType);
        }
        if (filters?.entityId) {
            logs = logs.filter(l => l.entityId === filters.entityId);
        }
        const offset = filters?.offset || 0;
        const limit = filters?.limit || 50;
        return logs.slice(offset, offset + limit);
    }

    const response = await api.getAuditLogs({
        entityType: filters?.entityType,
        entityId: filters?.entityId,
        limit: filters?.limit,
        offset: filters?.offset,
    });
    return response.items;
}

/**
 * Get audit logs with pagination info (items + total count)
 */
export async function getAuditLogsPagedAsync(filters?: {
    entityType?: AuditEntityType;
    entityId?: string;
    limit?: number;
    offset?: number;
}): Promise<{ items: AuditLog[]; total: number }> {
    if (USE_LOCAL_STORAGE) {
        let logs = getLocalAuditLogs();
        const total = logs.length;

        if (filters?.entityType) {
            logs = logs.filter(l => l.entityType === filters.entityType);
        }
        if (filters?.entityId) {
            logs = logs.filter(l => l.entityId === filters.entityId);
        }
        const offset = filters?.offset || 0;
        const limit = filters?.limit || 50;
        return { items: logs.slice(offset, offset + limit), total };
    }

    const response = await api.getAuditLogs({
        entityType: filters?.entityType,
        entityId: filters?.entityId,
        limit: filters?.limit,
        offset: filters?.offset,
    });
    return { items: response.items, total: response.total };
}


/**
 * Get all audit logs from storage (synchronous, localStorage only - for backwards compatibility)
 */
export function getAuditLogs(): AuditLog[] {
    return getLocalAuditLogs();
}

/**
 * Get audit logs for a specific entity
 */
export function getEntityAuditLogs(entityType: AuditEntityType, entityId: string): AuditLog[] {
    const logs = getLocalAuditLogs();
    return logs.filter(log => log.entityType === entityType && log.entityId === entityId);
}

/**
 * Get audit logs for a specific project
 */
export function getProjectAuditLogs(projectId: string): AuditLog[] {
    const logs = getLocalAuditLogs();
    return logs.filter(log => log.projectId === projectId);
}

/**
 * Get recent audit logs (paginated)
 */
export function getRecentAuditLogs(limit: number = 50, offset: number = 0): AuditLog[] {
    const logs = getLocalAuditLogs();
    return logs.slice(offset, offset + limit);
}

/**
 * Create a new audit log entry
 */
export function createAuditLog(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    entityName: string,
    userId: string,
    userName: string,
    options?: {
        userRole?: string;
        changes?: AuditFieldChange[];
        description?: string;
        projectId?: string;
        projectName?: string;
    }
): AuditLog {
    const log: AuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        action,
        entityType,
        entityId,
        entityName,
        userId,
        userName,
        userRole: options?.userRole,
        changes: options?.changes,
        description: options?.description,
        projectId: options?.projectId,
        projectName: options?.projectName,
        createdAt: new Date().toISOString(),
    };

    // Save to storage
    if (USE_LOCAL_STORAGE) {
        saveLocalAuditLog(log);
    } else {
        // Fire and forget API call for non-blocking logging
        api.createAuditLog({
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            entityName: log.entityName,
            userId: log.userId,
            userName: log.userName,
            userRole: log.userRole,
            changes: log.changes,
            description: log.description,
            projectId: log.projectId,
            projectName: log.projectName,
        }).catch(err => console.error('Failed to create audit log:', err));
    }

    return log;
}

/**
 * Save an audit log entry to localStorage
 */
function saveLocalAuditLog(log: AuditLog): void {
    if (typeof window === 'undefined') return;

    const logs = getLocalAuditLogs();

    // Add new log at the beginning (most recent first)
    logs.unshift(log);

    // Trim to max size
    if (logs.length > MAX_LOGS) {
        logs.splice(MAX_LOGS);
    }

    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
}

/**
 * Helper to detect field changes between old and new objects
 */
export function detectChanges<T extends object>(
    oldObj: T,
    newObj: Partial<T>,
    fieldsToTrack?: (keyof T)[]
): AuditFieldChange[] {
    const changes: AuditFieldChange[] = [];
    const fields = fieldsToTrack || (Object.keys(newObj) as (keyof T)[]);


    for (const field of fields) {
        const oldValue = oldObj[field];
        const newValue = newObj[field];

        // Skip if new value is undefined (not being updated)
        if (newValue === undefined) continue;

        // Deep comparison for objects
        const oldStr = JSON.stringify(oldValue);
        const newStr = JSON.stringify(newValue);

        if (oldStr !== newStr) {
            changes.push({
                field: String(field),
                oldValue,
                newValue,
            });
        }
    }

    return changes;
}

/**
 * Format a field name for display
 */
export function formatFieldName(field: string): string {
    // Convert camelCase to Title Case with spaces
    return field
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

/**
 * Format a field value for display
 */
export function formatFieldValue(value: unknown): string {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
        if (Array.isArray(value)) return `[${value.length} items]`;
        return '(object)';
    }
    return String(value);
}

/**
 * Get a human-readable description of an action
 */
export function getActionDescription(action: AuditAction, entityType: AuditEntityType): string {
    const entityLabel = entityType.replace(/_/g, ' ');
    switch (action) {
        case 'create': return `created ${entityLabel}`;
        case 'update': return `updated ${entityLabel}`;
        case 'delete': return `deleted ${entityLabel}`;
        case 'status_change': return `changed status of ${entityLabel}`;
        case 'calculate': return `ran calculations for ${entityLabel}`;
        default: return `modified ${entityLabel}`;
    }
}

/**
 * Get color for action badge
 */
export function getActionColor(action: AuditAction): 'success' | 'info' | 'warning' | 'error' | 'default' {
    switch (action) {
        case 'create': return 'success';
        case 'update': return 'info';
        case 'delete': return 'error';
        case 'status_change': return 'warning';
        case 'calculate': return 'default';
        default: return 'default';
    }
}

/**
 * Clear all audit logs (for testing/demo reset)
 */
export function clearAuditLogs(): void {
    if (typeof window === 'undefined') return;

    if (USE_LOCAL_STORAGE) {
        localStorage.removeItem(AUDIT_LOG_KEY);
    } else {
        // Fire and forget API call
        api.clearAuditLogs().catch(err => console.error('Failed to clear audit logs:', err));
    }
}
