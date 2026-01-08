"use client";

import { Box, Stepper, Step, StepLabel, StepButton, useTheme, alpha } from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import { AGENT_STEPS, AGENT_LABELS } from "@/data/types";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import CircularProgress from '@mui/material/CircularProgress';

export function AgentStepper() {
    const theme = useTheme();
    const { currentStep, stepStatuses, setCurrentStep } = useDesignStore();

    const getStepStatusLabel = (status: string | undefined) => {
        switch (status) {
            case 'complete':
                return 'Completed';
            case 'running':
                return 'In progress';
            case 'needs_review':
                return 'Needs review';
            case 'edited':
                return 'Edited - needs review';
            case 'outdated':
                return 'Outdated - needs regeneration';
            default:
                return 'Pending';
        }
    };

    const getStepIcon = (stepIndex: number) => {
        const status = stepStatuses[stepIndex];
        const isCurrentStep = currentStep === stepIndex;

        if (status === 'complete') {
            return <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />;
        }
        if (status === 'running') {
            return <CircularProgress size={20} sx={{ color: theme.palette.primary.main }} />;
        }
        if (status === 'needs_review') {
            return <PriorityHighIcon sx={{ color: theme.palette.warning.main, fontSize: 22 }} />;
        }
        if (isCurrentStep) {
            return <PlayArrowIcon sx={{ color: theme.palette.success.main, fontSize: 22 }} />;
        }
        if (status === 'edited') {
            return <EditIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />;
        }
        if (status === 'outdated') {
            return <WarningIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />;
        }
        return null;
    };

    return (
        <Box
            sx={{
                p: 3,
                borderRadius: '20px',
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(30, 41, 59, 0.7)'
                    : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.palette.mode === 'dark'
                    ? '-10px 0 40px rgba(0,0,0,0.7)'
                    : '-10px 0 40px rgba(0,0,0,0.2)',
            }}
        >
            <Stepper activeStep={currentStep} alternativeLabel>
                {AGENT_STEPS.map((step, index) => {
                    const status = stepStatuses[index];
                    const isClickable = status !== 'pending';

                    return (
                        <Step key={step} completed={status === 'complete'}>
                            <StepButton
                                onClick={() => isClickable && setCurrentStep(index)}
                                disabled={!isClickable}
                                aria-label={`Step ${index + 1}: ${AGENT_LABELS[step]}, ${getStepStatusLabel(status)}`}
                                aria-current={currentStep === index ? 'step' : undefined}
                                sx={{
                                    '& .MuiStepLabel-label': {
                                        fontSize: '0.75rem',
                                        mt: 1,
                                    },
                                }}
                            >
                                <StepLabel
                                    StepIconComponent={() => (
                                        <Box
                                            component="span"
                                            aria-hidden="true"
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: currentStep === index
                                                    ? alpha(theme.palette.primary.main, 0.2)
                                                    : 'transparent',
                                                border: currentStep === index
                                                    ? `2px solid ${theme.palette.primary.main}`
                                                    : `2px solid ${theme.palette.divider}`,
                                            }}
                                        >
                                            {getStepIcon(index) || (
                                                <Box
                                                    sx={{
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: '50%',
                                                        backgroundColor: theme.palette.divider,
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    )}
                                >
                                    {AGENT_LABELS[step]}
                                </StepLabel>
                            </StepButton>
                        </Step>
                    );
                })}
            </Stepper>
        </Box>
    );
}
