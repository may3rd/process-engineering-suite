'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardActions,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    LinearProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Backup, Restore, Warning } from '@mui/icons-material';
import { glassCardStyles } from './styles';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type DataSource = 'mock' | 'database';

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function SystemTab() {
    const [dataSource, setDataSource] = useState<DataSource | null>(null);
    const [loadingSource, setLoadingSource] = useState(false);
    const [backupBusy, setBackupBusy] = useState(false);
    const [restoreBusy, setRestoreBusy] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);

    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const restoreAllowed = useMemo(
        () => confirmText.trim().toUpperCase() === 'RESTORE' && !!selectedFile,
        [confirmText, selectedFile]
    );

    const loadSource = async () => {
        setLoadingSource(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/data-source`);
            if (!res.ok) throw new Error('Failed to load data source');
            const json = (await res.json()) as { source?: DataSource };
            setDataSource(json.source ?? null);
        } catch (err) {
            setDataSource(null);
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load data source' });
        } finally {
            setLoadingSource(false);
        }
    };

    useEffect(() => {
        void loadSource();
    }, []);

    const handleBackup = async () => {
        setBackupBusy(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/backup`);
            if (!res.ok) {
                const detail = await res.json().catch(() => ({ detail: 'Backup failed' }));
                throw new Error(detail.detail || 'Backup failed');
            }

            const contentType = (res.headers.get('content-type') || '').toLowerCase();
            const contentDisposition = res.headers.get('content-disposition');
            const defaultName = contentType.includes('json') ? 'engsuite_backup.json' : 'engsuite_backup.sql';
            const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || defaultName;
            const blob = await res.blob();
            downloadBlob(blob, filename);
            setMessage({ type: 'success', text: 'Backup downloaded.' });
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Backup failed' });
        } finally {
            setBackupBusy(false);
        }
    };

    const handlePickFile = () => {
        fileInputRef.current?.click();
    };

    const handleRestore = async () => {
        if (!selectedFile) return;
        setRestoreBusy(true);
        setMessage(null);
        try {
            const form = new FormData();
            form.append('file', selectedFile);
            const res = await fetch(`${API_BASE_URL}/admin/restore`, {
                method: 'POST',
                body: form,
            });
            if (!res.ok) {
                const detail = await res.json().catch(() => ({ detail: 'Restore failed' }));
                throw new Error(detail.detail || 'Restore failed');
            }
            const json = (await res.json()) as { message?: string };
            setMessage({ type: 'success', text: json.message || 'Restore completed.' });
            setRestoreDialogOpen(false);
            setConfirmText('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Restore failed' });
        } finally {
            setRestoreBusy(false);
        }
    };

    const restoreHelp = dataSource === 'database'
        ? 'Restoring will overwrite ALL data in the database and may temporarily disrupt active sessions.'
        : 'In mock mode, restore replaces in-memory data (lost on restart).';

    const restoreAccept = dataSource === 'database' ? '.sql' : '.json';

    return (
        <Box>
            <PaperHeader
                title="System"
                subtitle="Backup and restore data for the PSV workspace."
                loading={loadingSource}
                badge={dataSource ? `Data source: ${dataSource}` : 'Data source: unknown'}
            />

            {message && (
                <Alert severity={message.type} sx={{ mb: 2 }}>
                    {message.text}
                </Alert>
            )}

            <Stack spacing={2}>
                <Card sx={{ ...glassCardStyles, borderRadius: '12px' }}>
                    <CardContent>
                        <Stack spacing={1}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={650}>
                                        Backup
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Download a snapshot of the current workspace data.
                                    </Typography>
                                </Box>
                                <Chip
                                    icon={<Backup />}
                                    label={dataSource ? `${dataSource}` : 'unknown'}
                                    variant="outlined"
                                />
                            </Box>
                            <Divider />
                            <Typography variant="body2" color="text.secondary">
                                Recommended: take a backup before running bulk edits or restores.
                            </Typography>
                        </Stack>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            startIcon={<Backup />}
                            onClick={handleBackup}
                            disabled={backupBusy}
                        >
                            {backupBusy ? 'Preparing…' : 'Download Backup'}
                        </Button>
                    </CardActions>
                    {backupBusy && <LinearProgress />}
                </Card>

                <Card sx={{ ...glassCardStyles, borderRadius: '12px' }}>
                    <CardContent>
                        <Stack spacing={1}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={650}>
                                        Restore
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Overwrite the workspace from a backup file.
                                    </Typography>
                                </Box>
                                <Chip
                                    icon={<Restore />}
                                    color="warning"
                                    variant="outlined"
                                    label="Destructive"
                                />
                            </Box>
                            <Divider />
                            <Alert severity="warning" icon={<Warning />} sx={{ mb: 0 }}>
                                {restoreHelp}
                            </Alert>
                        </Stack>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', gap: 1 }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={restoreAccept}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                setSelectedFile(f);
                            }}
                        />
                        <Button variant="outlined" onClick={handlePickFile} startIcon={<Restore />}>
                            Choose File
                        </Button>
                        <Button
                            variant="contained"
                            color="warning"
                            onClick={() => setRestoreDialogOpen(true)}
                            disabled={!selectedFile}
                        >
                            Restore…
                        </Button>
                    </CardActions>
                </Card>
            </Stack>

            <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Restore backup?</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Alert severity="warning" icon={<Warning />}>
                            This action overwrites existing data and cannot be undone.
                        </Alert>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Selected file
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                                {selectedFile?.name ?? '—'}
                            </Typography>
                        </Box>
                        <TextField
                            label='Type "RESTORE" to confirm'
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            fullWidth
                            disabled={restoreBusy}
                        />
                        {restoreBusy && <LinearProgress />}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRestoreDialogOpen(false)} disabled={restoreBusy}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        startIcon={<Warning />}
                        onClick={handleRestore}
                        disabled={!restoreAllowed || restoreBusy}
                    >
                        Restore Now
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function PaperHeader({
    title,
    subtitle,
    loading,
    badge,
}: {
    title: string;
    subtitle: string;
    loading: boolean;
    badge: string;
}) {
    return (
        <Box sx={{ mb: 2 }}>
            <PaperLike>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                        <Typography variant="h5" fontWeight={700}>
                            {title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {subtitle}
                        </Typography>
                    </Box>
                    <Chip label={badge} variant="outlined" />
                </Box>
                {loading && <LinearProgress sx={{ mt: 2 }} />}
            </PaperLike>
        </Box>
    );
}

function PaperLike({ children }: { children: React.ReactNode }) {
    return (
        <Box
            sx={{
                ...glassCardStyles,
                borderRadius: '12px',
                p: { xs: 2, sm: 3 },
            }}
        >
            {children}
        </Box>
    );
}
