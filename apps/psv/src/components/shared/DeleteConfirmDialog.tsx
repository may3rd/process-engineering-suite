"use client";

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
} from "@mui/material";
import { Warning, Delete } from "@mui/icons-material";

interface ChildRelationship {
    label: string;
    count: number;
}

interface DeleteConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    itemName: string;
    children?: ChildRelationship[];
    loading?: boolean;
}

export function DeleteConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    itemName,
    children = [],
    loading = false,
}: DeleteConfirmDialogProps) {
    const hasChildren = children.some(c => c.count > 0);
    const canDelete = !hasChildren;

    return (
        <Dialog
            open={open}
            onClose={onClose}
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
                                This item cannot be deleted because it has dependent relationships.
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
                        </>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                {canDelete && (
                    <Button
                        onClick={onConfirm}
                        color="error"
                        variant="contained"
                        startIcon={<Delete />}
                        disabled={loading}
                    >
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
