"use client";

import { Box, IconButton } from "@mui/material";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ReactNode } from "react";

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <Box sx={{ minHeight: '100vh', position: 'relative' }}>
            <TopFloatingToolbar
                title="Process Design Agents"
                leadingAction={
                    <IconButton onClick={() => window.location.href = '/'}>
                        <ArrowBackIcon />
                    </IconButton>
                }
            />
            <Box sx={{ pt: '72px' }}>
                {children}
            </Box>
        </Box>
    );
}
