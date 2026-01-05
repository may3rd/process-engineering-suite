"use client";

import { Box } from "@mui/material";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import { ReactNode } from "react";

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <Box sx={{ minHeight: '100vh', position: 'relative' }}>
            <TopFloatingToolbar
                title="Process Design Agents"
                onBack={() => {
                    window.location.href = '/';
                }}
            />
            <Box sx={{ pt: '72px' }}>
                {children}
            </Box>
        </Box>
    );
}
