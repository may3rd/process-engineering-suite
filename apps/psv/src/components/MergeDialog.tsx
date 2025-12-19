"use client";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Paper,
    Radio,
    RadioGroup,
    FormControlLabel,
    Divider,
    useTheme,
    Alert,
    Stack,
} from "@mui/material";
import {
    MergeType,
} from "@mui/icons-material";
import { AuditFieldChange } from "@/data/types";
import { formatFieldName, formatFieldValue } from "@/lib/auditLogService";
import { useState } from "react";

interface MergeDialogProps {
    open: boolean;
    onClose: () => void;

    // Conflict details
    entityName: string;

    // Fields that conflict (same field changed by both)
    conflictingFields: {
        field: string;
        serverValue: unknown;
        yourValue: unknown;
        originalValue: unknown;
    }[];

    // Fields that don't conflict (auto-merged)
    autoMergedFields: AuditFieldChange[];

    // Actions
    onApplyMerge: (resolutions: Record<string, 'server' | 'yours'>) => void;
    onCancel: () => void;
}

export function MergeDialog({
    open,
    onClose,
    entityName,
    conflictingFields,
    autoMergedFields,
    onApplyMerge,
    onCancel,
}: MergeDialogProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    // Track user's choices for each conflicting field
    const [resolutions, setResolutions] = useState<Record<string, 'server' | 'yours'>>(() => {
        const initial: Record<string, 'server' | 'yours'> = {};
        conflictingFields.forEach(cf => {
            initial[cf.field] = 'yours'; // Default to keeping user's changes
        });
        return initial;
    });

    const handleChange = (field: string, value: 'server' | 'yours') => {
        setResolutions(prev => ({ ...prev, [field]: value }));
    };

    const handleApply = () => {
        onApplyMerge(resolutions);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    bgcolor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(8px)',
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <MergeType color="primary" />
                <Typography variant="h6" component="span" fontWeight={600}>
                    Resolve Conflicts
                </Typography>
            </DialogTitle>


            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    The following fields have conflicting changes. Choose which value to keep for each:
                </Typography>

                {conflictingFields.length === 0 ? (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        No conflicting fields! All changes can be auto-merged.
                    </Alert>
                ) : (
                    <Stack spacing={2} sx={{ mb: 3 }}>
                        {conflictingFields.map((cf) => (
                            <Paper
                                key={cf.field}
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                                    {formatFieldName(cf.field)}
                                </Typography>

                                <RadioGroup
                                    value={resolutions[cf.field]}
                                    onChange={(e) => handleChange(cf.field, e.target.value as 'server' | 'yours')}
                                >
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                flex: 1,
                                                minWidth: 150,
                                                p: 1.5,
                                                borderRadius: '8px',
                                                borderColor: resolutions[cf.field] === 'server'
                                                    ? 'primary.main'
                                                    : undefined,
                                                bgcolor: resolutions[cf.field] === 'server'
                                                    ? isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.05)'
                                                    : undefined,
                                            }}
                                        >
                                            <FormControlLabel
                                                value="server"
                                                control={<Radio size="small" />}
                                                label={
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Server
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight={500}>
                                                            {formatFieldValue(cf.serverValue)}
                                                        </Typography>
                                                    </Box>
                                                }
                                                sx={{ m: 0 }}
                                            />
                                        </Paper>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                flex: 1,
                                                minWidth: 150,
                                                p: 1.5,
                                                borderRadius: '8px',
                                                borderColor: resolutions[cf.field] === 'yours'
                                                    ? 'secondary.main'
                                                    : undefined,
                                                bgcolor: resolutions[cf.field] === 'yours'
                                                    ? isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(245, 158, 11, 0.05)'
                                                    : undefined,
                                            }}
                                        >
                                            <FormControlLabel
                                                value="yours"
                                                control={<Radio size="small" />}
                                                label={
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Yours
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight={500}>
                                                            {formatFieldValue(cf.yourValue)}
                                                        </Typography>
                                                    </Box>
                                                }
                                                sx={{ m: 0 }}
                                            />
                                        </Paper>
                                    </Box>
                                </RadioGroup>
                            </Paper>
                        ))}
                    </Stack>
                )}

                {autoMergedFields.length > 0 && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="caption" color="text.secondary">
                            Auto-merged (no conflict): {autoMergedFields.map(f => formatFieldName(f.field)).join(', ')}
                        </Typography>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button variant="outlined" onClick={onCancel} color="inherit">
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleApply}
                    color="primary"
                    startIcon={<MergeType />}
                >
                    Apply & Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
