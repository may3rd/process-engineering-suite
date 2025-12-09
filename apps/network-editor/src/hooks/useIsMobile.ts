"use client";

import { useTheme, useMediaQuery } from "@mui/material";

/**
 * Custom hook to detect mobile/tablet/desktop breakpoints.
 * 
 * Breakpoints (MUI defaults):
 * - Mobile: < 600px (xs)
 * - Tablet: 600-900px (sm)
 * - Desktop: > 900px (md+)
 */
export function useIsMobile() {
    const theme = useTheme();

    // Mobile: screens smaller than 'sm' breakpoint (600px)
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Tablet: screens between 'sm' and 'md' breakpoints (600-900px)
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

    // Desktop: screens larger than 'md' breakpoint (900px)
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    return {
        isMobile,
        isTablet,
        isDesktop,
        // Convenience: true if mobile OR tablet (i.e., not desktop)
        isMobileOrTablet: isMobile || isTablet,
    };
}
