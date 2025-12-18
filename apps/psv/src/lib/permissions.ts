/**
 * Permission utilities for role-based access control
 */

export type UserRole = 'viewer' | 'engineer' | 'lead' | 'approver' | 'division_manager' | 'admin';

/**
 * Check if a role can edit/add/delete items (scenarios, sizing cases, PSVs, etc.)
 */
export function canEdit(role?: UserRole): boolean {
    if (!role) return false;
    return ['engineer', 'lead', 'approver', 'division_manager', 'admin'].includes(role);
}

/**
 * Check if a role can approve/issue PSVs and sizing cases
 */
export function canApprove(role?: UserRole): boolean {
    if (!role) return false;
    return ['lead', 'approver', 'division_manager', 'admin'].includes(role);
}

/**
 * Check if a role can manage hierarchy (project/area/unit/plant)
 */
export function canManageHierarchy(role?: UserRole): boolean {
    if (!role) return false;
    return ['lead', 'approver', 'division_manager', 'admin'].includes(role);
}

/**
 * Check if a role can manage customers
 */
export function canManageCustomer(role?: UserRole): boolean {
    if (!role) return false;
    return ['approver', 'division_manager', 'admin'].includes(role);
}

/**
 * Check if a role can manage users (admin only)
 */
export function canManageUsers(role?: UserRole): boolean {
    return role === 'admin' || role === 'division_manager';
}

/**
 * Check if current user can edit/delete a specific target user.
 * Division managers cannot modify admin accounts.
 */
export function canEditTargetUser(currentRole?: UserRole, targetRole?: UserRole): boolean {
    if (!currentRole) return false;
    if (!canManageUsers(currentRole)) return false;
    // Division managers cannot edit/delete admins
    if (currentRole === 'division_manager' && targetRole === 'admin') return false;
    return true;
}
