import { RevisionHistory, ProtectiveSystem } from '@/data/types';
import { users } from '@/data/mockData';

export function getUserName(userId: string | null | undefined, currentUser?: any) {
    if (!userId) return '(empty)';
    if (currentUser && currentUser.id === userId) return currentUser.name;
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'User';
}

export function handleOptionalFetch<T>(promise: Promise<T>, label: string, fallback: T): Promise<T> {
    return promise.catch(error => {
        console.warn(`Optional fetch failed for ${label}:`, error);
        return fallback;
    });
}

export function derivePsvStatusFromRevision(
    revision: Pick<RevisionHistory, 'originatedBy' | 'checkedBy' | 'approvedBy'> | undefined,
    currentStatus?: ProtectiveSystem['status']
): ProtectiveSystem['status'] {
    if (currentStatus === 'issued') return 'issued';
    if (!revision?.originatedBy) return 'draft';
    if (!revision.checkedBy) return 'in_review';
    if (!revision.approvedBy) return 'checked';
    return 'approved';
}
