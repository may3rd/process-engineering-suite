"use client";

import { Box, Typography, Card, CardContent, Chip, Paper, useTheme, Radio, RadioGroup, FormControlLabel, Alert } from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import { ResearchConcept, ConceptEvaluation } from "@/data/types";
import { OutputStatusBadge } from "../common/OutputStatusBadge";
import { RunAgentButton } from "../common/RunAgentButton";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useState } from "react";

/**
 * ResearchView component for displaying research concepts and evaluations.
 * Handles innovative and conservative research outputs, concept selection, and error states.
 */
type MaturityColor = 'success' | 'warning' | 'error' | 'default';

export function ResearchView() {
    const theme = useTheme();
    const {
        researchConcepts,
        researchRatingResults,
        selectedConceptName,
        selectedConceptDetails,
        getOutputMetadata,
        stepStatuses,
        triggerNextStep,
        setStepOutput,
    } = useDesignStore();

    const [parseError, setParseError] = useState<string | null>(null);

    const conceptsStatus = getOutputMetadata('researchConcepts');
    const ratingsStatus = getOutputMetadata('researchRatingResults');

    let concepts: ResearchConcept[] = [];
    let evaluations: ConceptEvaluation[] = [];

    try {
        if (researchConcepts) concepts = JSON.parse(researchConcepts);
        if (researchRatingResults) evaluations = JSON.parse(researchRatingResults);
        setParseError(null);
    } catch (e) {
        setParseError('Failed to parse research data. Please check the input.');
        console.error('JSON parse error:', e);
    }

    const canRunInnovative = stepStatuses[1] === 'pending' || stepStatuses[1] === 'edited';
    const canRunConservative = (stepStatuses[2] === 'pending' || stepStatuses[2] === 'edited') && concepts.length > 0;
    const canRunConceptDetailer = (stepStatuses[3] === 'pending' || stepStatuses[3] === 'edited') && !!selectedConceptName;
    const hasEvaluations = evaluations.length > 0;
    const hasConceptDetails = !!selectedConceptDetails;

    // Get the selected concept's evaluation for display
    const selectedEvaluation = evaluations.find(e => e.concept_name === selectedConceptName);

    const handleConceptSelect = (conceptName: string) => {
        setStepOutput('selectedConceptName', conceptName);
    };

    const getMaturityColor = (maturity: string): MaturityColor => {
        switch (maturity) {
            case 'Proven': return 'success';
            case 'Emerging': return 'warning';
            case 'Experimental': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Research & Concept Evaluation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Innovative concepts vs. conservative feasibility analysis
            </Typography>

            {parseError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {parseError}
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Innovative Researcher Output */}
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
                            Innovative Concepts
                        </Typography>
                        {conceptsStatus && <OutputStatusBadge status={conceptsStatus.status} />}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <RunAgentButton
                            label={stepStatuses[1] === 'pending' ? 'Run Innovative Researcher' : 'Re-run Research'}
                            onClick={triggerNextStep}
                            disabled={!canRunInnovative}
                            isRerun={stepStatuses[1] !== 'pending'}
                            loading={stepStatuses[1] === 'running'}
                            size="small"
                        />
                    </Box>
                    {concepts.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            {concepts.map((concept, idx) => (
                                <Card
                                    key={idx}
                                    elevation={0}
                                    sx={{
                                        backgroundColor: theme.palette.mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'rgba(0, 0, 0, 0.02)',
                                        border: `1px solid ${theme.palette.divider}`,
                                    }}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                {concept.name}
                                            </Typography>
                                            <Chip
                                                label={concept.maturity}
                                                size="small"
                                                color={getMaturityColor(concept.maturity)}
                                            />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                            {concept.description}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                            Key Features:
                                        </Typography>
                                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                            {concept.key_features.map((feature, fIdx) => (
                                                <Typography key={fIdx} component="li" variant="caption">
                                                    {feature}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 2 }}>
                            No concepts generated yet...
                        </Typography>
                    )}
                </Paper>

                {/* Conservative Researcher Output */}
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
                            Feasibility Analysis
                        </Typography>
                        {ratingsStatus && <OutputStatusBadge status={ratingsStatus.status} />}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <RunAgentButton
                            label={stepStatuses[2] === 'pending' ? 'Run Feasibility Analysis' : 'Re-analyze Feasibility'}
                            onClick={triggerNextStep}
                            disabled={!canRunConservative}
                            isRerun={stepStatuses[2] !== 'pending'}
                            loading={stepStatuses[2] === 'running'}
                            size="small"
                        />
                    </Box>
                    {evaluations.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            {evaluations.map((evaluation, idx) => (
                                <Card
                                    key={idx}
                                    elevation={0}
                                    sx={{
                                        backgroundColor: theme.palette.mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'rgba(0, 0, 0, 0.02)',
                                        border: `1px solid ${theme.palette.divider}`,
                                    }}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                {evaluation.concept_name}
                                            </Typography>
                                            <Chip
                                                label={`Score: ${evaluation.feasibility_score}/10`}
                                                size="small"
                                                color={evaluation.feasibility_score >= 7 ? 'success' : evaluation.feasibility_score >= 5 ? 'warning' : 'error'}
                                            />
                                        </Box>

                                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                            Risks:
                                        </Typography>
                                        <Box component="ul" sx={{ m: 0, pl: 2, mb: 1.5 }}>
                                            {evaluation.risks.map((risk, rIdx) => (
                                                <Typography key={rIdx} component="li" variant="caption" color="error.main">
                                                    {risk}
                                                </Typography>
                                            ))}
                                        </Box>

                                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                            Recommendations:
                                        </Typography>
                                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                            {evaluation.recommendations.map((rec, recIdx) => (
                                                <Typography key={recIdx} component="li" variant="caption" color="success.main">
                                                    {rec}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 2 }}>
                            No evaluations generated yet...
                        </Typography>
                    )}
                </Paper>

                {/* Concept Selection Section */}
                {hasEvaluations && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(2, 132, 199, 0.1)'
                                : 'rgba(2, 132, 199, 0.05)',
                            backdropFilter: 'blur(4px)',
                            borderRadius: 2,
                            border: `2px solid ${theme.palette.primary.main}40`,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <CheckCircleIcon sx={{ color: theme.palette.primary.main }} />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Select Concept for Design
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Choose the concept to proceed with for the design basis and subsequent engineering steps.
                        </Typography>

                        <RadioGroup
                            value={selectedConceptName}
                            onChange={(e) => handleConceptSelect(e.target.value)}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {evaluations.map((evaluation, idx) => {
                                    const isSelected = selectedConceptName === evaluation.concept_name;
                                    return (
                                        <Paper
                                            key={idx}
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                backgroundColor: isSelected
                                                    ? theme.palette.mode === 'dark'
                                                        ? 'rgba(16, 185, 129, 0.15)'
                                                        : 'rgba(16, 185, 129, 0.1)'
                                                    : theme.palette.mode === 'dark'
                                                        ? 'rgba(255, 255, 255, 0.05)'
                                                        : 'rgba(0, 0, 0, 0.02)',
                                                border: isSelected
                                                    ? `2px solid ${theme.palette.success.main}`
                                                    : `1px solid ${theme.palette.divider}`,
                                                borderRadius: 1.5,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    backgroundColor: theme.palette.mode === 'dark'
                                                        ? 'rgba(255, 255, 255, 0.08)'
                                                        : 'rgba(0, 0, 0, 0.04)',
                                                },
                                            }}
                                            onClick={() => handleConceptSelect(evaluation.concept_name)}
                                        >
                                            <FormControlLabel
                                                value={evaluation.concept_name}
                                                control={<Radio color="success" />}
                                                label={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                                        <Typography sx={{ fontWeight: 600, flex: 1 }}>
                                                            {evaluation.concept_name}
                                                        </Typography>
                                                        <Chip
                                                            label={`Score: ${evaluation.feasibility_score}/10`}
                                                            size="small"
                                                            color={evaluation.feasibility_score >= 7 ? 'success' : evaluation.feasibility_score >= 5 ? 'warning' : 'error'}
                                                        />
                                                    </Box>
                                                }
                                                sx={{ m: 0, width: '100%' }}
                                            />
                                        </Paper>
                                    );
                                })}
                            </Box>
                        </RadioGroup>

                        {selectedConceptName && selectedEvaluation && (
                            <Alert
                                severity="success"
                                sx={{
                                    mt: 3,
                                    backgroundColor: theme.palette.mode === 'dark'
                                        ? 'rgba(16, 185, 129, 0.1)'
                                        : 'rgba(16, 185, 129, 0.05)',
                                }}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Selected: {selectedConceptName}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    Feasibility Score: {selectedEvaluation.feasibility_score}/10 — This concept will be used for the Design Basis and subsequent steps.
                                </Typography>
                            </Alert>
                        )}

                        {/* Concept Detailer Button */}
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <RunAgentButton
                                label={hasConceptDetails ? 'Re-detail Concept' : 'Detail Selected Concept'}
                                onClick={triggerNextStep}
                                disabled={!canRunConceptDetailer}
                                isRerun={hasConceptDetails}
                                loading={stepStatuses[3] === 'running'}
                            />
                        </Box>

                        {hasConceptDetails && (
                            <Paper
                                elevation={0}
                                sx={{
                                    mt: 2,
                                    p: 2,
                                    backgroundColor: theme.palette.mode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.03)'
                                        : 'rgba(0, 0, 0, 0.02)',
                                    borderRadius: 1,
                                    border: `1px solid ${theme.palette.divider}`,
                                }}
                            >
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    Concept Details (Generated)
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                                    {selectedConceptDetails.substring(0, 500)}{selectedConceptDetails.length > 500 ? '...' : ''}
                                </Typography>
                            </Paper>
                        )}
                    </Paper>
                )}
            </Box>
        </Box>
    );
}
