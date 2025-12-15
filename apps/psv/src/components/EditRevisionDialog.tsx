'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Divider,
    CircularProgress,
} from '@mui/material';
import { Close, Edit, Person, CheckCircle, Verified } from '@mui/icons-material';
import { usePsvStore } from '@/store/usePsvStore';
import { RevisionHistory } from '@/data/types';
import { users } from '@/data/mockData';

interface EditRevisionDialogProps {
    open: boolean;
    onClose: () => void;
    revision: RevisionHistory | null;
    onSuccess?: () => void;
}

/**
 * Format date as "YYYY-MM-DD" for input field
 */
function formatDateForInput(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

/**
 * EditRevisionDialog allows editing lifecycle fields (checked, approved, description).
 */
export function EditRevisionDialog({
    open,
    onClose,
    revision,
    onSuccess,
}: EditRevisionDialogProps) {
    const { updateRevision, loadRevisionHistory } = usePsvStore();

    const [description, setDescription] = useState('');
    const [checkedBy, setCheckedBy] = useState('');
    const [checkedAt, setCheckedAt] = useState('');
    const [approvedBy, setApprovedBy] = useState('');
    const [approvedAt, setApprovedAt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load existing values when revision changes
    useEffect(() => {
        if (revision) {
            setDescription(revision.description || '');
            setCheckedBy(revision.checkedBy || '');
            setCheckedAt(formatDateForInput(revision.checkedAt));
            setApprovedBy(revision.approvedBy || '');
            setApprovedAt(formatDateForInput(revision.approvedAt));
            setError(null);
        }
    }, [revision]);

    if (!revision) return null;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            // Build update data - only include changed fields
            const updateData: Partial<RevisionHistory> = {};

            if (description !== (revision.description || '')) {
                updateData.description = description;
            }
            if (checkedBy !== (revision.checkedBy || '')) {
                updateData.checkedBy = checkedBy || undefined;
                updateData.checkedAt = checkedBy && checkedAt
                    ? new Date(checkedAt).toISOString()
                    : undefined;
            } else if (checkedAt !== formatDateForInput(revision.checkedAt) && checkedBy) {
                updateData.checkedAt = new Date(checkedAt).toISOString();
            }
            if (approvedBy !== (revision.approvedBy || '')) {
                updateData.approvedBy = approvedBy || undefined;
                updateData.approvedAt = approvedBy && approvedAt
                    ? new Date(approvedAt).toISOString()
                    : undefined;
            } else if (approvedAt !== formatDateForInput(revision.approvedAt) && approvedBy) {
                updateData.approvedAt = new Date(approvedAt).toISOString();
            }

            if (Object.keys(updateData).length === 0) {
                onClose();
                return;
            }

            // Use the store action to update
            await updateRevision(revision.id, updateData);

            // Reload revision history
            await loadRevisionHistory(revision.entityType, revision.entityId);

            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update revision');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setError(null);
            onClose();
        }
    };

    // Get approvers and leads for select options
    const approverUsers = users.filter(u => u.role === 'approver' || u.role === 'admin');
    const checkerUsers = users.filter(u => u.role === 'lead' || u.role === 'approver' || u.role === 'admin');

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Edit color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            Edit Rev. {revision.revisionCode}
                        </Typography>
                    </Box>
                    <IconButton onClick={handleClose} size="small" disabled={isSubmitting}>
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}

                {/* Description */}
                <TextField
                    fullWidth
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    margin="normal"
                    multiline
                    rows={2}
                />

                <Divider sx={{ my: 2 }} />

                {/* Checked By */}
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle fontSize="small" color="success" />
                    Checked
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Checked By</InputLabel>
                        <Select
                            value={checkedBy}
                            label="Checked By"
                            onChange={(e) => {
                                setCheckedBy(e.target.value);
                                if (e.target.value && !checkedAt) {
                                    setCheckedAt(new Date().toISOString().split('T')[0]);
                                }
                            }}
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {checkerUsers.map((user) => (
                                <MenuItem key={user.id} value={user.id}>
                                    {user.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        type="date"
                        label="Checked Date"
                        value={checkedAt}
                        onChange={(e) => setCheckedAt(e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 160 }}
                        disabled={!checkedBy}
                    />
                </Box>

                {/* Approved By */}
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Verified fontSize="small" color="primary" />
                    Approved
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Approved By</InputLabel>
                        <Select
                            value={approvedBy}
                            label="Approved By"
                            onChange={(e) => {
                                setApprovedBy(e.target.value);
                                if (e.target.value && !approvedAt) {
                                    setApprovedAt(new Date().toISOString().split('T')[0]);
                                }
                            }}
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {approverUsers.map((user) => (
                                <MenuItem key={user.id} value={user.id}>
                                    {user.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        type="date"
                        label="Approved Date"
                        value={approvedAt}
                        onChange={(e) => setApprovedAt(e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 160 }}
                        disabled={!approvedBy}
                    />
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
                >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
