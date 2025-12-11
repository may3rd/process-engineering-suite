/**
 * Permission utilities for role-based access control
 */

export type UserRole = 'viewer' | 'engineer' | 'lead' | 'approver' | 'admin';

/**
 * Check if a role can edit/add/delete items (scenarios, sizing cases, PSVs, etc.)
 */
export function canEdit(role?: UserRole): boolean {
    if (!role) return false;
    return ['engineer', 'lead', 'approver', 'admin'].includes(role);
}

/**
 * Check if a role can approve/issue PSVs and sizing cases
 */
export function canApprove(role?: UserRole): boolean {
    if (!role) return false;
    return ['approver', 'admin'].includes(role);
}

/**
 * Check if a role can manage hierarchy (project/area/unit/plant)
 */
export function canManageHierarchy(role?: UserRole): boolean {
    if (!role) return false;
    return ['lead', 'approver', 'admin'].includes(role);
}

/**
 * Check if a role can manage customers
 */
export function canManageCustomer(role?: UserRole): boolean {
    if (!role) return false;
    return ['approver', 'admin'].includes(role);
}

/**
 * Check if a role can manage users (admin only)
 */
export function canManageUsers(role?: UserRole): boolean {
    return role === 'admin';
}
