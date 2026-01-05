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
    } = useDesignStore();

    const designBasisStatus = getOutputMetadata('designBasis');
    const flowsheetStatus = getOutputMetadata('flowsheetDescription');

    const canRunDesignBasis = stepStatuses[5] === 'pending' || stepStatuses[5] === 'edited';
    const canRunFlowsheet = stepStatuses[6] === 'pending' || stepStatuses[6] === 'edited';

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
                        {designBasisStatus && <OutputStatusBadge status={designBasisStatus.status} />}
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
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <RunAgentButton
                            label={stepStatuses[5] === 'pending' ? 'Generate Design Basis' : 'Regenerate Basis'}
                            onClick={triggerNextStep}
                            disabled={!canRunDesignBasis}
                            isRerun={stepStatuses[5] !== 'pending'}
                            loading={stepStatuses[5] === 'running'}
                        />
                    </Box>
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
                        {flowsheetStatus && <OutputStatusBadge status={flowsheetStatus.status} />}
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
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <RunAgentButton
                            label={stepStatuses[6] === 'pending' ? 'Generate Flowsheet' : 'Regenerate Flowsheet'}
                            onClick={triggerNextStep}
                            disabled={!canRunFlowsheet}
                            isRerun={stepStatuses[6] !== 'pending'}
                            loading={stepStatuses[6] === 'running'}
                        />
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
