"use client";

import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Alert,
    AlertTitle,
    Box,
    List,
    ListItem,
    ListItemText,
    TextField,
    Collapse,
} from "@mui/material";
import { Warning, Delete, DeleteForever, Block } from "@mui/icons-material";

interface ChildRelationship {
    label: string;
    count: number;
}

export type DeleteMode = 'deactivate' | 'remove';

interface DeleteConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;  // Soft delete / Deactivate
    onForceDelete?: () => void;  // Cascade delete (permanent)
    title: string;
    itemName: string;
    children?: ChildRelationship[];
    loading?: boolean;
    allowForceDelete?: boolean;  // Enable cascade delete option
    showSoftDelete?: boolean;  // Show deactivate option for items with children
    mode?: 'deactivate' | 'remove'; // Mode: soft delete or hard delete
    confirmPhrase?: string; // Optional custom phrase for hard delete confirmation
}

export function DeleteConfirmDialog({
    open,
    onClose,
    onConfirm,
    onForceDelete,
    title,
    itemName,
    children = [],
    loading = false,
    allowForceDelete = false,
    showSoftDelete = true,
    mode = 'deactivate',
    confirmPhrase,
}: DeleteConfirmDialogProps) {
    const hasChildren = children.some(c => c.count > 0);
    const canDelete = !hasChildren;
    const [showForceDelete, setShowForceDelete] = useState(mode === 'remove');
    const [confirmText, setConfirmText] = useState('');

    const phrase = confirmPhrase || itemName;

    const totalChildren = children.reduce((sum, c) => sum + c.count, 0);
    const isForceDeleteConfirmed = confirmText === phrase;

    const handleClose = () => {
        setShowForceDelete(false);
        setConfirmText('');
        onClose();
    };

    const handleForceDelete = () => {
        if (isForceDeleteConfirmed && onForceDelete) {
            onForceDelete();
            handleClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {mode === 'remove' ? <DeleteForever color="error" /> : <Warning color={canDelete ? "warning" : "error"} />}
                {title}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {canDelete ? (
                        <>
                            <Typography>
                                Are you sure you want to {mode === 'remove' ? 'permanently remove' : 'deactivate'} <strong>{itemName}</strong>?
                            </Typography>
                            {mode === 'deactivate' && (
                                <Alert severity="info">
                                    <AlertTitle>Note</AlertTitle>
                                    Deactivating will preserve data and it can be reactivated later.
                                </Alert>
                            )}
                            {mode === 'remove' && !showForceDelete && (
                                <Alert severity="warning">
                                    <AlertTitle>Warning</AlertTitle>
                                    This action will permanently delete the item and cannot be undone.
                                </Alert>
                            )}
                        </>
                    ) : (
                        <>
                            <Alert severity="error">
                                <AlertTitle>Cannot Delete</AlertTitle>
                                This item cannot be deleted because it has {totalChildren} dependent relationship{totalChildren !== 1 ? 's' : ''}.
                            </Alert>
                            <Typography variant="body2" color="text.secondary">
                                <strong>{itemName}</strong> has the following dependent items:
                            </Typography>
                            <List dense>
                                {children.filter(c => c.count > 0).map((child, index) => (
                                    <ListItem key={index}>
                                        <ListItemText
                                            primary={`${child.count} ${child.label}${child.count !== 1 ? 's' : ''}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                            <Typography variant="body2" color="text.secondary">
                                Please remove or reassign these items before deleting.
                            </Typography>

                            {/* Soft Delete / Deactivate Option */}
                            {showSoftDelete && (
                                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        <AlertTitle>Recommended: Deactivate</AlertTitle>
                                        Deactivating will preserve data for audit trails and allow reactivation later.
                                    </Alert>
                                    <Button
                                        onClick={() => {
                                            onConfirm();
                                            handleClose();
                                        }}
                                        color="warning"
                                        variant="contained"
                                        startIcon={<Block />}
                                        fullWidth
                                        disabled={loading}
                                    >
                                        {loading ? 'Deactivating...' : `Deactivate All (${totalChildren + 1} items)`}
                                    </Button>
                                </Box>
                            )}

                            {/* Force Delete Option */}
                            {allowForceDelete && onForceDelete && !showForceDelete && (
                                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                    <Button
                                        onClick={() => setShowForceDelete(true)}
                                        color="error"
                                        variant="outlined"
                                        startIcon={<DeleteForever />}
                                        fullWidth
                                    >
                                        Force Delete (Cascade)
                                    </Button>
                                </Box>
                            )}

                            {/* Force Delete Confirmation */}
                            <Collapse in={showForceDelete}>
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'error.dark', borderRadius: 1 }}>
                                    <Alert severity="error" sx={{ mb: 2 }}>
                                        <AlertTitle>⚠️ DANGER: Permanent {mode === 'remove' ? 'Removal' : 'Delete'}</AlertTitle>
                                        This will permanently delete <strong>{itemName}</strong>{hasChildren ? ` and ALL ${totalChildren} dependent items recursively` : ''}.
                                    </Alert>

                                    <Typography variant="body2" sx={{ mb: 2, color: 'error.light' }}>
                                        To confirm, type the exact phrase: <strong>{phrase}</strong>
                                    </Typography>

                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder={phrase}
                                        error={confirmText.length > 0 && !isForceDeleteConfirmed}
                                        helperText={
                                            confirmText.length > 0 && !isForceDeleteConfirmed
                                                ? "Name doesn't match"
                                                : ''
                                        }
                                        autoFocus
                                    />

                                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                        <Button
                                            onClick={() => {
                                                setShowForceDelete(false);
                                                setConfirmText('');
                                            }}
                                            variant="outlined"
                                            fullWidth
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleForceDelete}
                                            color="error"
                                            variant="contained"
                                            disabled={!isForceDeleteConfirmed || loading}
                                            startIcon={<DeleteForever />}
                                            fullWidth
                                        >
                                            {loading ? 'Deleting...' : 'Force Delete All'}
                                        </Button>
                                    </Box>
                                </Box>
                            </Collapse>
                        </>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                {!showForceDelete && (
                    <>
                        <Button onClick={handleClose} disabled={loading}>
                            Cancel
                        </Button>
                        {canDelete && (
                            <Button
                                onClick={() => {
                                    if (mode === 'remove') {
                                        setShowForceDelete(true);
                                    } else {
                                        onConfirm();
                                        handleClose();
                                    }
                                }}
                                color={mode === 'remove' ? "error" : "warning"}
                                variant="contained"
                                startIcon={mode === 'remove' ? <DeleteForever /> : <Block />}
                                disabled={loading}
                            >
                                {loading ? (mode === 'remove' ? 'Removing...' : 'Deactivating...') : (mode === 'remove' ? 'Remove' : 'Deactivate')}
                            </Button>
                        )}
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
