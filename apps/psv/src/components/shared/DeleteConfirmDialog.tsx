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
import { Warning, Delete, DeleteForever } from "@mui/icons-material";

interface ChildRelationship {
    label: string;
    count: number;
}

interface DeleteConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onForceDelete?: () => void;  // New: cascade delete callback
    title: string;
    itemName: string;
    children?: ChildRelationship[];
    loading?: boolean;
    allowForceDelete?: boolean;  // New: enable cascade delete option
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
}: DeleteConfirmDialogProps) {
    const hasChildren = children.some(c => c.count > 0);
    const canDelete = !hasChildren;
    const [showForceDelete, setShowForceDelete] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const totalChildren = children.reduce((sum, c) => sum + c.count, 0);
    const isForceDeleteConfirmed = confirmText === itemName;

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
                <Warning color={canDelete ? "warning" : "error"} />
                {title}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {canDelete ? (
                        <>
                            <Typography>
                                Are you sure you want to delete <strong>{itemName}</strong>?
                            </Typography>
                            <Alert severity="warning">
                                <AlertTitle>Warning</AlertTitle>
                                This action cannot be undone.
                            </Alert>
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
                                        <AlertTitle>⚠️ DANGER: Cascade Delete</AlertTitle>
                                        This will permanently delete <strong>{itemName}</strong> and ALL {totalChildren} dependent items recursively.
                                    </Alert>

                                    <Typography variant="body2" sx={{ mb: 2, color: 'error.light' }}>
                                        To confirm, type the exact name: <strong>{itemName}</strong>
                                    </Typography>

                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder={itemName}
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
                                    onConfirm();
                                    handleClose();
                                }}
                                color="error"
                                variant="contained"
                                startIcon={<Delete />}
                                disabled={loading}
                            >
                                {loading ? 'Deleting...' : 'Delete'}
                            </Button>
                        )}
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
