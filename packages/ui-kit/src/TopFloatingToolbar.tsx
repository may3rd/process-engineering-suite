"use client";

import { Box, Typography, Stack, useTheme } from "@mui/material";
import { ReactNode } from "react";

export interface TopFloatingToolbarProps {
    title?: string;
    subtitle?: string;
    icon?: ReactNode;
    actions?: ReactNode;
}

export const TopFloatingToolbar = ({
    title = "E-PT",
    subtitle,
    icon,
    actions
}: TopFloatingToolbarProps) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 3,
                py: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
                backdropFilter: 'blur(10px)',
                position: 'sticky',
                top: 0,
                zIndex: 1100,
            }}
        >
            {/* Left Side: Branding */}
            <Stack direction="row" alignItems="center" spacing={2}>
                {icon && (
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                        }}
                    >
                        {icon}
                    </Box>
                )}
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
            </Stack>

            {/* Right Side: Actions */}
            <Stack direction="row" alignItems="center" spacing={2}>
                {actions}
            </Stack>
        </Box>
    );
};
