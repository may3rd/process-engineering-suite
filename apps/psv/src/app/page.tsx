"use client";

import { Box, Container, CircularProgress } from "@mui/material";
import { useEffect } from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { HierarchyBrowser } from "@/components/HierarchyBrowser";
import { ProtectiveSystemList } from "@/components/ProtectiveSystemList";
import { ProtectiveSystemDetail } from "@/components/ProtectiveSystemDetail";
import { DashboardPage } from "@/components/DashboardPage";
import { AccountSettingsPage } from "@/components/AccountSettingsPage";
import { CaseConsiderationPage } from "@/components/CaseConsiderationPage";
import { usePsvStore } from "@/store/usePsvStore";

export default function PsvApp() {
    const { selection, selectedProject, selectedPsv, currentPage, isLoading, initialize } = usePsvStore();

    // Initialize data on mount
    useEffect(() => {
        initialize();
    }, [initialize]);


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
                    <>
                        {currentPage === 'dashboard' && <DashboardPage key="dashboard" />}
                        {currentPage === 'account' && <AccountSettingsPage key="account" />}
                        {currentPage === 'scenario_consideration' && <CaseConsiderationPage key="scenario" />}
                        {currentPage !== 'dashboard' && currentPage !== 'account' && currentPage !== 'scenario_consideration' && selectedPsv && (
                            <ProtectiveSystemDetail key={`psv-${selectedPsv.id}`} />
                        )}
                        {currentPage !== 'dashboard' && currentPage !== 'account' && currentPage !== 'scenario_consideration' && !selectedPsv && selectedProject && (
                            <ProtectiveSystemList key={`project-${selectedProject.id}`} />
                        )}
                        {currentPage !== 'dashboard' && currentPage !== 'account' && currentPage !== 'scenario_consideration' && !selectedPsv && !selectedProject && (
                            <HierarchyBrowser key={`hierarchy-${selection.customerId ?? 'root'}-${selection.plantId ?? ''}-${selection.unitId ?? ''}-${selection.areaId ?? ''}`} />
                        )}
                    </>
                )}
            </Container>
        </Box>
    );
}
