"use client";

import { Box, Typography, Paper, Chip, useTheme } from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import { MarkdownEditor } from "../common/MarkdownEditor";
import { OutputStatusBadge } from "../common/OutputStatusBadge";
import { RunAgentButton } from "../common/RunAgentButton";

export function ApprovalView() {
    const theme = useTheme();
    const {
        safetyRiskAnalystReport,
        projectManagerReport,
        projectApproval,
        setStepOutput,
        stepStatuses,
        triggerNextStep,
        getOutputMetadata,
        markOutputEdited,
    } = useDesignStore();

    const safetyStatus = getOutputMetadata('safetyRiskAnalystReport');
    const pmStatus = getOutputMetadata('projectManagerReport');

    const canRunSafety = stepStatuses[10] === 'pending' || stepStatuses[10] === 'edited';
    const canRunPM = stepStatuses[11] === 'pending' || stepStatuses[11] === 'edited';

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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Safety & Risk Analysis
                        </Typography>
                        {safetyStatus && <OutputStatusBadge status={safetyStatus.status} />}
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <MarkdownEditor
                            value={safetyRiskAnalystReport}
                            onChange={(val) => {
                                setStepOutput('safetyRiskAnalystReport', val);
                                markOutputEdited('safetyRiskAnalystReport');
                            }}
                            minHeight={300}
                        />
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <RunAgentButton
                            label={stepStatuses[10] === 'pending' ? 'Run Safety Analysis' : 'Re-run Safety Check'}
                            onClick={triggerNextStep}
                            disabled={!canRunSafety}
                            isRerun={stepStatuses[10] !== 'pending'}
                            loading={stepStatuses[10] === 'running'}
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Project Manager Report
                        </Typography>
                        {pmStatus && <OutputStatusBadge status={pmStatus.status} />}
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <MarkdownEditor
                            value={projectManagerReport}
                            onChange={(val) => {
                                setStepOutput('projectManagerReport', val);
                                markOutputEdited('projectManagerReport');
                            }}
                            minHeight={300}
                        />
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <RunAgentButton
                            label={stepStatuses[11] === 'pending' ? 'Generate PM Report' : 'Regenerate Report'}
                            onClick={triggerNextStep}
                            disabled={!canRunPM}
                            isRerun={stepStatuses[11] !== 'pending'}
                            loading={stepStatuses[11] === 'running'}
                        />
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
