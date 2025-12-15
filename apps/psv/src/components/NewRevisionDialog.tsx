'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Alert,
} from '@mui/material';
import { usePsvStore } from '@/store/usePsvStore';
import { RevisionEntityType } from '@/data/types';

interface NewRevisionDialogProps {
    open: boolean;
    onClose: () => void;
    entityType: RevisionEntityType;
    entityId: string;
    currentRevisionCode?: string;
    onSuccess?: (revisionCode: string) => void;
}

/**
 * Suggests the next revision code based on current code.
 * O1 → O2, A1 → A2, etc.
 * After O9, goes to A1.
 */
function suggestNextRevisionCode(current?: string): string {
    if (!current) return 'O1';

    const match = current.match(/^([A-Z])(\d+)$/);
    if (!match) return 'O1';

    const [, letter, numStr] = match;
    const num = parseInt(numStr, 10);

    // Increment number
    if (num < 9) {
        return `${letter}${num + 1}`;
    }

    // Move to next letter
    if (letter === 'O') return 'A1';
    if (letter === 'Z') return 'A1'; // Wrap around

    const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
    return `${nextLetter}1`;
}

export function NewRevisionDialog({
    open,
    onClose,
    entityType,
    entityId,
    currentRevisionCode,
    onSuccess,
}: NewRevisionDialogProps) {
    const [revisionCode, setRevisionCode] = useState(
        suggestNextRevisionCode(currentRevisionCode)
    );
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { createRevision } = usePsvStore();

    const handleSubmit = async () => {
        if (!revisionCode.trim()) {
            setError('Revision code is required');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await createRevision(
                entityType,
                entityId,
                revisionCode.trim(),
                description.trim() || undefined
            );
            onSuccess?.(revisionCode);
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create revision');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setRevisionCode(suggestNextRevisionCode(currentRevisionCode));
        setDescription('');
        setError(null);
        onClose();
    };

    const entityLabel = entityType === 'protective_system' ? 'PSV'
        : entityType === 'scenario' ? 'Scenario'
            : 'Sizing Case';

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Create New Revision</DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Creating a new revision for this {entityLabel} will snapshot the current state.
                        {currentRevisionCode && (
                            <> Current revision: <strong>Rev. {currentRevisionCode}</strong></>
                        )}
                    </Typography>

                    <TextField
                        label="Revision Code"
                        value={revisionCode}
                        onChange={(e) => setRevisionCode(e.target.value.toUpperCase())}
                        fullWidth
                        margin="normal"
                        placeholder="e.g., A1, B2, O1"
                        helperText="Format: Letter + Number (O=Original, A-Z=Revisions)"
                        inputProps={{ maxLength: 3 }}
                        autoFocus
                    />

                    <TextField
                        label="Description (Optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        margin="normal"
                        placeholder="Reason for this revision..."
                        multiline
                        rows={2}
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
                    disabled={isSubmitting || !revisionCode.trim()}
                >
                    {isSubmitting ? 'Creating...' : 'Create Revision'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
