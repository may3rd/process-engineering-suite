"use client";

import { Box, Typography, Card, CardContent, Chip, Paper, useTheme } from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import { ResearchConcept, ConceptEvaluation } from "@/data/types";

export function ResearchView() {
    const theme = useTheme();
    const { researchConcepts, researchRatingResults } = useDesignStore();

    let concepts: ResearchConcept[] = [];
    let evaluations: ConceptEvaluation[] = [];

    try {
        if (researchConcepts) concepts = JSON.parse(researchConcepts);
        if (researchRatingResults) evaluations = JSON.parse(researchRatingResults);
    } catch (e) {
        // Invalid JSON, show empty
    }

    const getMaturityColor = (maturity: string) => {
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
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Innovative Concepts
                    </Typography>
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
                                                color={getMaturityColor(concept.maturity) as any}
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
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Feasibility Analysis
                    </Typography>
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
            </Box>
        </Box>
    );
}
