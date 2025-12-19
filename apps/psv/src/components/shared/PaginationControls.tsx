"use client";

import { Box, Button, IconButton, Typography, useTheme } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    pageNumbers: (number | "...")[];
    onPageChange: (page: number) => void;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export function PaginationControls({
    currentPage,
    totalPages,
    pageNumbers,
    onPageChange,
    hasNextPage,
    hasPrevPage,
}: PaginationControlsProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    if (totalPages <= 1) return null;

    const buttonSx = {
        minWidth: 32,
        height: 32,
        px: 1.5,
        fontSize: "0.875rem",
        fontWeight: 500,
        borderRadius: "6px",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
        bgcolor: "transparent",
        color: "text.primary",
        "&:hover": {
            bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
            borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
        },
        "&.Mui-disabled": {
            opacity: 0.5,
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        },
    };

    const activeButtonSx = {
        ...buttonSx,
        bgcolor: "primary.main",
        color: "primary.contrastText",
        borderColor: "primary.main",
        "&:hover": {
            bgcolor: "primary.dark",
            borderColor: "primary.dark",
        },
    };

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                py: 3,
            }}
        >
            {/* Previous */}
            <Button
                size="small"
                disabled={!hasPrevPage}
                onClick={() => onPageChange(currentPage - 1)}
                startIcon={<ChevronLeft sx={{ fontSize: 18 }} />}
                sx={{
                    ...buttonSx,
                    px: 2,
                }}
            >
                Previous
            </Button>

            {/* Page Numbers */}
            {pageNumbers.map((page, index) =>
                page === "..." ? (
                    <Typography
                        key={`ellipsis-${index}`}
                        sx={{
                            px: 1,
                            color: "text.secondary",
                            fontSize: "0.875rem",
                        }}
                    >
                        …
                    </Typography>
                ) : (
                    <IconButton
                        key={page}
                        size="small"
                        onClick={() => onPageChange(page)}
                        sx={page === currentPage ? activeButtonSx : buttonSx}
                    >
                        {page}
                    </IconButton>
                )
            )}

            {/* Next */}
            <Button
                size="small"
                disabled={!hasNextPage}
                onClick={() => onPageChange(currentPage + 1)}
                endIcon={<ChevronRight sx={{ fontSize: 18 }} />}
                sx={{
                    ...buttonSx,
                    px: 2,
                }}
            >
                Next
            </Button>
        </Box>
    );
}
