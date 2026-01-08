"use client";

import { Box, Typography, Paper, useTheme } from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import { MarkdownEditor } from "../common/MarkdownEditor";
import { OutputStatusBadge } from "../common/OutputStatusBadge";
import { RunAgentButton } from "../common/RunAgentButton";

export function DesignBasisView() {
    const theme = useTheme();
    const {
        designBasis,
        flowsheetDescription,
        setStepOutput,
        stepStatuses,
        triggerNextStep,
        getOutputMetadata,
        markOutputEdited,
        setOutputStatus,
        setStepStatus,
        setCurrentStep,
        setActiveTab,
    } = useDesignStore();

    const designBasisStatus = getOutputMetadata('designBasis');
    const flowsheetStatus = getOutputMetadata('flowsheetDescription');

    const canRunDesignBasis = true; // Allow running freely
    const canRunFlowsheet = true; // Allow running freely

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Design Basis & Flowsheet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Preliminary design documentation and process flow description
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Design Basis */}
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
                            Design Basis
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {designBasisStatus && <OutputStatusBadge status={designBasisStatus.status} />}
                            <RunAgentButton
                                label={!!designBasis.trim() ? 'Regenerate Basis' : 'Generate Design Basis'}
                                onClick={triggerNextStep}
                                disabled={!canRunDesignBasis}
                                isRerun={!!designBasis.trim()}
                                loading={stepStatuses[5] === 'running'}
                                size="small"
                            />
                        </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <MarkdownEditor
                            value={designBasis}
                            onChange={(val) => {
                                setStepOutput('designBasis', val);
                                markOutputEdited('designBasis');
                            }}
                            minHeight={300}
                        />
                    </Box>
                    {(designBasisStatus?.status === 'needs_review' || designBasisStatus?.status === 'draft') && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <RunAgentButton
                                label="Confirm & Approve"
                                onClick={() => {
                                    setOutputStatus('designBasis', 'approved');
                                    setStepStatus(5, 'complete');
                                    setCurrentStep(6);
                                }}
                                variant="outlined"
                                size="small"
                            />
                        </Box>
                    )}
                </Paper>

                {/* Flowsheet Description */}
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
                            Flowsheet Description
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {flowsheetStatus && <OutputStatusBadge status={flowsheetStatus.status} />}
                            <RunAgentButton
                                label={!!flowsheetDescription.trim() ? 'Regenerate Flowsheet' : 'Generate Flowsheet'}
                                onClick={triggerNextStep}
                                disabled={!canRunFlowsheet}
                                isRerun={!!flowsheetDescription.trim()}
                                loading={stepStatuses[6] === 'running'}
                                size="small"
                            />
                        </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <MarkdownEditor
                            value={flowsheetDescription}
                            onChange={(val) => {
                                setStepOutput('flowsheetDescription', val);
                                markOutputEdited('flowsheetDescription');
                            }}
                            minHeight={300}
                        />
                    </Box>
                    {(flowsheetStatus?.status === 'needs_review' || flowsheetStatus?.status === 'draft') && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <RunAgentButton
                                label="Confirm & Approve"
                                onClick={() => {
                                    setOutputStatus('flowsheetDescription', 'approved');
                                    setStepStatus(6, 'complete');
                                    setCurrentStep(7);
                                    setActiveTab('spreadsheet');
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
