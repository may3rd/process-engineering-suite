'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
} from '@mui/material';
import { Delete, Edit, History, CheckCircle, DeleteForever, PushPin } from '@mui/icons-material';
import { usePsvStore } from '@/store/usePsvStore';
import { getUserById } from '@/data/mockData';
import { RevisionEntityType, RevisionHistory } from '@/data/types';
import { DeleteConfirmDialog, DeleteMode } from './shared/DeleteConfirmDialog';
import { useAuthStore } from '@/store/useAuthStore';
import { EditRevisionDialog } from './EditRevisionDialog';
import { sortRevisionsByOriginatedAtDesc } from '@/lib/revisionSort';

interface RevisionHistoryCardProps {
    entityType: RevisionEntityType;
    entityId: string;
    currentRevisionId?: string;
    onRevisionDeleted?: (revisionId: string) => void;
    /**
     * Controls whether the edit/delete column is shown.
     * Used to hide actions in read-only contexts like print summaries.
     * Defaults to true.
     */
    showActions?: boolean;
    /**
     * When true, renders the card without a border or shadow (for print layouts).
     */
    hideBorder?: boolean;
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
 * Get user initials and full name for display
 */
function formatUser(userId?: string | null): { initials: string; fullName: string } {
    if (!userId) return { initials: '-', fullName: '-' };
    const user = getUserById(userId);
    if (!user) return { initials: userId.slice(0, 3).toUpperCase(), fullName: userId };

    const explicitInitials = user.initials?.trim();
    if (explicitInitials) {
        return { initials: explicitInitials.toUpperCase(), fullName: user.name };
    }

    const names = user.name.split(' ').filter(Boolean);
    const initials = names.map(n => n[0]).join('').toUpperCase();
    return { initials: initials || '-', fullName: user.name };
}

/**
 * Format user with date as "XX / DD-MMM-YYYY"
 */
function formatUserDate(userId?: string | null, dateString?: string | null): React.ReactNode {
    if (!userId && !dateString) return '-';

    const { initials, fullName } = formatUser(userId);
    const date = formatDate(dateString);

    if (!userId) return date;

    return (
        <Tooltip title={fullName} placement="top">
            <span style={{ cursor: 'pointer' }}>
                {initials} / {date}
            </span>
        </Tooltip>
    );
}

/**
 * RevisionHistoryCard displays a table of all revisions for an entity.
 * Used in the Summary tab of PSV detail.
 */
export function RevisionHistoryCard({
    entityType,
    entityId,
    currentRevisionId,
    onRevisionDeleted,
    showActions = true,
    hideBorder = false,
}: RevisionHistoryCardProps) {
    const { revisionHistory, loadRevisionHistory, deleteRevision, softDeleteRevision, setCurrentRevision, selectedPsv } = usePsvStore();
    const canEditAuth = useAuthStore(
        (state) => state.isAuthenticated && ['lead', 'approver', 'admin'].includes(state.currentUser?.role || '')
    );
    const canEditContent = canEditAuth && selectedPsv?.isActive !== false;
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingRevision, setEditingRevision] = useState<RevisionHistory | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [revisionToDelete, setRevisionToDelete] = useState<RevisionHistory | null>(null);
    const [deleteMode, setDeleteMode] = useState<DeleteMode>('deactivate');

    useEffect(() => {
        loadRevisionHistory(entityType, entityId);
    }, [entityType, entityId, loadRevisionHistory]);

    const revisionsForEntity = useMemo(
        () => sortRevisionsByOriginatedAtDesc(
            revisionHistory.filter((r) => r.entityType === entityType && r.entityId === entityId)
        ),
        [entityId, entityType, revisionHistory]
    );

    const handleEditClick = (revision: RevisionHistory) => {
        setEditingRevision(revision);
        setEditDialogOpen(true);
    };

    const handleEditSuccess = () => {
        loadRevisionHistory(entityType, entityId);
    };

