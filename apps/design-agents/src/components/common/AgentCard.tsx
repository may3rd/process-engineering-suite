"use client";

import { Box, Card, CardContent, Typography, LinearProgress, useTheme, alpha } from "@mui/material";
import { StepStatus, AgentStep, AGENT_LABELS } from "@/data/types";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

interface AgentCardProps {
    step: AgentStep;
    index: number;
    status: StepStatus;
    isActive: boolean;
    onClick: () => void;
}

export function AgentCard({ step, index, status, isActive, onClick }: AgentCardProps) {
    const theme = useTheme();

    const getStatusIcon = () => {
        switch (status) {
            case 'complete': return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
            case 'edited': return <EditIcon sx={{ color: 'warning.main', fontSize: 20 }} />;
            case 'outdated': return <WarningIcon sx={{ color: 'error.main', fontSize: 20 }} />;
            case 'running': return <CircularProgressMini />;
            default: return null;
        }
    };

    const getStatusColor = () => {
        if (isActive) return theme.palette.primary.main;
        switch (status) {
            case 'complete': return theme.palette.success.main;
            case 'edited': return theme.palette.warning.main;
            case 'outdated': return theme.palette.error.main;
            default: return theme.palette.text.disabled;
        }
    };

    return (
        <Card
            onClick={onClick}
            sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: isActive
                    ? alpha(theme.palette.primary.main, 0.1)
                    : 'background.paper',
                border: `1px solid ${isActive ? theme.palette.primary.main : theme.palette.divider}`,
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[4]
                }
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: getStatusColor(), fontWeight: 600 }}>
                        STEP {index + 1}
                    </Typography>
                    {getStatusIcon()}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {AGENT_LABELS[step]}
                </Typography>
                {status === 'running' && (
                    <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />
                )}
            </CardContent>
        </Card>
    );
}

function CircularProgressMini() {
    return (
        <Box
            sx={{
                width: 16,
                height: 16,
                border: '2px solid rgba(0,0,0,0.1)',
                borderTop: '2px solid currentColor',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                }
            }}
        />
    );
}
