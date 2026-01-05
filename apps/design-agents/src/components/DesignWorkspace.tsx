"use client";

import { Box, Tabs, Tab, useTheme } from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import { RequirementsView } from "./views/RequirementsView";
import { ResearchView } from "./views/ResearchView";
import { ComponentListView } from "./views/ComponentListView";
import { DesignBasisView } from "./views/DesignBasisView";
import { SpreadsheetView } from "./views/SpreadsheetView";
import { ApprovalView } from "./views/ApprovalView";
import { LLMSettingsView } from "./views/LLMSettingsView";
import { StorageView } from "./views/StorageView";
import { ExportView } from "./views/ExportView";

type ViewTab = 'requirements' | 'research' | 'components' | 'design' | 'spreadsheet' | 'approval' | 'settings' | 'storage' | 'export';

// Spacer component that consumes MUI Tabs injected props to avoid console warnings
const TabSpacer = () => <Box sx={{ flexGrow: 1 }} />;

export function DesignWorkspace() {
    const theme = useTheme();
    const { activeTab, setActiveTab } = useDesignStore();

    return (
        <Box
            sx={{
                borderRadius: '20px',
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(30, 41, 59, 0.7)'
                    : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px)',
                border: theme.palette.mode === 'dark'
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: theme.palette.mode === 'dark'
                    ? '-10px 0 40px rgba(0,0,0,0.7)'
                    : '-10px 0 40px rgba(0,0,0,0.2)',
                overflow: 'hidden',
            }}
        >
            <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    px: 2,
                    '& .MuiTab-root': {
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                    },
                }}
            >
                <Tab label="Requirements" value="requirements" />
                <Tab label="Research" value="research" />
                <Tab label="Components" value="components" />
                <Tab label="Design Basis" value="design" />
                <Tab label="Equipment & Streams" value="spreadsheet" />
                <Tab label="Approval" value="approval" />
                <TabSpacer />
                <Tab label="LLM Settings" value="settings" />
                <Tab label="Storage" value="storage" />
                <Tab label="Export" value="export" />
            </Tabs>

            <Box sx={{ p: 3 }}>
                {activeTab === 'requirements' && <RequirementsView />}
                {activeTab === 'research' && <ResearchView />}
                {activeTab === 'components' && <ComponentListView />}
                {activeTab === 'design' && <DesignBasisView />}
                {activeTab === 'spreadsheet' && <SpreadsheetView />}
                {activeTab === 'approval' && <ApprovalView />}
                {activeTab === 'settings' && <LLMSettingsView />}
                {activeTab === 'storage' && <StorageView />}
                {activeTab === 'export' && <ExportView />}
            </Box>
        </Box>
    );
}
