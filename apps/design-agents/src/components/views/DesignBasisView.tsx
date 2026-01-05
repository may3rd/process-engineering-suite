"use client";

import { Box, Typography, Paper, useTheme } from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import { MarkdownEditor } from "../common/MarkdownEditor";

export function DesignBasisView() {
    const theme = useTheme();
    const { designBasis, flowsheetDescription, setStepOutput } = useDesignStore();

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
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Design Basis
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        <MarkdownEditor
                            value={designBasis}
                            onChange={(val) => setStepOutput('designBasis', val)}
                            minHeight={300}
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
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Flowsheet Description
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        <MarkdownEditor
                            value={flowsheetDescription}
                            onChange={(val) => setStepOutput('flowsheetDescription', val)}
                            minHeight={300}
                        />
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
