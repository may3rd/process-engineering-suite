"use client";

import { Box, Container } from "@mui/material";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { HierarchyBrowser } from "@/components/HierarchyBrowser";
import { ProtectiveSystemList } from "@/components/ProtectiveSystemList";
import { ProtectiveSystemDetail } from "@/components/ProtectiveSystemDetail";
import { usePsvStore } from "@/store/usePsvStore";

export default function PsvApp() {
    const { selection, selectedProject, selectedPsv } = usePsvStore();

    // Determine what to render based on selection state
    const renderContent = () => {
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
        <Box sx={{ minHeight: '100vh - 72', pb: 4 }}>
            <Container maxWidth="xl" sx={{ pt: 4 }}>
                <Box className="print-hide" sx={{ mb: 3 }}>
                    <Breadcrumbs />
                </Box>

                {renderContent()}
            </Container>
        </Box>
    );
}
