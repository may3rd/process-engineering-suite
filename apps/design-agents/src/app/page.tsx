"use client";

import { Box, Container } from "@mui/material";
import { useEffect } from "react";
import { useDesignStore } from "@/store/useDesignStore";
import { mockProject, mockProblemStatement } from "@/data/mockData";
import { AgentStepper } from "@/components/AgentStepper";
import { DesignWorkspace } from "@/components/DesignWorkspace";

export default function DesignAgentsApp() {
    const { project, setProject, setProblemStatement } = useDesignStore();

    // Initialize with mock data on mount
    useEffect(() => {
        if (!project) {
            setProject(mockProject);
            setProblemStatement(mockProblemStatement);
        }
    }, [project, setProject, setProblemStatement]);

    return (
        <Box sx={{ minHeight: 'calc(100vh - 72px)', pb: 4 }}>
            <Container maxWidth="xl" sx={{ pt: 4 }}>
                <AgentStepper />
                <Box sx={{ mt: 4 }}>
                    <DesignWorkspace />
                </Box>
            </Container>
        </Box>
    );
}
