'use client';

import { Chip, ChipProps } from '@mui/material';
import { History } from '@mui/icons-material';
import { RevisionHistory } from '@/data/types';

interface RevisionBadgeProps {
    revision?: RevisionHistory;
    revisionCode?: string;  // Fallback if no full revision object
    onClick?: () => void;
    size?: 'small' | 'medium';
    showIcon?: boolean;
}

/**
 * RevisionBadge displays the current revision code (e.g., "Rev. A1")
 * Clickable to open revision history panel.
 */
export function RevisionBadge({
    revision,
    revisionCode,
    onClick,
    size = 'small',
    showIcon = true,
}: RevisionBadgeProps) {
    const code = revision?.revisionCode || revisionCode || 'O1';

    const chipProps: ChipProps = {
        label: `Rev. ${code}`,
        size,
        variant: 'outlined',
        onClick,
        sx: {
            cursor: onClick ? 'pointer' : 'default',
            fontWeight: 500,
            '&:hover': onClick ? {
                bgcolor: 'action.hover',
            } : {},
        },
    };

    if (showIcon) {
        chipProps.icon = <History fontSize="small" />;
    }

    return <Chip {...chipProps} />;
}
