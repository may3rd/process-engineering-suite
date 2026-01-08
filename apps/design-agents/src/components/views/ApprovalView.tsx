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
        setOutputStatus,
        setStepStatus,
        setCurrentStep,
    } = useDesignStore();

    const safetyStatus = getOutputMetadata('safetyRiskAnalystReport');
    const pmStatus = getOutputMetadata('projectManagerReport');

    const canRunSafety = true; // Allow running freely
    const canRunPM = true; // Allow running freely

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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {safetyStatus && <OutputStatusBadge status={safetyStatus.status} />}
                            <RunAgentButton
                                label={!!safetyRiskAnalystReport.trim() ? 'Re-run Safety Check' : 'Run Safety Analysis'}
                                onClick={triggerNextStep}
                                disabled={!canRunSafety}
                                isRerun={!!safetyRiskAnalystReport.trim()}
                                loading={stepStatuses[10] === 'running'}
                                size="small"
                            />
                        </Box>
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
                    {(safetyStatus?.status === 'needs_review' || safetyStatus?.status === 'draft') && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <RunAgentButton
                                label="Confirm & Approve"
                                onClick={() => {
                                    setOutputStatus('safetyRiskAnalystReport', 'approved');
                                    setStepStatus(10, 'complete');
                                    setCurrentStep(11);
                                }}
                                variant="outlined"
                                size="small"
                            />
                        </Box>
                    )}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {pmStatus && <OutputStatusBadge status={pmStatus.status} />}
                            <RunAgentButton
                                label={!!projectManagerReport.trim() ? 'Regenerate Report' : 'Generate PM Report'}
                                onClick={triggerNextStep}
                                disabled={!canRunPM}
                                isRerun={!!projectManagerReport.trim()}
                                loading={stepStatuses[11] === 'running'}
                                size="small"
                            />
                        </Box>
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
                    {(pmStatus?.status === 'needs_review' || pmStatus?.status === 'draft') && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <RunAgentButton
                                label="Confirm & Approve"
                                onClick={() => {
                                    setOutputStatus('projectManagerReport', 'approved');
                                    setStepStatus(11, 'complete');
                                    // No setCurrentStep(12) as it's the last step
                                }}
                                variant="outlined"
                                size="small"
                            />
                        </Box>
                    )}
                </Paper>
            </Box>
        </Box>
    );
}
