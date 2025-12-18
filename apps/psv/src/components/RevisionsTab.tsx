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
    IconButton,
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
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Add, HowToReg, History, Verified, CheckCircle, Person, Undo } from '@mui/icons-material';

import { usePsvStore } from '@/store/usePsvStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getUserById } from '@/data/mockData';
import type { RevisionHistory } from '@/data/types';
import { RevisionHistoryCard } from './RevisionHistoryCard';
import { NewRevisionDialog } from './NewRevisionDialog';
import { sortRevisionsByOriginatedAtDesc } from '@/lib/revisionSort';

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

    const canManualEdit = useMemo(() => {
        const role = currentUser?.role;
        return isAuthenticated && !!role && ['lead', 'approver', 'admin'].includes(role);
    }, [currentUser?.role, isAuthenticated]);

    const reload = async (): Promise<RevisionHistory[]> => {
        await loadRevisionHistory('protective_system', entityId);
        const history = usePsvStore
            .getState()
            .revisionHistory
            .filter((r) => r.entityType === 'protective_system' && r.entityId === entityId)
        const sorted = sortRevisionsByOriginatedAtDesc(history);
        setRevisions(sorted);
        return sorted;
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

            // Update PSV status to 'in_review' when originator signs
            if (selectedPsv) {
                await updatePsv({ ...selectedPsv, status: 'in_review' });
            }

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

            // Update PSV status to 'checked' when checker signs
            if (selectedPsv) {
                await updatePsv({ ...selectedPsv, status: 'checked' });
            }

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

            // Update PSV status to 'approved' when approver signs
            if (selectedPsv) {
                await updatePsv({ ...selectedPsv, status: 'approved' });
            }

            await reload();
        } finally {
            setIsSigning(null);
        }
    };

    const canRevoke = (signedBy?: string | null) =>
        !!signedBy && !!currentUser && isAuthenticated && (signedBy === currentUser.id || canManualEdit);

    const revokeOriginator = async () => {
        if (!currentRevision) return;
        if (!canRevoke(currentRevision.originatedBy)) return;
        setIsSigning('originator');
        try {
            // Cascades to keep revision progress consistent.
            await updateRevision(currentRevision.id, {
                originatedBy: null,
                originatedAt: null,
                checkedBy: null,
                checkedAt: null,
                approvedBy: null,
                approvedAt: null,
            });

            // Update PSV status back to 'draft' when originator is revoked
            if (selectedPsv) {
                await updatePsv({ ...selectedPsv, status: 'draft' });
            }

            await reload();
        } finally {
            setIsSigning(null);
        }
    };

    const revokeChecker = async () => {
        if (!currentRevision) return;
        if (!canRevoke(currentRevision.checkedBy)) return;
        setIsSigning('checker');
        try {
            // Cascades to keep revision progress consistent.
            await updateRevision(currentRevision.id, {
                checkedBy: null,
                checkedAt: null,
                approvedBy: null,
                approvedAt: null,
            });

            // Update PSV status back to 'in_review' when checker is revoked
            if (selectedPsv) {
                await updatePsv({ ...selectedPsv, status: 'in_review' });
            }

            await reload();
        } finally {
            setIsSigning(null);
        }
    };

    const revokeApprover = async () => {
        if (!currentRevision) return;
        if (!canRevoke(currentRevision.approvedBy)) return;
        setIsSigning('approver');
        try {
            await updateRevision(currentRevision.id, {
                approvedBy: null,
                approvedAt: null,
            });

            // Update PSV status back to 'checked' when approver is revoked
            if (selectedPsv) {
                await updatePsv({ ...selectedPsv, status: 'checked' });
            }

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
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexWrap: 'wrap',
                    gap: 2,
                    mb: 1,
                }}
            >
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <History color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            Revision Control
                        </Typography>
                        {currentRevision && (
                            <Chip label={`Rev. ${currentRevision.revisionCode}`} size="small" color="primary" variant="outlined" />
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
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                                Add Revision
                            </Box>
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            <Paper sx={{ p: 3, mb: 3 }}>

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
                                    canRevoke={canRevoke(currentRevision.originatedBy)}
                                    onRevoke={revokeOriginator}
                                    revokeLabel="Revoke originator"
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
                                    canRevoke={canRevoke(currentRevision.checkedBy)}
                                    onRevoke={revokeChecker}
                                    revokeLabel="Revoke checker"
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
                                    canRevoke={canRevoke(currentRevision.approvedBy)}
                                    onRevoke={revokeApprover}
                                    revokeLabel="Revoke approver"
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
    canRevoke,
    onRevoke,
    revokeLabel,
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
    canRevoke?: boolean;
    onRevoke?: () => void;
    revokeLabel?: string;
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title={fullName} placement="top">
                            <Chip
                                label={`${initials} / ${displayDate}`}
                                size="small"
                                variant="outlined"
                                sx={{ cursor: 'pointer' }}
                            />
                        </Tooltip>
                        {onRevoke && (
                            <Tooltip title={revokeLabel ?? 'Revoke signature'}>
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={onRevoke}
                                        disabled={!canRevoke || loading}
                                    >
                                        <Undo fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                    </Box>
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
