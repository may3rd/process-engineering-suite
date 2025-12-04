"use client";

import { Assignment, Timeline } from "@mui/icons-material";
import { Button, ButtonGroup, Tooltip, IconButton, useTheme } from "@mui/material";
import { useState } from "react";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import { useColorMode } from "@/contexts/ColorModeContext";
import { NetworkState, ProjectDetails } from "@/lib/types";
import { ProjectDetailsDialog } from "./ProjectDetailsDialog";

type Props = {
    network: NetworkState;
    onNetworkChange: (updatedNetwork: NetworkState) => void;
    onReset: () => void;
    onImportExcel: () => void;
};

export function Header({
    network,
    onNetworkChange,
    onReset,
    onImportExcel,
}: Props) {
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const isDark = theme.palette.mode === 'dark';
    const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);

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
                subtitle="Sketch networks, edit properties, print summary table and export network as PNG."
                icon={<Timeline />}
                actions={
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
