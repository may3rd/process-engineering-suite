"use client";

import { Box, Typography, Paper, Chip, useTheme } from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import { MarkdownEditor } from "../common/MarkdownEditor";

export function ApprovalView() {
    const theme = useTheme();
    const {
        safetyRiskAnalystReport,
        projectManagerReport,
        projectApproval,
        setStepOutput
    } = useDesignStore();

    const getApprovalColor = () => {
        if (projectApproval.toLowerCase().includes('approved')) return 'success';
        if (projectApproval.toLowerCase().includes('conditional')) return 'warning';
        if (projectApproval.toLowerCase().includes('rejected')) return 'error';
        return 'default';
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Final Review & Approval
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Safety analysis and project manager approval
            </Typography>

            {projectApproval && (
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Project Status:
                    </Typography>
                    <Chip
                        label={projectApproval}
                        color={getApprovalColor() as any}
                        sx={{ fontWeight: 600 }}
                    />
                </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Safety & Risk Analysis */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(0, 0, 0, 0.2)'
                            : 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(4px)',
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Safety & Risk Analysis
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        <MarkdownEditor
                            value={safetyRiskAnalystReport}
                            onChange={(val) => setStepOutput('safetyRiskAnalystReport', val)}
                            minHeight={300}
                        />
                    </Box>
                </Paper>

                {/* Project Manager Report */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(0, 0, 0, 0.2)'
                            : 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(4px)',
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Project Manager Report
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        <MarkdownEditor
                            value={projectManagerReport}
                            onChange={(val) => setStepOutput('projectManagerReport', val)}
                            minHeight={300}
                        />
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
