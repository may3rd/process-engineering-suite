"use client";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useMemo, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        // Sync theme from URL param (from dashboard)
        const themeParam = searchParams.get('theme');
        if (themeParam === 'light' || themeParam === 'dark') {
            setMode(themeParam);
        } else {
            // Check localStorage
            const stored = localStorage.getItem('theme');
            if (stored === 'light' || stored === 'dark') {
                setMode(stored);
            }
        }
    }, [searchParams]);

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: {
                        main: mode === 'dark' ? '#38bdf8' : '#0284c7',
                    },
                    secondary: {
                        main: mode === 'dark' ? '#fbbf24' : '#f59e0b',
                    },
                    background: {
                        default: mode === 'dark' ? '#0f172a' : '#f8fafc',
                        paper: mode === 'dark' ? '#1e293b' : '#ffffff',
                    },
                },
                shape: {
                    borderRadius: 14,
                },
                typography: {
                    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                },
            }),
        [mode]
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
}
