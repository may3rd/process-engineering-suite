'use client';

import { useEffect, useState } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip,
    Button,
    Tooltip,
    Paper,
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
} from '@mui/icons-material';
import { usePsvStore } from '@/store/usePsvStore';
import { getUserById } from '@/data/mockData';
import { RevisionHistory, RevisionEntityType } from '@/data/types';
import { EditRevisionDialog } from './EditRevisionDialog';
import { NewRevisionDialog } from './NewRevisionDialog';

interface RevisionHistoryPanelProps {
    open: boolean;
    onClose: () => void;
    entityType: RevisionEntityType;
    entityId: string;
    currentRevisionId?: string;
    onViewSnapshot?: (revision: RevisionHistory) => void;
}

/**
 * Format date as "DD-MMM-YYYY"
 */
function formatDate(dateString?: string): string {
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
function getUserInitials(userId?: string): { label: string; fullName: string } {
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
}: RevisionHistoryPanelProps) {
    const { revisionHistory, loadRevisionHistory, getCurrentRevision } = usePsvStore();

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingRevision, setEditingRevision] = useState<RevisionHistory | null>(null);
    const [newRevisionDialogOpen, setNewRevisionDialogOpen] = useState(false);

    useEffect(() => {
        if (open) {
            loadRevisionHistory(entityType, entityId);
        }
    }, [open, entityType, entityId, loadRevisionHistory]);

    const entityLabel = entityType === 'protective_system' ? 'PSV'
        : entityType === 'scenario' ? 'Scenario'
            : 'Sizing Case';

    const currentRevision = getCurrentRevision(entityType, entityId);

    const handleEditClick = (revision: RevisionHistory) => {
        setEditingRevision(revision);
        setEditDialogOpen(true);
    };

    const handleEditSuccess = () => {
        loadRevisionHistory(entityType, entityId);
    };

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
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
                                                <Tooltip title="Edit Revision">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEditClick(revision)}
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
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
            />

            {/* New Revision Dialog */}
            <NewRevisionDialog
                open={newRevisionDialogOpen}
                onClose={() => setNewRevisionDialogOpen(false)}
                entityType={entityType}
                entityId={entityId}
                currentRevisionCode={currentRevision?.revisionCode}
            />
        </>
    );
}
