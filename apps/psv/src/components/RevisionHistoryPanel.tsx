'use client';

import { useEffect } from 'react';
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
} from '@mui/icons-material';
import { usePsvStore } from '@/store/usePsvStore';
import { getUserById } from '@/data/mockData';
import { RevisionHistory, RevisionEntityType } from '@/data/types';

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
function getUserName(userId?: string): string {
    if (!userId) return '-';
    const user = getUserById(userId);
    return user?.name || userId;
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
    const { revisionHistory, loadRevisionHistory } = usePsvStore();

    useEffect(() => {
        if (open) {
            loadRevisionHistory(entityType, entityId);
        }
    }, [open, entityType, entityId, loadRevisionHistory]);

    const entityLabel = entityType === 'protective_system' ? 'PSV'
        : entityType === 'scenario' ? 'Scenario'
            : 'Sizing Case';

    return (
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
                <IconButton onClick={onClose} size="small">
                    <Close />
                </IconButton>
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
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
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
                                                    {getUserName(revision.originatedBy)}, {formatDate(revision.originatedAt)}
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
                                                        ? `${getUserName(revision.checkedBy)}, ${formatDate(revision.checkedAt)}`
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
                                                        ? `${getUserName(revision.approvedBy)}, ${formatDate(revision.approvedAt)}`
                                                        : '-'
                                                    }
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* View Snapshot Button */}
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
    );
}
