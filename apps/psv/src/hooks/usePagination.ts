import { useMemo, useState, useCallback } from "react";

export interface UsePaginationOptions {
    totalItems: number;
    itemsPerPage?: number;
    initialPage?: number;
}

export interface UsePaginationResult<T> {
    currentPage: number;
    totalPages: number;
    pageItems: T[];
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startIndex: number;
    endIndex: number;
    pageNumbers: (number | "...")[];
}

export function usePagination<T>(
    items: T[],
    options: UsePaginationOptions
): UsePaginationResult<T> {
    const { itemsPerPage = 10, initialPage = 1 } = options;
    const [currentPage, setCurrentPage] = useState(initialPage);

    const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

    // Reset to page 1 if items change significantly
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, items.length);

    const pageItems = useMemo(
        () => items.slice(startIndex, endIndex),
        [items, startIndex, endIndex]
    );

    const goToPage = useCallback((page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    }, [totalPages]);

    const nextPage = useCallback(() => {
        goToPage(safeCurrentPage + 1);
    }, [safeCurrentPage, goToPage]);

    const prevPage = useCallback(() => {
        goToPage(safeCurrentPage - 1);
    }, [safeCurrentPage, goToPage]);

    // Generate page numbers with ellipsis (like GitHub)
    const pageNumbers = useMemo((): (number | "...")[] => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | "...")[] = [];
        const showAround = 1; // Pages to show around current

        // Always show first page
        pages.push(1);

        // Show ellipsis if needed
        if (safeCurrentPage > 3 + showAround) {
            pages.push("...");
        }

        // Pages around current
        const rangeStart = Math.max(2, safeCurrentPage - showAround);
        const rangeEnd = Math.min(totalPages - 1, safeCurrentPage + showAround);

        for (let i = rangeStart; i <= rangeEnd; i++) {
            if (!pages.includes(i)) {
                pages.push(i);
            }
        }

        // Show ellipsis if needed
        if (safeCurrentPage < totalPages - 2 - showAround) {
            pages.push("...");
        }

        // Always show last page
        if (!pages.includes(totalPages)) {
            pages.push(totalPages);
        }

        return pages;
    }, [totalPages, safeCurrentPage]);

    return {
        currentPage: safeCurrentPage,
        totalPages,
        pageItems,
        goToPage,
        nextPage,
        prevPage,
        hasNextPage: safeCurrentPage < totalPages,
        hasPrevPage: safeCurrentPage > 1,
        startIndex,
        endIndex,
        pageNumbers,
    };
}