    const handleDeleteClick = (revision: RevisionHistory, mode: DeleteMode = 'deactivate') => {
        setRevisionToDelete(revision);
        setDeleteMode(mode);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!revisionToDelete || !canEditAuth) return;
        if (revisionsForEntity.length <= 1) return;
        await softDeleteRevision(revisionToDelete.id);
        setDeleteDialogOpen(false);
        const deletedId = revisionToDelete.id;
        setRevisionToDelete(null);
        await loadRevisionHistory(entityType, entityId);
        onRevisionDeleted?.(deletedId);
    };

    const handleForceDelete = async () => {
        if (!revisionToDelete || !canEditAuth) return;
        await deleteRevision(revisionToDelete.id);
        setDeleteDialogOpen(false);
        const deletedId = revisionToDelete.id;
        setRevisionToDelete(null);
        await loadRevisionHistory(entityType, entityId);
        onRevisionDeleted?.(deletedId);
    };

    const paperStyles = (hideBorder?: boolean) =>
        hideBorder
            ? {
                p: 3,
                mb: 3,
                boxShadow: 'none',
                border: 0,
                '@media print': {
                    boxShadow: 'none',
                    border: 0,
                },
            }
            : {
                p: 3,
                mb: 3,
            };

    if (revisionsForEntity.length === 0) {
        return (
            <Paper sx={paperStyles(hideBorder)}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <History color="primary" />
                    <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1rem' }}>
                        Revision History
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                    No revision history available. Create a revision to start tracking changes.
                </Typography>
            </Paper>
        );
    }

    return (
        <>
            <Paper sx={paperStyles(hideBorder)}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <History color="primary" />
                    <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1rem' }}>
                        Revision History
                    </Typography>
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, width: '60px' }}>Rev</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>By</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Checked</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Approved</TableCell>
                                {showActions !== false && (
                                    <TableCell sx={{ fontWeight: 600, width: '96px', textAlign: 'right' }}>
                                        Actions
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {revisionsForEntity.map((revision) => {
                                const isCurrent = revision.id === currentRevisionId;
                                return (
                                    <TableRow
                                        key={revision.id}
                                        sx={{
                                            bgcolor: isCurrent ? 'action.selected' : 'transparent',
                                            '&:hover': { bgcolor: 'action.hover' },
                                            opacity: revision.isActive === false ? 0.6 : 1,
                                        }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {revision.revisionCode}
                                                </Typography>
                                                {revision.isActive === false && (
                                                    <Chip
                                                        label="Inactive"
                                                        size="small"
                                                        color="default"
                                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                                    />
                                                )}
                                                {isCurrent && (
                                                    <Chip
                                                        label="Current"
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {revision.description || (revision.sequence === 1 ? 'Original' : '-')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {formatUserDate(revision.originatedBy, revision.originatedAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {formatUserDate(revision.checkedBy, revision.checkedAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {formatUserDate(revision.approvedBy, revision.approvedAt)}
                                            </Typography>
                                        </TableCell>
                                        {showActions !== false && (
                                            <TableCell align="right">
                                                {revision.isActive === false ? (
                                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                        <Tooltip title="Reactivate Revision">
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={() => usePsvStore.getState().reactivateRevision(revision.id)}
                                                            >
                                                                <CheckCircle fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Permanently Remove">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDeleteClick(revision, 'remove')}
                                                            >
                                                                <DeleteForever fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                ) : (
                                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                        <Tooltip title={canEditContent ? 'Edit revision' : (canEditAuth ? 'Actions disabled for inactive PSV' : 'Admin / Lead / Approver only')}>
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleEditClick(revision)}
                                                                    disabled={!canEditContent}
                                                                >
                                                                    <Edit fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        {!isCurrent && canEditContent && (
                                                            <Tooltip title="Set as Current Revision">
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={() => setCurrentRevision(revision.id)}
                                                                >
                                                                    <PushPin fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip
                                                            title={
                                                                !canEditContent
                                                                    ? (canEditAuth ? 'Actions disabled for inactive PSV' : 'Admin / Lead / Approver only')
                                                                    : revisionsForEntity.filter(r => r.isActive !== false).length <= 1
                                                                        ? 'At least one revision must remain'
                                                                        : 'Deactivate revision'
                                                            }
                                                        >
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => handleDeleteClick(revision, 'deactivate')}
                                                                    disabled={!canEditContent || revisionsForEntity.filter(r => r.isActive !== false).length <= 1}
                                                                >
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <EditRevisionDialog
                open={editDialogOpen}
                onClose={() => {
                    setEditDialogOpen(false);
                    setEditingRevision(null);
                }}
                revision={editingRevision}
                onSuccess={handleEditSuccess}
            />

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                onForceDelete={handleForceDelete}
                allowForceDelete={canEditAuth}
                mode={deleteMode}
                title={deleteMode === 'remove' ? "Permanently Remove Revision" : "Deactivate Revision"}
                itemName={revisionToDelete ? `Rev. ${revisionToDelete.revisionCode}` : "revision"}
                confirmPhrase="delete revision"
            />
        </>
    );
}
