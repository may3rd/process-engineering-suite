"use client";

import { Assignment, Timeline, MoreVert as MoreVertIcon, FileUpload as ImportIcon, Refresh as RefreshIcon, ArrowBack } from "@mui/icons-material";
import { Button, ButtonGroup, Tooltip, IconButton, useTheme, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { useState } from "react";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import { useColorMode } from "@/contexts/ColorModeContext";
import { NetworkState, ProjectDetails } from "@/lib/types";
import { ProjectDetailsDialog } from "./ProjectDetailsDialog";
import { useIsMobile } from "@/hooks/useIsMobile";

type Props = {
    network: NetworkState;
    onNetworkChange: (updatedNetwork: NetworkState) => void;
    onReset: () => void;
    onImportExcel: () => void;
};

export function TopToolbar({
    network,
    onNetworkChange,
    onReset,
    onImportExcel,
}: Props) {
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const isDark = theme.palette.mode === 'dark';
    const { isMobile } = useIsMobile();
    const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
    const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);

    const handleSaveProjectDetails = (details: ProjectDetails) => {
        onNetworkChange({
            ...network,
            projectDetails: details
        });
    };

    return (
        <>
            <TopFloatingToolbar
                title="Pipeline Network Builder"
                subtitle={isMobile ? undefined : "Sketch networks, edit properties, print summary table and export network as PNG."}
                leadingAction={
                    <Tooltip title="Back to Dashboard">
                        <IconButton
                            onClick={() => window.location.href = '/'}
                            size="small"
                            sx={{
                                color: 'text.primary',
                                '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                            }}
                        >
                            <ArrowBack />
                        </IconButton>
                    </Tooltip>
                }
                icon={<Timeline />}
                actions={
                    isMobile ? (
                        // Mobile: Single More button
                        <>
                            <Tooltip title="More Actions">
                                <IconButton onClick={(e) => setMoreMenuAnchor(e.currentTarget)}>
                                    <MoreVertIcon />
                                </IconButton>
                            </Tooltip>
                            <Menu
                                anchorEl={moreMenuAnchor}
                                open={Boolean(moreMenuAnchor)}
                                onClose={() => setMoreMenuAnchor(null)}
                            >
                                <MenuItem onClick={() => { onReset(); setMoreMenuAnchor(null); }}>
                                    <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Load Example</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => { setProjectDetailsOpen(true); setMoreMenuAnchor(null); }}>
                                    <ListItemIcon><Assignment fontSize="small" /></ListItemIcon>
                                    <ListItemText>Project Details</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => { onImportExcel(); setMoreMenuAnchor(null); }}>
                                    <ListItemIcon><ImportIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Import Excel</ListItemText>
                                </MenuItem>
                            </Menu>
                        </>
                    ) : (
                        // Desktop: Full button group
                        <>
                            <ButtonGroup variant="outlined">
                                <Tooltip title="Load example network">
                                    <Button onClick={onReset} color="warning">
                                        Load Example
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Edit Project Details">
                                    <Button onClick={() => setProjectDetailsOpen(true)} startIcon={<Assignment />}>
                                        Project Details
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Import network from Excel">
                                    <Button onClick={onImportExcel} color="success">
                                        Import Excel
                                    </Button>
                                </Tooltip>
                            </ButtonGroup>
                        </>
                    )
                }
                onToggleTheme={toggleColorMode}
                isDarkMode={isDark}
            />

            <ProjectDetailsDialog
                open={projectDetailsOpen}
                onClose={() => setProjectDetailsOpen(false)}
                initialDetails={network.projectDetails}
                onSave={handleSaveProjectDetails}
            />
        </>
    );
}
