"use client";

import { Box, InputBase, Button, useTheme, useMediaQuery, IconButton } from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import HubIcon from '@mui/icons-material/Hub';
import { useColorMode } from "@/contexts/ColorModeContext";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import { useState } from "react";

export const TopToolbar = () => {
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchText, setSearchText] = useState("");

    return (
        <TopFloatingToolbar
            title="E-PT"
            subtitle="process engineering suite"
            icon={<HubIcon />}
            actions={
                <>
                    {/* Search Box */}
                    {(!isMobile || isSearchOpen) && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                                borderRadius: '999px',
                                px: 2,
                                py: 0.5,
                                width: isMobile ? '55vw' : 240,
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
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                sx={{
                                    color: 'text.primary',
                                    fontSize: '0.875rem',
                                    width: '100%',
                                }}
                            />
                            {isMobile && (
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setIsSearchOpen(false);
                                        setSearchText("");
                                    }}
                                    sx={{ ml: 0.5 }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                    )}

                    {isMobile && !isSearchOpen && (
                        <IconButton
                            size="small"
                            onClick={() => setIsSearchOpen(true)}
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: "999px",
                                border: `1px solid ${isDark ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.12)"}`,
                                bgcolor: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.9)",
                            }}
                        >
                            <SearchIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    )}

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
                </>
            }
            onToggleTheme={toggleColorMode}
            isDarkMode={isDark}
        />
    );
};
