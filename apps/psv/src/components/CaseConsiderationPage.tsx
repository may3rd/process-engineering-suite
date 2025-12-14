"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Button,
    Paper,
    useTheme,
    IconButton,
    Tooltip,
} from "@mui/material";
import {
    ArrowBack,
    Save,
    Close,
} from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";
import { MarkdownEditor } from "@/components/shared/MarkdownEditor";
import { useAuthStore } from "@/store/useAuthStore";

export function CaseConsiderationPage() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const canEdit = useAuthStore((state) => state.canEdit());

    const {
        editingScenarioId,
        scenarioList,
        selectedPsv,
        updateScenario,
        setCurrentPage,
    } = usePsvStore();

    const scenario = scenarioList.find((s) => s.id === editingScenarioId);
    const [content, setContent] = useState(scenario?.caseConsideration || "");
    const [hasChanges, setHasChanges] = useState(false);

    // Sync content when scenario changes
    useEffect(() => {
        if (scenario) {
            setContent(scenario.caseConsideration || "");
            setHasChanges(false);
        }
    }, [scenario]);

    const handleContentChange = (value: string) => {
        setContent(value);
        setHasChanges(value !== (scenario?.caseConsideration || ""));
    };

    const handleSave = async () => {
        if (!scenario) return;
        console.log('[CaseConsiderationPage] Saving caseConsideration:', content.substring(0, 50) + '...');
        try {
            await updateScenario({
                ...scenario,
                caseConsideration: content,
                updatedAt: new Date().toISOString(),
            });
            console.log('[CaseConsiderationPage] Save successful');
            setHasChanges(false);
        } catch (error) {
            console.error('[CaseConsiderationPage] Save failed:', error);
        }
    };

    const handleBack = () => {
        if (hasChanges) {
            const confirmLeave = window.confirm(
                "You have unsaved changes. Do you want to save before leaving?"
            );
            if (confirmLeave) {
                handleSave();
            }
        }
        // Navigate back and clear editing state
        usePsvStore.setState({
            currentPage: null,
            editingScenarioId: null
        });
    };

    const getCauseLabel = (cause: string) => {
        return cause.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    };

    if (!scenario || !selectedPsv) {
        return (
            <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography color="text.secondary">Scenario not found</Typography>
                <Button onClick={handleBack} sx={{ mt: 2 }}>
                    Go Back
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    border: 1,
                    borderColor: "divider",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Tooltip title="Back to Scenario">
                            <IconButton onClick={handleBack} size="small">
                                <ArrowBack />
                            </IconButton>
                        </Tooltip>
                        <Box>
                            <Typography variant="h6" fontWeight={600}>
                                Case Consideration
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {selectedPsv.tag} • {getCauseLabel(scenario.cause)} Scenario • Math: `$...$`, `$$...$$`
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        {canEdit && (
                            <Button
                                variant="contained"
                                startIcon={<Save />}
                                onClick={handleSave}
                                disabled={!hasChanges}
                            >
                                Save
                            </Button>
                        )}
                        <Button
                            variant="outlined"
                            startIcon={<Close />}
                            onClick={handleBack}
                        >
                            {canEdit ? "Close" : "Back"}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Unsaved Changes Indicator */}
            {hasChanges && (
                <Typography variant="caption" color="warning.main" sx={{ mb: 1 }}>
                    • You have unsaved changes
                </Typography>
            )}

            {/* Editor */}
            <Box sx={{ flex: 1, overflow: "hidden" }}>
                <MarkdownEditor
                    value={content}
                    onChange={handleContentChange}
                    placeholder={`## Case Consideration for ${getCauseLabel(scenario.cause)}

### Purpose
Document the relief scenario analysis and design basis...

### Background
Describe the process conditions, equipment, and operating envelope...

### Design Basis
- Protected equipment: ${selectedPsv.tag}
- Set pressure: ${selectedPsv.setPressure} barg
- Design pressure: 
- MAWP:

### Relieving Load Calculation
Document the methodology and calculation steps...

### Source Documentation
Reference P&IDs, datasheets, and other source documents...

### Conclusions
Summary of findings and recommendations...`}
                    disabled={!canEdit}
                    minRows={20}
                    maxRows={40}
                />
            </Box>
        </Box>
    );
}
