"use client";

import { Box, Typography, Paper, useTheme } from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import { MarkdownEditor } from "../common/MarkdownEditor";
import { OutputStatusBadge } from "../common/OutputStatusBadge";
import { RunAgentButton } from "../common/RunAgentButton";

export function ComponentListView() {
    const theme = useTheme();
    const {
        componentList,
        selectedConceptName,
        setStepOutput,
        stepStatuses,
        triggerNextStep,
        getOutputMetadata,
        markOutputEdited,
    } = useDesignStore();

    const componentStatus = getOutputMetadata('componentList');
    const canRunComponentList = stepStatuses[4] === 'pending' || stepStatuses[4] === 'edited';
    const hasSelectedConcept = !!selectedConceptName;

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Component List
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Key chemical components with formulas and molecular weights
            </Typography>

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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Component Table
                        </Typography>
                        {componentStatus && <OutputStatusBadge status={componentStatus.status} />}
                    </Box>
                    <RunAgentButton
                        label={stepStatuses[4] === 'pending' ? 'Generate Component List' : 'Regenerate List'}
                        onClick={triggerNextStep}
                        disabled={!canRunComponentList || !hasSelectedConcept}
                        isRerun={stepStatuses[4] !== 'pending'}
                        loading={stepStatuses[4] === 'running'}
                        size="small"
                    />
                </Box>

                {!hasSelectedConcept && (
                    <Box
                        sx={{
                            p: 2,
                            mb: 2,
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(245, 158, 11, 0.1)'
                                : 'rgba(245, 158, 11, 0.05)',
                            borderRadius: 1,
                            border: `1px solid ${theme.palette.warning.main}40`,
                        }}
                    >
                        <Typography variant="body2" color="warning.main">
                            Please select a concept in the Research tab before generating the component list.
                        </Typography>
                    </Box>
                )}

                {selectedConceptName && (
                    <Box
                        sx={{
                            p: 2,
                            mb: 2,
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(16, 185, 129, 0.1)'
                                : 'rgba(16, 185, 129, 0.05)',
                            borderRadius: 1,
                            border: `1px solid ${theme.palette.success.main}40`,
                        }}
                    >
                        <Typography variant="body2" color="success.main">
                            Selected Concept: <strong>{selectedConceptName}</strong>
                        </Typography>
                    </Box>
                )}

                <Box sx={{ mt: 2 }}>
                    <MarkdownEditor
                        value={componentList}
                        onChange={(val) => {
                            setStepOutput('componentList', val);
                            markOutputEdited('componentList');
                        }}
                        minHeight={400}
                    />
                </Box>
            </Paper>
        </Box>
    );
}
