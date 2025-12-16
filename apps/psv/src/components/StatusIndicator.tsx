"use client";

import { Tooltip, useTheme, CircularProgress, Box, IconButton } from "@mui/material";
import {
    Storage as StorageIcon,
    CloudDone as CloudDoneIcon,
    ErrorOutline as ErrorIcon,
} from "@mui/icons-material";
import { useServerHealth } from "@/hooks/useServerHealth";
import { USE_LOCAL_STORAGE } from "@/lib/api";

interface StatusIndicatorProps {
    onClick?: () => void;
}

export function StatusIndicator({ onClick }: StatusIndicatorProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isLocalStorage = USE_LOCAL_STORAGE;
    const serverHealth = useServerHealth(!isLocalStorage);

    // Determine status based on mode
    const getStatusConfig = () => {
        if (isLocalStorage) {
            return {
                icon: <StorageIcon sx={{ fontSize: 20 }} />,
                color: theme.palette.warning.main,
                bgColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                tooltip: 'Demo Mode\n\nUsing local browser storage. Changes are saved locally and not synced to a database.',
                clickable: false,
            };
        }

        switch (serverHealth.status) {
            case 'checking':
                return {
                    icon: <CircularProgress size={18} sx={{ color: theme.palette.info.main }} />,
                    color: theme.palette.info.main,
                    bgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    tooltip: 'Checking server connection...',
                    clickable: false,
                };
            case 'healthy':
                return {
                    icon: <CloudDoneIcon sx={{ fontSize: 20 }} />,
                    color: theme.palette.success.main,
                    bgColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    tooltip: `Connected to Database\n\n${serverHealth.apiUrl}${serverHealth.lastChecked
                            ? `\nLast checked: ${serverHealth.lastChecked.toLocaleTimeString()}`
                            : ''
                        }`,
                    clickable: false,
                };
            case 'error':
                return {
                    icon: <ErrorIcon sx={{ fontSize: 20 }} />,
                    color: theme.palette.error.main,
                    bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    tooltip: `Server Offline\n\n${serverHealth.error || 'Unable to connect to server'}\n\nClick to retry connection`,
                    clickable: true,
                };
            default:
                return {
                    icon: <StorageIcon sx={{ fontSize: 20 }} />,
                    color: theme.palette.text.secondary,
                    bgColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    tooltip: 'Status unknown',
                    clickable: false,
                };
        }
    };

    const config = getStatusConfig();

    const handleClick = () => {
        if (config.clickable && onClick) {
            onClick();
        } else if (config.clickable) {
            // Force a page reload to retry connection
            window.location.reload();
        }
    };

    return (
        <Tooltip
            title={config.tooltip}
            arrow
            enterDelay={300}
            sx={{
                whiteSpace: 'pre-line',
            }}
        >
            <IconButton
                onClick={config.clickable ? handleClick : undefined}
                sx={{
                    width: 40,
                    height: 40,
                    bgcolor: config.bgColor,
                    color: config.color,
                    border: `1.5px solid ${config.color}`,
                    cursor: config.clickable ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    '&:hover': {
                        bgcolor: config.bgColor,
                        transform: config.clickable ? 'translateY(-1px)' : 'none',
                        boxShadow: config.clickable ? 2 : 0,
                    },
                }}
            >
                {config.icon}
            </IconButton>
        </Tooltip>
    );
}
