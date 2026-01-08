"use client";

import { useRef, useState } from "react";
import {
    Box,
    Typography,
    Button,
    Paper,
    useTheme,
    Grid,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Alert,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DescriptionIcon from '@mui/icons-material/Description';

export function StorageView() {
    const theme = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });
    const [confirmStartOver, setConfirmStartOver] = useState(false);

    const {
        project,
        problemStatement,
        processRequirements,
        researchConcepts,
        researchRatingResults,
        selectedConceptName,
        selectedConceptDetails,
        selectedConceptEvaluation,
        componentList,
        designBasis,
        flowsheetDescription,
        equipmentListTemplate,
        equipmentListResults,
        streamListTemplate,
        streamListResults,
        safetyRiskAnalystReport,
        projectManagerReport,
        projectApproval,
        currentStep,
        stepStatuses,
        outputStatuses,
        resetProject,
        setStepOutput,
        setProject,
        setCurrentStep,
        setStepStatus,
        startOver,
    } = useDesignStore();

    const handleExportJSON = () => {
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            project,
            problemStatement,
            processRequirements,
            researchConcepts,
            researchRatingResults,
            selectedConceptName,
            selectedConceptDetails,
            selectedConceptEvaluation,
            componentList,
            designBasis,
            flowsheetDescription,
            equipmentListTemplate,
            equipmentListResults,
            streamListTemplate,
            streamListResults,
            safetyRiskAnalystReport,
            projectManagerReport,
            projectApproval,
            currentStep,
            stepStatuses,
            outputStatuses,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project?.name?.replace(/\s+/g, '_') || 'design-project'}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSnackbar({ open: true, message: 'Project exported successfully!', severity: 'success' });
    };

    const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);

                // Validate file format
                if (!data.version || !data.project) {
                    throw new Error('Invalid project file format');
                }

                // Restore state
                if (data.project) setProject(data.project);
                if (data.problemStatement) setStepOutput('problemStatement', data.problemStatement);
                if (data.processRequirements) setStepOutput('processRequirements', data.processRequirements);
                if (data.researchConcepts) setStepOutput('researchConcepts', data.researchConcepts);
                if (data.researchRatingResults) setStepOutput('researchRatingResults', data.researchRatingResults);
                if (data.selectedConceptName) setStepOutput('selectedConceptName', data.selectedConceptName);
                if (data.selectedConceptDetails) setStepOutput('selectedConceptDetails', data.selectedConceptDetails);
                if (data.selectedConceptEvaluation) setStepOutput('selectedConceptEvaluation', data.selectedConceptEvaluation);
                if (data.componentList) setStepOutput('componentList', data.componentList);
                if (data.designBasis) setStepOutput('designBasis', data.designBasis);
                if (data.flowsheetDescription) setStepOutput('flowsheetDescription', data.flowsheetDescription);
                if (data.equipmentListTemplate) setStepOutput('equipmentListTemplate', data.equipmentListTemplate);
                if (data.equipmentListResults) setStepOutput('equipmentListResults', data.equipmentListResults);
                if (data.streamListTemplate) setStepOutput('streamListTemplate', data.streamListTemplate);
                if (data.streamListResults) setStepOutput('streamListResults', data.streamListResults);
                if (data.safetyRiskAnalystReport) setStepOutput('safetyRiskAnalystReport', data.safetyRiskAnalystReport);
                if (data.projectManagerReport) setStepOutput('projectManagerReport', data.projectManagerReport);
                if (data.projectApproval) setStepOutput('projectApproval', data.projectApproval);
                if (data.currentStep !== undefined) setCurrentStep(data.currentStep);

                // Restore step statuses
                if (data.stepStatuses) {
                    Object.entries(data.stepStatuses).forEach(([step, status]) => {
                        setStepStatus(Number(step), status as any);
                    });
                }

                setSnackbar({ open: true, message: 'Project imported successfully!', severity: 'success' });
            } catch (error) {
                console.error('Import error:', error);
                setSnackbar({ open: true, message: 'Failed to import project. Invalid file format.', severity: 'error' });
            }
        };
        reader.readAsText(file);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Save & Load Projects
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your project is automatically saved to browser storage.
            </Typography>

            <Alert severity="info" sx={{ mb: 4 }}>
                Projects are automatically persisted to localStorage. Use Export/Import to transfer between devices.
            </Alert>

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 7 }}>
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
                            Current Project
                        </Typography>
                        <List>
                            <ListItem>
                                <ListItemIcon>
                                    <DescriptionIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={project?.name || 'Untitled Project'}
                                    secondary={`Last modified: ${project?.lastModified ? new Date(project.lastModified).toLocaleString() : 'Just now'} • Step ${currentStep + 1}/12`}
                                />
                            </ListItem>
                        </List>

                        <Box sx={{ mt: 2, p: 2, backgroundColor: theme.palette.action.hover, borderRadius: 1 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Project Summary
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                • Problem: {problemStatement ? `${problemStatement.substring(0, 100)}...` : 'Not defined'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                • Selected Concept: {selectedConceptName || 'None selected'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                • Equipment Items: {equipmentListResults ? JSON.parse(equipmentListResults).length : 0}
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            onChange={handleImportJSON}
                            style={{ display: 'none' }}
                        />
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<FileDownloadIcon />}
                            onClick={handleExportJSON}
                            fullWidth
                        >
                            Export as JSON
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<FileUploadIcon />}
                            onClick={() => fileInputRef.current?.click()}
                            fullWidth
                        >
                            Import from JSON
                        </Button>
                        <Button
                            variant="contained"
                            color="warning"
                            size="large"
                            startIcon={<RestartAltIcon />}
                            onClick={() => setConfirmStartOver(true)}
                            fullWidth
                        >
                            Start Over
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            size="large"
                            startIcon={<DeleteIcon />}
                            onClick={resetProject}
                            fullWidth
                        >
                            Reset to Mock Data
                        </Button>
                    </Box>
                </Grid>
            </Grid>

            {/* Start Over Confirmation Dialog */}
            <Dialog
                open={confirmStartOver}
                onClose={() => setConfirmStartOver(false)}
                PaperProps={{
                    sx: {
                        backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(30, 41, 59, 0.95)'
                            : 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                    }
                }}
            >
                <DialogTitle>Start Over?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will clear all your work including:
                    </DialogContentText>
                    <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                        <li>Problem statement</li>
                        <li>All generated outputs (requirements, research, design basis, etc.)</li>
                        <li>Equipment and stream lists</li>
                        <li>Approval reports</li>
                    </Box>
                    <DialogContentText sx={{ mt: 2, fontWeight: 500 }}>
                        Your LLM settings will be preserved. This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmStartOver(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            startOver();
                            setConfirmStartOver(false);
                            setSnackbar({ open: true, message: 'Project cleared. Ready to start fresh!', severity: 'success' });
                        }}
                        color="warning"
                        variant="contained"
                    >
                        Start Over
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
