"use client";

import { Box, Typography, IconButton, InputBase, Stack, Button, useTheme, Tooltip } from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import HubIcon from '@mui/icons-material/Hub';
import { useColorMode } from "@/contexts/ColorModeContext";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";

export const TopToolbar = () => {
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const isDark = theme.palette.mode === 'dark';

    return (
        <TopFloatingToolbar
            title="E-PT"
            subtitle="process engineering suite"
            icon={<HubIcon />}
            actions={
                <>
                    {/* Search Box */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                            borderRadius: '8px',
                            px: 2,
                            py: 0.5,
                            width: 240,
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)',
                                borderColor: theme.palette.primary.main,
                            }
                        }}
                    >
                        <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                        <InputBase
                            placeholder="Search tools..."
                            sx={{
                                color: 'text.primary',
                                fontSize: '0.875rem',
                                width: '100%',
                            }}
                        />
                    </Box>

                    {/* Docs Button */}
                    <Button
                        startIcon={<DescriptionIcon />}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                color: 'primary.main',
                                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            }
                        }}
                        href="/docs"
                        target="_blank"
                    >
                        Docs
                    </Button>

                    {/* Theme Toggle */}
                    <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
                        <IconButton
                            onClick={toggleColorMode}
                            sx={{
                                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                border: `1px solid ${theme.palette.divider}`,
                            }}
                        >
                            {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                </>
            }
        />
    );
};
