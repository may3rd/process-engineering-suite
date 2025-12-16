'use client';

import { useEffect, useState } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Divider,
    List,
    ListItemText,
    Chip,
    Button,
    Tooltip,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Close,
    History,
    Circle,
    RadioButtonUnchecked,
    Person,
    CheckCircle,
    Verified,
    Visibility,
    Edit,
    Add,
    HowToReg,
    Undo,
    Delete,
} from '@mui/icons-material';
import { usePsvStore } from '@/store/usePsvStore';
import { getUserById } from '@/data/mockData';
import { RevisionHistory, RevisionEntityType } from '@/data/types';
import { EditRevisionDialog } from './EditRevisionDialog';
import { NewRevisionDialog } from './NewRevisionDialog';
import { useAuthStore } from '@/store/useAuthStore';

interface RevisionHistoryPanelProps {
    open: boolean;
    onClose: () => void;
    entityType: RevisionEntityType;
    entityId: string;
    currentRevisionId?: string;
    onViewSnapshot?: (revision: RevisionHistory) => void;
    overlayAboveDialogs?: boolean;
}

/**
 * Format date as "DD-MMM-YYYY"
 */
function formatDate(dateString?: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

/**
 * Get user name for display
 */
function getUserInitials(userId?: string | null): { label: string; fullName: string } {
    if (!userId) return { label: '-', fullName: '-' };
    const user = getUserById(userId);
    if (!user) return { label: userId.slice(0, 3).toUpperCase(), fullName: userId };
    const explicit = user.initials?.trim();
    if (explicit) return { label: explicit.toUpperCase(), fullName: user.name };
    const derived = user.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
    return { label: derived || '-', fullName: user.name };
}

/**
 * RevisionHistoryPanel displays a side drawer with detailed revision timeline.
 */
export function RevisionHistoryPanel({
    open,
    onClose,
    entityType,
    entityId,
    currentRevisionId,
    onViewSnapshot,
    overlayAboveDialogs = false,
}: RevisionHistoryPanelProps) {
    const { revisionHistory, loadRevisionHistory, getCurrentRevision, updateRevision, deleteRevision } = usePsvStore();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const currentUser = useAuthStore((state) => state.currentUser);
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApproveSignature = useAuthStore(
        (state) => state.isAuthenticated && ['lead', 'approver', 'admin'].includes(state.currentUser?.role || '')
    );
    const canManualEdit = isAuthenticated && ['lead', 'approver', 'admin'].includes(currentUser?.role || '');
    const canCreateRevisions = isAuthenticated && canEdit;
    const canDeleteRevisions = canManualEdit;

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingRevision, setEditingRevision] = useState<RevisionHistory | null>(null);
    const [newRevisionDialogOpen, setNewRevisionDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [revisionToDelete, setRevisionToDelete] = useState<RevisionHistory | null>(null);

    useEffect(() => {
        if (open) {
            loadRevisionHistory(entityType, entityId);
        }
    }, [open, entityType, entityId, loadRevisionHistory]);

    const entityLabel = entityType === 'protective_system' ? 'PSV'
        : entityType === 'scenario' ? 'Scenario'
            : 'Sizing Case';

    const currentRevision = getCurrentRevision(entityType, entityId);
    const revisionCountForEntity = revisionHistory.filter(
        (r) => r.entityType === entityType && r.entityId === entityId
    ).length;
    const cannotDeleteLastRevision = revisionCountForEntity <= 1;

    const handleEditClick = (revision: RevisionHistory) => {
        setEditingRevision(revision);
        setEditDialogOpen(true);
    };

    const handleEditSuccess = () => {
        loadRevisionHistory(entityType, entityId);
    };

    const signOriginator = async (revision: RevisionHistory) => {
        if (!currentUser || revision.originatedBy) return;
        await updateRevision(revision.id, {
            originatedBy: currentUser.id,
            originatedAt: new Date().toISOString(),
        });
    };

    const signChecker = async (revision: RevisionHistory) => {
        if (!currentUser || !isAuthenticated || !revision.originatedBy || revision.checkedBy) return;
        await updateRevision(revision.id, {
            checkedBy: currentUser.id,
            checkedAt: new Date().toISOString(),
        });
    };

    const signApprover = async (revision: RevisionHistory) => {
        if (!currentUser || !canApproveSignature || !revision.originatedBy || !revision.checkedBy || revision.approvedBy) return;
        await updateRevision(revision.id, {
            approvedBy: currentUser.id,
            approvedAt: new Date().toISOString(),
        });
    };

    const canRevokeOriginator = (revision: RevisionHistory) =>
        !!revision.originatedBy
        && !!currentUser
        && isAuthenticated
        && (revision.originatedBy === currentUser.id || canManualEdit);

    const canRevokeChecker = (revision: RevisionHistory) =>
        !!revision.checkedBy
        && !!currentUser
        && isAuthenticated
        && (revision.checkedBy === currentUser.id || canManualEdit);

    const canRevokeApprover = (revision: RevisionHistory) =>
        !!revision.approvedBy
        && !!currentUser
        && isAuthenticated
        && (revision.approvedBy === currentUser.id || canManualEdit);

    const revokeOriginator = async (revision: RevisionHistory) => {
        if (!canRevokeOriginator(revision)) return;
        await updateRevision(revision.id, { originatedBy: null, originatedAt: null });
    };

    const revokeChecker = async (revision: RevisionHistory) => {
        if (!canRevokeChecker(revision)) return;
        await updateRevision(revision.id, { checkedBy: null, checkedAt: null });
    };

    const revokeApprover = async (revision: RevisionHistory) => {
        if (!canRevokeApprover(revision)) return;
        await updateRevision(revision.id, { approvedBy: null, approvedAt: null });
    };

    const handleDeleteClick = (revision: RevisionHistory) => {
        if (cannotDeleteLastRevision) return;
        setRevisionToDelete(revision);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!revisionToDelete || !canDeleteRevisions) return;
        if (cannotDeleteLastRevision) return;
        await deleteRevision(revisionToDelete.id);
        setDeleteDialogOpen(false);
        setRevisionToDelete(null);
        await loadRevisionHistory(entityType, entityId);
    };

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                sx={{
                    zIndex: overlayAboveDialogs ? ((theme) => theme.zIndex.modal + 1) : undefined,
                }}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 400 },
                        p: 0,
                    },
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderBottom: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <History color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            Revision History
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setNewRevisionDialogOpen(true)}
                            disabled={!canCreateRevisions}
                        >
                            New
                        </Button>
                        <IconButton onClick={onClose} size="small">
                            <Close />
                        </IconButton>
                    </Box>
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {revisionHistory.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                            No revision history for this {entityLabel}.
                        </Typography>
                    ) : (
                        <List disablePadding>
                            {revisionHistory.map((revision, index) => {
                                const isCurrent = revision.id === currentRevisionId;
                                const isFirst = index === 0;

                                return (
                                    <Box key={revision.id} sx={{ mb: 2 }}>
                                        {/* Revision Header */}
                                        <Paper
                                            variant={isCurrent ? 'elevation' : 'outlined'}
                                            elevation={isCurrent ? 2 : 0}
                                            sx={{
                                                p: 2,
                                                border: isCurrent ? 2 : 1,
                                                borderColor: isCurrent ? 'primary.main' : 'divider',
                                                bgcolor: isCurrent ? 'action.selected' : 'transparent',
                                            }}
                                        >
                                            {/* Title Row */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {isCurrent ? (
                                                        <Circle sx={{ fontSize: 12, color: 'primary.main' }} />
                                                    ) : (
                                                        <RadioButtonUnchecked sx={{ fontSize: 12, color: 'text.disabled' }} />
                                                    )}
                                                    <Typography variant="subtitle1" fontWeight={600}>
                                                        Rev. {revision.revisionCode}
                                                    </Typography>
                                                    {isCurrent && (
                                                        <Chip
                                                            label="Current"
                                                            size="small"
                                                            color="primary"
                                                            sx={{ height: 20, fontSize: '0.7rem' }}
                                                        />
                                                    )}
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Tooltip title={isAuthenticated ? 'Edit Revision' : 'Sign in to edit'}>
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleEditClick(revision)}
                                                                disabled={!canManualEdit}
                                                            >
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip
                                                        title={
                                                            !canDeleteRevisions
                                                                ? (isAuthenticated ? 'Insufficient permission' : 'Sign in to edit')
                                                                : cannotDeleteLastRevision
                                                                    ? 'At least one revision must remain'
                                                                    : 'Delete Revision'
                                                        }
                                                    >
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDeleteClick(revision)}
                                                                disabled={!canDeleteRevisions || cannotDeleteLastRevision}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Box>
                                            </Box>

                                            {/* Description */}
                                            {revision.description && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, pl: 2.5 }}>
                                                    {revision.description}
                                                </Typography>
                                            )}

                                            {/* Lifecycle Timeline */}
                                            <Box sx={{ pl: 2.5 }}>
                                                {/* Originated */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                                                    <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                    <Typography variant="body2" color="text.secondary">
                                                        Originated:
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {(() => {
                                                            const { label, fullName } = getUserInitials(revision.originatedBy);
                                                            return (
                                                                <>
                                                                    <Tooltip title={fullName} placement="top">
                                                                        <span style={{ cursor: 'pointer' }}>{label}</span>
                                                                    </Tooltip>
                                                                    {`, ${formatDate(revision.originatedAt)}`}
                                                                </>
                                                            );
                                                        })()}
                                                    </Typography>
                                                    {!revision.originatedBy && (
                                                        <Tooltip title={isAuthenticated ? 'Sign as originator' : 'Sign in to sign'}>
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => signOriginator(revision)}
                                                                    disabled={!isAuthenticated || !currentUser}
                                                                >
                                                                    <HowToReg fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                    {revision.originatedBy && canRevokeOriginator(revision) && (
                                                        <Tooltip title="Revoke originator signature">
                                                            <IconButton size="small" onClick={() => revokeOriginator(revision)}>
                                                                <Undo fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>

                                                {/* Checked */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                                                    <CheckCircle
                                                        sx={{
                                                            fontSize: 16,
                                                            color: revision.checkedBy ? 'success.main' : 'text.disabled'
                                                        }}
                                                    />
                                                    <Typography variant="body2" color="text.secondary">
                                                        Checked:
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {revision.checkedBy
                                                            ? (() => {
                                                                const { label, fullName } = getUserInitials(revision.checkedBy);
                                                                return (
                                                                    <>
                                                                        <Tooltip title={fullName} placement="top">
                                                                            <span style={{ cursor: 'pointer' }}>{label}</span>
                                                                        </Tooltip>
                                                                        {`, ${formatDate(revision.checkedAt)}`}
                                                                    </>
                                                                );
                                                            })()
                                                            : '-'
                                                        }
                                                    </Typography>
                                                    {!revision.checkedBy && (
                                                        <Tooltip
                                                            title={
                                                                !isAuthenticated
                                                                    ? 'Sign in to sign'
                                                                    : !revision.originatedBy
                                                                        ? 'Originator must sign first'
                                                                        : 'Sign as checker'
                                                            }
                                                        >
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => signChecker(revision)}
                                                                    disabled={!isAuthenticated || !currentUser || !revision.originatedBy}
                                                                >
                                                                    <HowToReg fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                    {revision.checkedBy && canRevokeChecker(revision) && (
                                                        <Tooltip title="Revoke checker signature">
                                                            <IconButton size="small" onClick={() => revokeChecker(revision)}>
                                                                <Undo fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>

                                                {/* Approved */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Verified
                                                        sx={{
                                                            fontSize: 16,
                                                            color: revision.approvedBy ? 'primary.main' : 'text.disabled'
                                                        }}
                                                    />
                                                    <Typography variant="body2" color="text.secondary">
                                                        Approved:
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {revision.approvedBy
                                                            ? (() => {
                                                                const { label, fullName } = getUserInitials(revision.approvedBy);
                                                                return (
                                                                    <>
                                                                        <Tooltip title={fullName} placement="top">
                                                                            <span style={{ cursor: 'pointer' }}>{label}</span>
                                                                        </Tooltip>
                                                                        {`, ${formatDate(revision.approvedAt)}`}
                                                                    </>
                                                                );
                                                            })()
                                                            : '-'
                                                        }
                                                    </Typography>
                                                    {!revision.approvedBy && (
                                                        <Tooltip
                                                            title={
                                                                !isAuthenticated
                                                                    ? 'Sign in to sign'
                                                                    : !revision.originatedBy
                                                                        ? 'Originator must sign first'
                                                                        : !revision.checkedBy
                                                                            ? 'Checker must sign first'
                                                                            : canApproveSignature
                                                                                ? 'Sign as approver'
                                                                                : 'Requires Lead/Approver/Admin role'
                                                            }
                                                        >
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => signApprover(revision)}
                                                                    disabled={!canApproveSignature || !currentUser || !revision.originatedBy || !revision.checkedBy}
                                                                >
                                                                    <HowToReg fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                    {revision.approvedBy && canRevokeApprover(revision) && (
                                                        <Tooltip title="Revoke approver signature">
                                                            <IconButton size="small" onClick={() => revokeApprover(revision)}>
                                                                <Undo fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </Box>

                                            {/* Action Buttons */}
                                            {onViewSnapshot && !isCurrent && (
                                                <Box sx={{ mt: 2, pl: 2.5 }}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<Visibility />}
                                                        onClick={() => onViewSnapshot(revision)}
                                                    >
                                                        View Snapshot
                                                    </Button>
                                                </Box>
                                            )}
                                        </Paper>
                                    </Box>
                                );
                            })}
                        </List>
                    )}
                </Box>
            </Drawer>

            {/* Edit Revision Dialog */}
            <EditRevisionDialog
                open={editDialogOpen}
                onClose={() => {
                    setEditDialogOpen(false);
                    setEditingRevision(null);
                }}
                revision={editingRevision}
                onSuccess={handleEditSuccess}
                elevateZIndex={overlayAboveDialogs}
            />

            {/* New Revision Dialog */}
            <NewRevisionDialog
                open={newRevisionDialogOpen}
                onClose={() => setNewRevisionDialogOpen(false)}
                entityType={entityType}
                entityId={entityId}
                currentRevisionCode={currentRevision?.revisionCode}
                elevateZIndex={overlayAboveDialogs}
            />

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                sx={{
                    zIndex: overlayAboveDialogs ? ((theme) => theme.zIndex.modal + 2) : undefined,
                }}
            >
                <DialogTitle>Delete revision?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {revisionToDelete
                            ? `This permanently deletes Rev. ${revisionToDelete.revisionCode}.`
                            : 'This permanently deletes the selected revision.'}
                    </Typography>
                    {cannotDeleteLastRevision && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            At least one revision must remain.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleConfirmDelete}
                        disabled={!revisionToDelete || !canDeleteRevisions || cannotDeleteLastRevision}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
