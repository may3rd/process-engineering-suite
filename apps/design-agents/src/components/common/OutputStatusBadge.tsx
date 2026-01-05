"use client";

import { Chip, useTheme } from "@mui/material";
import type { OutputStatus } from "@/data/types";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DraftIcon from '@mui/icons-material/Edit';
import ReviewIcon from '@mui/icons-material/RateReview';
import RerunIcon from '@mui/icons-material/Refresh';
import OutdatedIcon from '@mui/icons-material/Warning';

interface OutputStatusBadgeProps {
    status: OutputStatus;
    size?: 'small' | 'medium';
}

export function OutputStatusBadge({ status, size = 'small' }: OutputStatusBadgeProps) {
    const theme = useTheme();

    const statusConfig: Record<OutputStatus, { label: string; color: string; icon: React.ReactElement }> = {
        draft: {
            label: 'Draft',
            color: theme.palette.mode === 'dark' ? '#0284c7' : '#0ea5e9',
            icon: <DraftIcon fontSize="small" />,
        },
        needs_review: {
            label: 'Needs Review',
            color: theme.palette.mode === 'dark' ? '#f59e0b' : '#fbbf24',
            icon: <ReviewIcon fontSize="small" />,
        },
        approved: {
            label: 'Approved',
            color: theme.palette.mode === 'dark' ? '#10b981' : '#34d399',
            icon: <CheckCircleIcon fontSize="small" />,
        },
        needs_rerun: {
            label: 'Needs Rerun',
            color: theme.palette.mode === 'dark' ? '#ea580c' : '#fb923c',
            icon: <RerunIcon fontSize="small" />,
        },
        outdated: {
            label: 'Outdated',
            color: theme.palette.mode === 'dark' ? '#6b7280' : '#9ca3af',
            icon: <OutdatedIcon fontSize="small" />,
        },
    };

    const config = statusConfig[status];

    return (
        <Chip
            label={config.label}
            icon={config.icon}
            size={size}
            sx={{
                backgroundColor: `${config.color}20`,
                color: config.color,
                borderColor: config.color,
                border: `1px solid ${config.color}40`,
                fontWeight: 600,
                '& .MuiChip-icon': {
                    color: config.color,
                },
            }}
        />
    );
}
