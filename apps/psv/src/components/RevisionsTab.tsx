'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Button,
    Chip,
    Divider,
    Paper,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { Add, HowToReg, History, Verified, CheckCircle, Person } from '@mui/icons-material';

import { usePsvStore } from '@/store/usePsvStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getUserById } from '@/data/mockData';
import type { RevisionHistory } from '@/data/types';
import { RevisionHistoryCard } from './RevisionHistoryCard';
import { NewRevisionDialog } from './NewRevisionDialog';

function formatDate(dateString?: string | null): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function formatUser(userId?: string | null): { label: string; fullName: string } {
    if (!userId) return { label: '—', fullName: '—' };
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
    return { label: derived || '—', fullName: user.name };
}

interface RevisionsTabProps {
    entityId: string;
    currentRevisionId?: string;
}

export function RevisionsTab({ entityId, currentRevisionId }: RevisionsTabProps) {
    const { selectedPsv, updatePsv, loadRevisionHistory, updateRevision } = usePsvStore();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const currentUser = useAuthStore((state) => state.currentUser);
    const canEdit = useAuthStore((state) => state.canEdit());
    const canCreateRevision = isAuthenticated && canEdit;

    const canApproveSignature = useMemo(() => {
        const role = currentUser?.role;
        return !!role && ['lead', 'approver', 'admin'].includes(role);
    }, [currentUser?.role]);

    const [revisions, setRevisions] = useState<RevisionHistory[]>([]);
    const [isSigning, setIsSigning] = useState<null | 'originator' | 'checker' | 'approver'>(null);
    const [newRevisionOpen, setNewRevisionOpen] = useState(false);
    const [selectCurrentOpen, setSelectCurrentOpen] = useState(false);
    const [nextCurrentRevisionId, setNextCurrentRevisionId] = useState<string>('');

    const reload = async (): Promise<RevisionHistory[]> => {
        await loadRevisionHistory('protective_system', entityId);
        const history = usePsvStore
            .getState()
            .revisionHistory
            .filter((r) => r.entityType === 'protective_system' && r.entityId === entityId)
            .sort((a, b) => b.sequence - a.sequence);
        setRevisions(history);
        return history;
    };

    useEffect(() => {
        void reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityId]);

    const latestRevision = revisions[0];
    const effectiveCurrentRevisionId = currentRevisionId ?? latestRevision?.id;
    const currentRevision = (effectiveCurrentRevisionId
        ? revisions.find((r) => r.id === effectiveCurrentRevisionId)
        : undefined) ?? latestRevision;

    const signOriginator = async () => {
        if (!currentRevision || !isAuthenticated || !currentUser) return;
        if (currentRevision.originatedBy) return;
        setIsSigning('originator');
        try {
            await updateRevision(currentRevision.id, {
                originatedBy: currentUser.id,
                originatedAt: new Date().toISOString(),
            });
            await reload();
        } finally {
            setIsSigning(null);
        }
    };

    const signChecker = async () => {
        if (!currentRevision || !isAuthenticated || !currentUser) return;
        if (!currentRevision.originatedBy) return;
        if (currentRevision.checkedBy) return;
        setIsSigning('checker');
        try {
            await updateRevision(currentRevision.id, {
                checkedBy: currentUser.id,
                checkedAt: new Date().toISOString(),
            });
            await reload();
        } finally {
            setIsSigning(null);
        }
    };

    const signApprover = async () => {
        if (!currentRevision || !isAuthenticated || !currentUser) return;
        if (!canApproveSignature) return;
        if (!currentRevision.originatedBy || !currentRevision.checkedBy) return;
        if (currentRevision.approvedBy) return;
        setIsSigning('approver');
        try {
            await updateRevision(currentRevision.id, {
                approvedBy: currentUser.id,
                approvedAt: new Date().toISOString(),
            });
            await reload();
        } finally {
            setIsSigning(null);
        }
    };

    const handleRevisionDeleted = async (deletedId: string) => {
        if (deletedId !== effectiveCurrentRevisionId) return;
        const remaining = await reload();
        if (remaining.length === 0) {
            setNextCurrentRevisionId('');
            setSelectCurrentOpen(false);
            return;
        }

        setNextCurrentRevisionId(remaining[0].id);
        setSelectCurrentOpen(true);
    };

    const confirmSelectCurrent = async () => {
        if (!nextCurrentRevisionId) return;
        if (!selectedPsv || selectedPsv.id !== entityId) return;
        await updatePsv({ ...selectedPsv, currentRevisionId: nextCurrentRevisionId });
        setSelectCurrentOpen(false);
        await reload();
    };

    return (
        <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <History color="primary" />
                            <Typography variant="h6" fontWeight={600}>
                                Revision Control
                            </Typography>
                            {currentRevision && (
                                <Chip
                                    label={`Rev. ${currentRevision.revisionCode}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            )}
                            {currentRevision && currentRevision.id === effectiveCurrentRevisionId && (
                                <Chip label="Current" size="small" color="primary" />
                            )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Sign the current revision and review the full change history.
                        </Typography>
                    </Box>
                    <Tooltip title={canCreateRevision ? 'Add a new revision (snapshots current state)' : 'Sign in as Engineer+ to add revisions'}>
                        <span>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<Add />}
                                onClick={() => setNewRevisionOpen(true)}
                                disabled={!canCreateRevision}
                            >
                                Add Revision
                            </Button>
                        </span>
                    </Tooltip>
                </Box>

                {!isAuthenticated && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Sign in to sign as Originator / Checker / Approver.
                    </Alert>
                )}

                {revisions.length === 1 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        This PSV has only one revision. Deleting the last revision is disabled.
                    </Alert>
                )}

                <Divider sx={{ my: 2 }} />

                {!currentRevision ? (
                    <Typography variant="body2" color="text.secondary">
                        No revisions found for this PSV.
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        {currentRevision.description && (
                            <Typography variant="body2" color="text.secondary">
                                {currentRevision.description}
                            </Typography>
                        )}

                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Stack spacing={1.5}>
                                <SignatureRow
                                    icon={<Person sx={{ fontSize: 18, color: 'text.secondary' }} />}
                                    label="Originator"
                                    userId={currentRevision.originatedBy}
                                    date={currentRevision.originatedAt}
                                    canSign={isAuthenticated && !!currentUser && !currentRevision.originatedBy}
                                    signLabel="Sign for"
                                    onSign={signOriginator}
                                    loading={isSigning === 'originator'}
                                />
                                <SignatureRow
                                    icon={<CheckCircle sx={{ fontSize: 18, color: 'text.secondary' }} />}
                                    label="Checker"
                                    userId={currentRevision.checkedBy}
                                    date={currentRevision.checkedAt}
                                    canSign={
                                        isAuthenticated
                                        && !!currentUser
                                        && !!currentRevision.originatedBy
                                        && !currentRevision.checkedBy
                                    }
                                    signLabel="Sign for"
                                    signDisabledReason={
                                        !isAuthenticated
                                            ? 'Sign in to sign'
                                            : !currentRevision.originatedBy
                                                ? 'Originator must sign first'
                                                : undefined
                                    }
                                    onSign={signChecker}
                                    loading={isSigning === 'checker'}
                                />
                                <SignatureRow
                                    icon={<Verified sx={{ fontSize: 18, color: 'text.secondary' }} />}
                                    label="Approver"
                                    userId={currentRevision.approvedBy}
                                    date={currentRevision.approvedAt}
                                    canSign={
                                        isAuthenticated
                                        && !!currentUser
                                        && canApproveSignature
                                        && !!currentRevision.originatedBy
                                        && !!currentRevision.checkedBy
                                        && !currentRevision.approvedBy
                                    }
                                    signLabel="Sign for"
                                    signDisabledReason={
                                        !isAuthenticated
                                            ? 'Sign in to sign'
                                            : !currentRevision.originatedBy
                                                ? 'Originator must sign first'
                                                : !currentRevision.checkedBy
                                                    ? 'Checker must sign first'
                                                    : !canApproveSignature
                                                ? 'Requires Lead/Approver/Admin role'
                                                : undefined
                                    }
                                    onSign={signApprover}
                                    loading={isSigning === 'approver'}
                                />
                            </Stack>
                        </Paper>
                    </Stack>
                )}
            </Paper>

            <RevisionHistoryCard
                entityType="protective_system"
                entityId={entityId}
                currentRevisionId={effectiveCurrentRevisionId}
                onRevisionDeleted={handleRevisionDeleted}
            />

            <NewRevisionDialog
                open={newRevisionOpen}
                onClose={() => setNewRevisionOpen(false)}
                entityType="protective_system"
                entityId={entityId}
                currentRevisionCode={currentRevision?.revisionCode}
                onSuccess={async () => {
                    setNewRevisionOpen(false);
                    await reload();
                }}
            />

            <Dialog open={selectCurrentOpen} onClose={() => setSelectCurrentOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Select new current revision</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        The current revision was deleted. Select a new current revision for this PSV.
                    </Typography>
                    <FormControl fullWidth size="small">
                        <InputLabel>Current Revision</InputLabel>
                        <Select
                            value={nextCurrentRevisionId}
                            label="Current Revision"
                            onChange={(e) => setNextCurrentRevisionId(e.target.value)}
                        >
                            {revisions.map((revision) => (
                                <MenuItem key={revision.id} value={revision.id}>
                                    {`Rev. ${revision.revisionCode}`} {revision.description ? `— ${revision.description}` : ''}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectCurrentOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={confirmSelectCurrent} disabled={!nextCurrentRevisionId}>
                        Set Current
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function SignatureRow({
    icon,
    label,
    userId,
    date,
    canSign,
    signLabel,
    signDisabledReason,
    onSign,
    loading,
}: {
    icon: ReactNode;
    label: string;
    userId?: string | null;
    date?: string | null;
    canSign: boolean;
    signLabel: string;
    signDisabledReason?: string;
    onSign: () => void;
    loading: boolean;
}) {
    const signed = !!userId;
    const { label: initials, fullName } = formatUser(userId);
    const displayDate = formatDate(date);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {icon}
                <Typography variant="body2" sx={{ minWidth: 90 }} color="text.secondary">
                    {label}
                </Typography>
                {signed ? (
                    <Tooltip title={fullName} placement="top">
                        <Chip
                            label={`${initials} / ${displayDate}`}
                            size="small"
                            variant="outlined"
                            sx={{ cursor: 'pointer' }}
                        />
                    </Tooltip>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Not signed
                    </Typography>
                )}
            </Box>
            {!signed && (
                <Tooltip title={signDisabledReason ?? ''} disableHoverListener={!signDisabledReason}>
                    <span>
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<HowToReg fontSize="small" />}
                            onClick={onSign}
                            disabled={!canSign || loading}
                        >
                            {loading ? 'Signing…' : signLabel}
                        </Button>
                    </span>
                </Tooltip>
            )}
        </Box>
    );
}
