"use client";

import { Box, Chip, Typography } from "@mui/material";
import { ChevronRight, Home } from "@mui/icons-material";

interface HierarchySegment {
    label: string;
    onClick?: () => void;
}

interface HierarchyBreadcrumbProps {
    segments: HierarchySegment[];
    showHome?: boolean;
}

export function HierarchyBreadcrumb({
    segments,
    showHome = true,
}: HierarchyBreadcrumbProps) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
            {showHome && (
                <>
                    <Chip
                        icon={<Home sx={{ fontSize: 16 }} />}
                        label="Home"
                        size="small"
                        variant="outlined"
                        onClick={segments[0]?.onClick}
                        sx={{ cursor: segments[0]?.onClick ? 'pointer' : 'default' }}
                    />
                    {segments.length > 0 && (
                        <ChevronRight sx={{ fontSize: 16, color: 'text.secondary' }} />
                    )}
                </>
            )}
            {segments.map((segment, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                        label={segment.label}
                        size="small"
                        color={index === segments.length - 1 ? 'primary' : 'default'}
                        variant={index === segments.length - 1 ? 'filled' : 'outlined'}
                        onClick={segment.onClick}
                        sx={{
                            cursor: segment.onClick ? 'pointer' : 'default',
                            '&:hover': segment.onClick ? { bgcolor: 'action.hover' } : {},
                        }}
                    />
                    {index < segments.length - 1 && (
                        <ChevronRight sx={{ fontSize: 16, color: 'text.secondary' }} />
                    )}
                </Box>
            ))}
        </Box>
    );
}
