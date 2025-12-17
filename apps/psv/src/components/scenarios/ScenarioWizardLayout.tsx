import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
    IconButton,
    Alert,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface ScenarioWizardLayoutProps {
    open: boolean;
    onClose: () => void;
    title: string;
    icon?: React.ReactNode;
    activeStep: number;
    steps: string[];
    onBack?: () => void;
    onNext?: () => void;
    onSave?: () => void;
    isLastStep?: boolean;
    saveLabel?: string;
    nextDisabled?: boolean;
    saveDisabled?: boolean;
    validationAlert?: {
        message: string;
        severity?: 'error' | 'warning' | 'info';
    };
    children: React.ReactNode;
}

export function ScenarioWizardLayout({
    open,
    onClose,
    title,
    icon,
    activeStep,
    steps,
    onBack,
    onNext,
    onSave,
    isLastStep = false,
    saveLabel = 'Create Scenario',
    nextDisabled,
    saveDisabled,
    validationAlert,
    children,
}: ScenarioWizardLayoutProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {icon}
                    <Typography variant="h6">{title}</Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ minHeight: 400 }}>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                </Stepper>
                {validationAlert && (
                    <Alert severity={validationAlert.severity ?? 'warning'} sx={{ mb: 2 }}>
                        {validationAlert.message}
                    </Alert>
                )}
                {children}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Box sx={{ flex: 1 }} />
                {activeStep > 0 && <Button onClick={onBack}>Back</Button>}
                {!isLastStep ? (
                    <Button variant="contained" onClick={onNext} disabled={nextDisabled}>Next</Button>
                ) : (
                    <Button variant="contained" onClick={onSave} color="primary" disabled={saveDisabled}>{saveLabel}</Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
