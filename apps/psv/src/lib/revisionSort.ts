import type { RevisionHistory } from '@/data/types';

function toMillis(value?: string | null): number {
    if (!value) return 0;
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? 0 : ms;
}

export function revisionSortKey(revision: RevisionHistory): number {
    // Primary: originatedAt (date of originator signature)
    // Fallbacks: createdAt, then 0.
    return toMillis(revision.originatedAt) || toMillis(revision.createdAt);
}

export function sortRevisionsByOriginatedAtDesc(revisions: RevisionHistory[]): RevisionHistory[] {
    return revisions
        .slice()
        .sort((a, b) => {
            const timeDiff = revisionSortKey(b) - revisionSortKey(a);
            if (timeDiff !== 0) return timeDiff;
            // Stable fallback: sequence desc
            return (b.sequence ?? 0) - (a.sequence ?? 0);
        });
}

