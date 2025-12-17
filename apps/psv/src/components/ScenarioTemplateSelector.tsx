"use client";

import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Button,
    Box,
    Typography,
    Grid,
    Paper,
    useTheme,
    alpha,
} from '@mui/material';
import {
    LocalFireDepartment,
    Block,
    Settings,
    Edit,
    Close,
    BrokenImage,
} from '@mui/icons-material';

interface ScenarioTemplateSelectorProps {
    open: boolean;
    onClose: () => void;
    onSelectTemplate: (template: 'fire_case' | 'blocked_outlet' | 'control_valve_failure' | 'tube_rupture' | 'generic') => void;
}

export function ScenarioTemplateSelector({
    open,
    onClose,
    onSelectTemplate,
}: ScenarioTemplateSelectorProps) {
    const theme = useTheme();

    const TEMPLATES: {
        id: 'fire_case' | 'blocked_outlet' | 'control_valve_failure' | 'tube_rupture' | 'generic';
        title: string;
        description: string;
        icon: React.ReactNode;
        color: string;
        recommended?: boolean;
    }[] = [
            {
                id: 'fire_case',
                title: 'Fire Case',
                description: 'Determine relief load due to external fire exposure per API-521.',
                icon: <LocalFireDepartment fontSize="large" color="error" />,
                color: theme.palette.error.main,
                recommended: true,
            },
            {
                id: 'blocked_outlet',
                title: 'Blocked Outlet',
                description: 'Analyze blocked liquid or vapor outlet scenarios.',
                icon: <Block fontSize="large" color="warning" />,
                color: theme.palette.warning.main,
            },
            {
                id: 'control_valve_failure',
                title: 'Control Valve Failure',
                description: 'Failure of an upstream control valve causing overpressure.',
                icon: <Settings fontSize="large" color="info" />,
                color: theme.palette.info.main,
            },
            {
                id: 'tube_rupture',
                title: 'Tube Rupture',
                description: 'Heat exchanger tube rupture (10/13 Rule check).',
                icon: <BrokenImage fontSize="large" color="error" />,
                color: theme.palette.error.dark,
            },
            {
                id: 'generic',
                title: 'Generic / Other',
                description: 'Manually define any other scenario type.',
                icon: <Edit fontSize="large" color="action" />,
                color: theme.palette.text.secondary,
            },
        ];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: alpha(theme.palette.background.paper, 0.95),
                    backdropFilter: 'blur(10px)',
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Typography variant="h6" component="div" fontWeight={600}>
                    Select Scenario Template
                </Typography>
                <Button onClick={onClose} sx={{ minWidth: 0, p: 0.5 }}>
                    <Close />
                </Button>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 4 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
                    Choose a template to launch a guided specialized calculator, or select Generic to manually enter data.
                </Typography>

                <Grid container spacing={3}>
                    {TEMPLATES.map((template) => (
                        <Grid key={template.id} size={{ xs: 12, sm: 6 }}>
                            <Paper
                                variant="outlined"
                                onClick={() => onSelectTemplate(template.id)}
                                sx={{
                                    p: 3,
                                    height: '100%',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: `1px solid ${alpha(template.color, 0.2)}`,
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: 4,
                                        borderColor: template.color,
                                        bgcolor: alpha(template.color, 0.04),
                                    },
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    gap: 2,
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {template.recommended && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            bgcolor: alpha(template.color, 0.1),
                                            color: template.color,
                                            px: 1,
                                            py: 0.5,
                                            borderRadius: 1,
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        POPULAR
                                    </Box>
                                )}

                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: '50%',
                                        bgcolor: alpha(template.color, 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {template.icon}
                                </Box>

                                <Box>
                                    <Typography variant="h6" gutterBottom fontWeight={600}>
                                        {template.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {template.description}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
        </Dialog>
    );
}
