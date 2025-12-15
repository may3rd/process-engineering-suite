'use client';

import { useEffect } from 'react';
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
} from '@mui/material';
import { History } from '@mui/icons-material';
import { usePsvStore } from '@/store/usePsvStore';
import { getUserById } from '@/data/mockData';
import { RevisionEntityType } from '@/data/types';

interface RevisionHistoryCardProps {
    entityType: RevisionEntityType;
    entityId: string;
    currentRevisionId?: string;
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
 * Get user initials and full name for display
 */
function formatUser(userId?: string): { initials: string; fullName: string } {
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
function formatUserDate(userId?: string, dateString?: string): React.ReactNode {
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
}: RevisionHistoryCardProps) {
    const { revisionHistory, loadRevisionHistory } = usePsvStore();

    useEffect(() => {
        loadRevisionHistory(entityType, entityId);
    }, [entityType, entityId, loadRevisionHistory]);

    if (revisionHistory.length === 0) {
        return (
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <History color="primary" />
                    <Typography variant="h6" fontWeight={600}>
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
        <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <History color="primary" />
                <Typography variant="h6" fontWeight={600}>
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
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {revisionHistory.map((revision) => {
                            const isCurrent = revision.id === currentRevisionId;
                            return (
                                <TableRow
                                    key={revision.id}
                                    sx={{
                                        bgcolor: isCurrent ? 'action.selected' : 'transparent',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                >
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" fontWeight={600}>
                                                {revision.revisionCode}
                                            </Typography>
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
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
