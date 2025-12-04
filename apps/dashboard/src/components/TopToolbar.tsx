"use client";

import { Box, Typography, IconButton, InputBase, Stack, Button, useTheme, Tooltip } from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import HubIcon from '@mui/icons-material/Hub';
import { useColorMode } from "@/contexts/ColorModeContext";

export const TopToolbar = () => {
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const isDark = theme.palette.mode === 'dark';

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
                    <HubIcon />
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        E-PT
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1 }}>
                        process engineering suite
                    </Typography>
                </Box>
            </Stack>

            {/* Right Side: Search, Docs, Theme Toggle */}
            <Stack direction="row" alignItems="center" spacing={2}>
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
            </Stack>
        </Box>
    );
};
