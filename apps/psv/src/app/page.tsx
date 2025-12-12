"use client";

import { Box, Container, CircularProgress } from "@mui/material";
import { useEffect } from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { HierarchyBrowser } from "@/components/HierarchyBrowser";
import { ProtectiveSystemList } from "@/components/ProtectiveSystemList";
import { ProtectiveSystemDetail } from "@/components/ProtectiveSystemDetail";
import { DashboardPage } from "@/components/DashboardPage";
import { AccountSettingsPage } from "@/components/AccountSettingsPage";
import { usePsvStore } from "@/store/usePsvStore";

export default function PsvApp() {
    const { selection, selectedProject, selectedPsv, currentPage, isLoading, initialize } = usePsvStore();

    // Initialize data on mount
    useEffect(() => {
        initialize();
    }, [initialize]);

    // Determine what to render based on selection state
    const renderContent = () => {
        // Check for special pages first
        if (currentPage === 'dashboard') {
            return <DashboardPage />;
        }
        if (currentPage === 'account') {
            return <AccountSettingsPage />;
        }

        // If a PSV is selected, show the detail view
        if (selectedPsv) {
            return <ProtectiveSystemDetail />;
        }

        // If a project is selected, show the protective systems list
        if (selectedProject) {
            return <ProtectiveSystemList />;
        }

        // Otherwise, show the hierarchy browser
        return <HierarchyBrowser />;
    };

    return (
        <Box sx={{ minHeight: '100vh - 72px', pb: 4 }}>
            <Container maxWidth="xl" sx={{ pt: 4 }}>
                {currentPage !== 'dashboard' && currentPage !== 'account' && (
                    <Box className="print-hide" sx={{ mb: 3 }}>
                        <Breadcrumbs />
                    </Box>
                )}

                {isLoading && !selectedProject && !selectedPsv ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    renderContent()
                )}
            </Container>
        </Box>
    );
}
