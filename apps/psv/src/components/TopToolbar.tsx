"use client";

import { Box, InputBase, useTheme, IconButton, Tooltip } from "@mui/material";
import { Tune, Search, ArrowBack } from "@mui/icons-material";
import { useColorMode } from "@/contexts/ColorModeContext";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import { useRouter } from "next/navigation";

interface TopToolbarProps {
    title?: string;
    showBack?: boolean;
    onBack?: () => void;
}

export function TopToolbar({ title = "PSV Sizing", showBack = false, onBack }: TopToolbarProps) {
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const isDark = theme.palette.mode === 'dark';
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <TopFloatingToolbar
            title={title}
            subtitle={title === "PSV Sizing" ? "Pressure Safety Valve Sizing" : undefined}
            leadingAction={
                <Tooltip title="Back to Dashboard">
                    <IconButton
                        onClick={() => window.location.href = '/'}
                        size="small"
                        sx={{
                            color: 'text.primary',
                            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                        }}
                    >
                        <ArrowBack />
                    </IconButton>
                </Tooltip>
            }
            icon={<Tune />}
            actions={
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                        borderRadius: '8px',
                        px: 2,
                        py: 0.5,
                        width: { xs: 180, sm: 240 },
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                        transition: 'all 0.2s',
                        '&:hover': {
                            bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)',
                            borderColor: theme.palette.primary.main,
                        }
                    }}
                >
                    <Search sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                    <InputBase
                        placeholder="Search..."
                        sx={{
                            color: 'text.primary',
                            fontSize: '0.875rem',
                            width: '100%',
                        }}
                    />
                </Box>
            }
            onToggleTheme={toggleColorMode}
            isDarkMode={isDark}
        />
    );
}
