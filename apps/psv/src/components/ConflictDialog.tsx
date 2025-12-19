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
    Divider,
    useTheme,
    Alert,
    Chip,
    Stack,
} from "@mui/material";
import {
    Warning,
    Refresh,
    MergeType,
    SaveAlt,
} from "@mui/icons-material";
import { AuditFieldChange } from "@/data/types";
import { formatFieldName, formatFieldValue } from "@/lib/auditLogService";

interface ConflictDialogProps {
    open: boolean;
    onClose: () => void;

    // Conflict details
    entityName: string;
    conflictingUser: {
        name: string;
        changedAt: string;
    };
    serverChanges: AuditFieldChange[];
    yourChanges: AuditFieldChange[];

    // Actions
    onReloadDiscard: () => void;
    onMergeAndSave: () => void;
    onForceSave: () => void;
}

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
}

export function ConflictDialog({
    open,
    onClose,
    entityName,
    conflictingUser,
    serverChanges,
    yourChanges,
    onReloadDiscard,
    onMergeAndSave,
    onForceSave,
}: ConflictDialogProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    // Check if there are overlapping fields
    const serverFields = new Set(serverChanges.map(c => c.field));
    const yourFields = new Set(yourChanges.map(c => c.field));
    const hasConflictingFields = [...yourFields].some(f => serverFields.has(f));

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
                <Warning color="warning" />
                <Typography variant="h6" component="span" fontWeight={600}>
                    Save Conflict
                </Typography>
            </DialogTitle>


            <DialogContent>
                <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                        <strong>{entityName}</strong> was modified by <strong>{conflictingUser.name}</strong> {formatRelativeTime(conflictingUser.changedAt)} while you were editing. Choose how to proceed:
                    </Typography>
                </Alert>

                {/* Server Changes */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: '12px',
                        bgcolor: isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(2, 132, 199, 0.03)',
                        borderColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                    }}
                >
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Changes by {conflictingUser.name}
                        <Chip
                            label={formatRelativeTime(conflictingUser.changedAt)}
                            size="small"
                            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                        />
                    </Typography>
                    {serverChanges.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No tracked field changes
                        </Typography>
                    ) : (
                        <Stack spacing={0.5}>
                            {serverChanges.map((change, i) => (
                                <Typography key={i} variant="body2" color="text.secondary">
                                    • {formatFieldName(change.field)}: {formatFieldValue(change.oldValue)} → {formatFieldValue(change.newValue)}
                                </Typography>
                            ))}
                        </Stack>
                    )}
                </Paper>

                {/* Your Changes */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: '12px',
                        bgcolor: isDark ? 'rgba(251, 191, 36, 0.05)' : 'rgba(245, 158, 11, 0.03)',
                        borderColor: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    }}
                >
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Your unsaved changes
                    </Typography>
                    {yourChanges.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No field changes detected
                        </Typography>
                    ) : (
                        <Stack spacing={0.5}>
                            {yourChanges.map((change, i) => (
                                <Typography key={i} variant="body2" color="text.secondary">
                                    • {formatFieldName(change.field)}: {formatFieldValue(change.oldValue)} → {formatFieldValue(change.newValue)}
                                </Typography>
                            ))}
                        </Stack>
                    )}
                </Paper>

                {hasConflictingFields && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            ⚠️ Some fields were changed by both users. Merge carefully.
                        </Typography>
                    </Alert>
                )}
            </DialogContent>

            <Divider />

            <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={onReloadDiscard}
                    color="inherit"
                    sx={{ minWidth: 140 }}
                >
                    Reload & Discard
                </Button>
                <Button
                    variant="contained"
                    startIcon={<MergeType />}
                    onClick={onMergeAndSave}
                    color="primary"
                    sx={{ minWidth: 140 }}
                >
                    Merge & Save
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<SaveAlt />}
                    onClick={onForceSave}
                    color="error"
                    sx={{ minWidth: 140 }}
                >
                    Force Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
