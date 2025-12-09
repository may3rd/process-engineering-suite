"use client";

import { AppBar, Toolbar, Typography, IconButton, Box, TextField, InputAdornment, useTheme } from "@mui/material";
import { DarkMode, LightMode, Search, ArrowBack } from "@mui/icons-material";
import { useColorMode } from "@/contexts/ColorModeContext";
import { useRouter } from "next/navigation";

interface TopToolbarProps {
    title?: string;
    showBack?: boolean;
    onBack?: () => void;
}

export function TopToolbar({ title = "PSV Sizing", showBack = false, onBack }: TopToolbarProps) {
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const router = useRouter();
    const isDark = theme.palette.mode === 'dark';

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                backdropFilter: 'blur(12px)',
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 0.8)',
                borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
            }}
        >
            <Toolbar sx={{ gap: 2 }}>
                {showBack && (
                    <IconButton
                        edge="start"
                        onClick={handleBack}
                        sx={{ color: 'text.primary' }}
                    >
                        <ArrowBack />
                    </IconButton>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1rem',
                        }}
                    >
                        PSV
                    </Box>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            display: { xs: 'none', sm: 'block' },
                        }}
                    >
                        {title}
                    </Typography>
                </Box>

                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', maxWidth: 400, mx: 'auto' }}>
                    <TextField
                        size="small"
                        placeholder="Search protective systems..."
                        fullWidth
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                            },
                        }}
                    />
                </Box>

                <IconButton onClick={toggleColorMode} sx={{ color: 'text.primary' }}>
                    {isDark ? <LightMode /> : <DarkMode />}
                </IconButton>
            </Toolbar>
        </AppBar>
    );
}
