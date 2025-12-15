'use client';

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Chip,
    Divider,
    IconButton,
} from '@mui/material';
import { Close, History } from '@mui/icons-material';
import { RevisionHistory } from '@/data/types';
import { getUserById } from '@/data/mockData';

interface SnapshotPreviewDialogProps {
    open: boolean;
    onClose: () => void;
    revision: RevisionHistory | null;
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
 * SnapshotPreviewDialog shows a read-only view of entity state at a specific revision.
 */
export function SnapshotPreviewDialog({
    open,
    onClose,
    revision,
}: SnapshotPreviewDialogProps) {
    if (!revision) return null;

    const snapshot = revision.snapshot as Record<string, unknown>;

    // Extract key PSV fields from snapshot
    const psvFields = [
        { label: 'Tag', value: snapshot.tag },
        { label: 'Name', value: snapshot.name },
        { label: 'Type', value: snapshot.type },
        { label: 'Design Code', value: snapshot.designCode },
        { label: 'Set Pressure', value: snapshot.setPressure ? `${snapshot.setPressure} barg` : '-' },
        { label: 'MAWP', value: snapshot.mawp ? `${snapshot.mawp} barg` : '-' },
        { label: 'Service Fluid', value: snapshot.serviceFluid },
        { label: 'Fluid Phase', value: snapshot.fluidPhase },
        { label: 'Status', value: snapshot.status },
    ].filter(f => f.value);

    const originatorName = revision.originatedBy
        ? getUserById(revision.originatedBy)?.name || revision.originatedBy
        : '-';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <History color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            Snapshot: Rev. {revision.revisionCode}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent>
                {/* Revision Info */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Captured on {formatDate(revision.originatedAt)} by {originatorName}
                    </Typography>
                    {revision.description && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                            <strong>Description:</strong> {revision.description}
                        </Typography>
                    )}
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Snapshot Data */}
                {psvFields.length > 0 ? (
                    <Table size="small">
                        <TableBody>
                            {psvFields.map((field) => (
                                <TableRow key={field.label}>
                                    <TableCell
                                        component="th"
                                        sx={{
                                            fontWeight: 600,
                                            color: 'text.secondary',
                                            width: '40%',
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    >
                                        {field.label}
                                    </TableCell>
                                    <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                                        {typeof field.value === 'string' && field.label === 'Status' ? (
                                            <Chip
                                                label={String(field.value).replace('_', ' ')}
                                                size="small"
                                                sx={{ textTransform: 'capitalize' }}
                                            />
                                        ) : (
                                            String(field.value)
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        No snapshot data available for this revision.
                    </Typography>
                )}

                {/* Raw Snapshot (collapsed) */}
                {Object.keys(snapshot).length > psvFields.length && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            This snapshot contains {Object.keys(snapshot).length} fields total.
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
