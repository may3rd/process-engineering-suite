"use client";

import { IconButton } from "@mui/material";
import { ArrowUpward, ArrowDownward, SwapVert } from "@mui/icons-material";
import { SortDirection } from "@/lib/sortUtils";

interface TableSortButtonProps {
    label: string;
    active: boolean;
    direction: SortDirection;
    onClick: () => void;
}

export function TableSortButton({
    label,
    active,
    direction,
    onClick,
}: TableSortButtonProps) {
    return (
        <IconButton
            size="small"
            aria-label={`Sort by ${label}`}
            onClick={onClick}
            sx={{
                ml: 0.5,
                color: active ? "primary.main" : "text.secondary",
            }}
        >
            {active ? (
                direction === "asc" ? (
                    <ArrowUpward fontSize="inherit" />
                ) : (
                    <ArrowDownward fontSize="inherit" />
                )
            ) : (
                <SwapVert fontSize="inherit" />
            )}
        </IconButton>
    );
}
