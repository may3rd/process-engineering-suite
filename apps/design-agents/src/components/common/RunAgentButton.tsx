"use client";

import { Button, CircularProgress, useTheme } from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';

interface RunAgentButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    isRerun?: boolean;
    variant?: 'contained' | 'outlined';
    size?: 'small' | 'medium' | 'large';
}

export function RunAgentButton({
    label,
    onClick,
    disabled = false,
    loading = false,
    isRerun = false,
    variant = 'contained',
    size = 'medium',
}: RunAgentButtonProps) {
    const theme = useTheme();

    return (
        <Button
            variant={variant}
            onClick={onClick}
            disabled={disabled || loading}
            startIcon={
                loading ? (
                    <CircularProgress size={18} color="inherit" />
                ) : isRerun ? (
                    <RefreshIcon />
                ) : (
                    <PlayArrowIcon />
                )
            }
            size={size}
            aria-label={label}
            sx={{
                px: 3,
                background: variant === 'contained'
                    ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                    : 'transparent',
                boxShadow: variant === 'contained'
                    ? `inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 2px 8px rgba(0, 0, 0, 0.2)`
                    : 'none',
                '&:hover': {
                    background: variant === 'contained'
                        ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
                        : 'transparent',
                    boxShadow: variant === 'contained'
                        ? `inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3)`
                        : 'none',
                },
            }}
        >
            {label}
        </Button>
    );
}
