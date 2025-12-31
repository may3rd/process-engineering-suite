"use client";

import React, { useState, useMemo, MouseEvent } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Tooltip,
    Card,
    CardContent,
    Chip,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    Menu,
    MenuItem,
    useTheme,
} from "@mui/material";
import {
    Drafts,
    Calculate,
    Verified,
    CheckCircleOutline,
    Info,
    Edit,
    Visibility,
    Add,
    Air,
    Star,
    Warning as WarningIcon,
} from "@mui/icons-material";
import { v4 as uuidv4 } from "uuid";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectUnitSystem } from "@/lib/useProjectUnitSystem";
import { SizingCase, OverpressureScenario } from "@/data/types";
import { SortConfig, toggleSortConfig, sortByGetter } from "@/lib/sortUtils";
import { TableSortButton } from "@/components/shared/TableSortButton";
import {
    SIZING_STATUS_SEQUENCE,
    getSizingStatusColor,
    getSizingStatusLabel
} from "@/lib/statusColors";
import {
    convertValue,
    formatLocaleNumber,
    formatPressureGauge,
    formatTemperatureC,
    formatMassFlowKgH
} from "@/lib/projectUnits";
import { getDefaultUnitPreferences } from "@/lib/unitPreferences";

type SizingSortKey = 'scenario' | 'status' | 'created';

interface SizingTabProps {
    onEdit?: (id: string) => void;
    onCreate?: (id: string) => void;
}

export function SizingTab({ onEdit, onCreate }: SizingTabProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { unitSystem, units } = useProjectUnitSystem();
    const { sizingCaseList, scenarioList, selectedPsv, addSizingCase, updateSizingCase } = usePsvStore();
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const canCheck = useAuthStore((state) => ['lead', 'approver', 'admin'].includes(state.currentUser?.role || ''));
    const currentUser = useAuthStore((state) => state.currentUser);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [statusMenu, setStatusMenu] = useState<{ anchorEl: HTMLElement; sizing: SizingCase } | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig<SizingSortKey> | null>({ key: 'scenario', direction: 'asc' });

    const handleSort = (key: SizingSortKey) => {
        setSortConfig((prev) => toggleSortConfig(prev, key));
    };

    const getScenarioName = (scenarioId: string) => {
        const scenario = scenarioList.find(s => s.id === scenarioId);
        if (!scenario) return 'Unknown';
        return scenario.cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const getSortValue = (sizing: SizingCase, key: SizingSortKey): string | number => {
        switch (key) {
            case 'scenario':
                return getScenarioName(sizing.scenarioId).toLowerCase();
            case 'status':
                return sizing.status;
            case 'created':
                return sizing.createdAt ? new Date(sizing.createdAt).getTime() : 0;
            default:
                return '';
        }
    };

    const sortedSizingCases = useMemo(
        () => sortByGetter(sizingCaseList, sortConfig, getSortValue),
        [sizingCaseList, sortConfig, scenarioList]
    );

    const sizingStatusOptions = SIZING_STATUS_SEQUENCE.map((status) => ({
        value: status,
        label: getSizingStatusLabel(status),
        icon:
            status === 'draft' ? <Drafts fontSize="small" /> :
                status === 'calculated' ? <Calculate fontSize="small" /> :
                    status === 'verified' ? <Verified fontSize="small" /> :
                        <CheckCircleOutline fontSize="small" />,
    }));

    const sizingStatusPermission = (status: SizingCase['status']) => {
        switch (status) {
            case 'draft':
            case 'calculated':
                return canEdit;
            case 'verified':
                return canCheck;
            case 'approved':
                return canApprove;
            default:
                return false;
        }
    };

    const canTransitionToStatus = (sizing: SizingCase, target: SizingCase['status']) => {
        if (sizing.status === target) return false;
        const currentIndex = SIZING_STATUS_SEQUENCE.indexOf(sizing.status);
        const targetIndex = SIZING_STATUS_SEQUENCE.indexOf(target);
        if (currentIndex === -1 || targetIndex === -1) return false;
        const sequential = targetIndex <= currentIndex || targetIndex === currentIndex + 1;
        return sequential && sizingStatusPermission(target);
    };

    const hasStatusActions = (sizing: SizingCase) =>
        SIZING_STATUS_SEQUENCE.some(status => canTransitionToStatus(sizing, status));

    const handleStatusMenuOpen = (event: MouseEvent<HTMLElement>, sizing: SizingCase) => {
        if (!hasStatusActions(sizing)) return;
        setStatusMenu({ anchorEl: event.currentTarget, sizing });
    };

    const handleStatusMenuClose = () => setStatusMenu(null);

    const handleStatusSelect = (nextStatus: SizingCase['status']) => {
        if (!statusMenu) return;
        const { sizing } = statusMenu;
        if (!canTransitionToStatus(sizing, nextStatus)) return;
        updateSizingCase({
            ...sizing,
            status: nextStatus,
            approvedBy: nextStatus === 'approved' ? currentUser?.id : undefined,
        });
        handleStatusMenuClose();
    };

    const handleCreateSizingCase = (scenario: OverpressureScenario) => {
        if (!selectedPsv) return;

        const methodMap: Record<string, 'gas' | 'liquid' | 'steam' | 'two_phase'> = {
            'gas': 'gas',
            'liquid': 'liquid',
            'steam': 'steam',
            'two_phase': 'two_phase',
        };

        const newCase: SizingCase = {
            id: uuidv4(),
            protectiveSystemId: selectedPsv.id,
            scenarioId: scenario.id,
            standard: 'API-520',
            method: methodMap[scenario.phase] || 'gas',
            inputs: {
                massFlowRate: scenario.relievingRate,
                molecularWeight: 28,
                temperature: scenario.relievingTemp,
                pressure: selectedPsv.setPressure * (1 + (scenario.accumulationPct / 100)),
                compressibilityZ: 1.0,
                specificHeatRatio: 1.4,
                backpressure: 0,
                backpressureType: 'superimposed',
                setPressure: scenario.setPressure ?? selectedPsv.setPressure,
                valveType: selectedPsv.valveType === 'balanced_bellows' ? 'balanced'
                    : selectedPsv.valveType === 'pilot_operated' ? 'pilot'
                        : 'conventional',
            },
            outputs: {
                requiredArea: 0,
                selectedOrifice: 'D',
                orificeArea: 71,
                percentUsed: 0,
                ratedCapacity: 0,
                dischargeCoefficient: scenario.phase === 'liquid' ? 0.65 : 0.975,
                backpressureCorrectionFactor: 1.0,
                isCriticalFlow: false,
                numberOfValves: 1,
                messages: [],
                requiredAreaIn2: 0,
            },
            unitPreferences: getDefaultUnitPreferences(unitSystem),
            status: 'draft',
            createdBy: selectedPsv.ownerId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        addSizingCase(newCase);
        setDialogOpen(false);

        if (onCreate) {
            onCreate(newCase.id);
        }
    };

    if (!selectedPsv) return null;

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexWrap: 'wrap',
                    gap: 1.5,
                    mb: 3,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '1 1 auto', minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Sizing Cases
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Sort:</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="caption">Scenario</Typography>
                            <TableSortButton
                                label="Scenario"
                                active={sortConfig?.key === 'scenario'}
                                direction={sortConfig?.direction ?? 'asc'}
                                onClick={() => handleSort('scenario')}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                            <Typography variant="caption">Status</Typography>
                            <TableSortButton
                                label="Status"
                                active={sortConfig?.key === 'status'}
                                direction={sortConfig?.direction ?? 'asc'}
                                onClick={() => handleSort('status')}
                            />
                        </Box>
                    </Box>
                </Box>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        size="small"
                        onClick={() => setDialogOpen(true)}
                        disabled={scenarioList.length === 0}
                        sx={{ flex: '0 0 auto', ml: 'auto', whiteSpace: 'nowrap' }}
                    >
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            New Sizing Case
                        </Box>
                    </Button>
                )}
            </Box>

            {(() => {
                const governingScenario = scenarioList.find(s => s.isGoverning);
                const governingSizingCase = governingScenario
                    ? sizingCaseList.find(c => c.scenarioId === governingScenario.id && c.status === 'calculated')
                    : null;
                const governingNotSized = governingScenario && !governingSizingCase;

                if (!governingNotSized) return null;

                return (
                    <Alert
                        severity="info"
                        sx={{ mb: 2 }}
                        action={
                            canEdit && (
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => setDialogOpen(true)}
                                >
                                    Create Sizing Case
                                </Button>
                            )
                        }
                    >
                        <strong>Governing scenario not sized.</strong> Create a sizing case for "{governingScenario.cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}" to enable hydraulic validation.
                    </Alert>
                );
            })()}

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Select Overpressure Scenario</DialogTitle>
                <DialogContent dividers>
                    {scenarioList.length > 0 ? (
                        <List disablePadding>
                            {scenarioList.map((scenario) => (
                                <ListItemButton
                                    key={scenario.id}
                                    onClick={() => handleCreateSizingCase(scenario)}
                                    sx={{ borderRadius: 1, mb: 1 }}
                                >
                                    <ListItemIcon>
                                        {scenario.isGoverning ? <Star color="warning" /> : <WarningIcon color="action" />}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography fontWeight={600}>
                                                    {scenario.cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                </Typography>
                                                {scenario.isGoverning && (
                                                    <Chip label="Governing" size="small" color="warning" />
                                                )}
                                            </Box>
                                        }
                                        secondary={`${formatMassFlowKgH(scenario.relievingRate, unitSystem, 0)} @ ${formatPressureGauge(scenario.relievingPressure, unitSystem, 2)}, ${formatTemperatureC(scenario.relievingTemp, unitSystem, 1)}`}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    ) : (
                        <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                            No scenarios available. Create a scenario first.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {sortedSizingCases.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sortedSizingCases.map((sizing) => (
                        <Card key={sizing.id}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="h6" fontWeight={600}>
                                                {getScenarioName(sizing.scenarioId)}
                                            </Typography>
                                            {scenarioList.find(s => s.id === sizing.scenarioId)?.isGoverning && (
                                                <Chip
                                                    icon={<Star sx={{ fontSize: 14 }} />}
                                                    label="Governing"
                                                    size="small"
                                                    color="warning"
                                                    variant="outlined"
                                                    sx={{ height: 22, '& .MuiChip-icon': { ml: 0.5 } }}
                                                />
                                            )}
                                            <Chip
                                                label={getSizingStatusLabel(sizing.status)}
                                                size="small"
                                                color={getSizingStatusColor(sizing.status)}
                                                sx={{ textTransform: 'capitalize', cursor: hasStatusActions(sizing) ? 'pointer' : 'default' }}
                                                onClick={hasStatusActions(sizing) ? (event) => handleStatusMenuOpen(event, sizing) : undefined}
                                            />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {sizing.standard} • {sizing.method.toUpperCase()} method
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {canEdit ? (
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => onEdit?.(sizing.id)}>
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Tooltip title="View Details">
                                                <IconButton size="small" onClick={() => onEdit?.(sizing.id)}>
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                        gap: 3,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Inputs</Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Mass Flow</Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {formatMassFlowKgH(sizing.inputs.massFlowRate, unitSystem, 0)}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">MW</Typography>
                                                <Typography variant="body2" fontWeight={500}>{sizing.inputs.molecularWeight}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Temperature</Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {formatTemperatureC(sizing.inputs.temperature, unitSystem, 1)}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Pressure</Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {formatPressureGauge(sizing.inputs.pressure, unitSystem, 2)}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Z Factor</Typography>
                                                <Typography variant="body2" fontWeight={500}>{sizing.inputs?.compressibilityZ ?? '-'}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">k (Cp/Cv)</Typography>
                                                <Typography variant="body2" fontWeight={500}>{sizing.inputs?.specificHeatRatio ?? '-'}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Backpressure</Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {typeof sizing.inputs?.backpressure === 'number'
                                                        ? formatPressureGauge(sizing.inputs.backpressure, unitSystem, 3)
                                                        : (sizing.inputs?.backpressure ?? '-')}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">BP Type</Typography>
                                                <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                                                    {sizing.inputs?.backpressureType?.replace('_', ' ') ?? '-'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>

                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.05)',
                                            border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.15)'}`,
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Results</Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Required Area</Typography>
                                                <Typography variant="body2" fontWeight={600} color="primary.main">
                                                    {sizing.outputs?.requiredArea !== undefined && sizing.outputs?.requiredArea !== null
                                                        ? `${formatLocaleNumber(convertValue(sizing.outputs.requiredArea, 'mm2', units.area.unit), 1)} ${units.area.label}`
                                                        : '-'}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Selected Orifice</Typography>
                                                <Typography variant="h5" fontWeight={700} color="primary.main">
                                                    {sizing.outputs?.selectedOrifice ?? '-'}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    {(sizing.outputs?.numberOfValves || 1) > 1 ? 'Total Orifice Area' : 'Orifice Area'}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {(() => {
                                                        const areaMm2 = (sizing.outputs?.orificeArea ?? 0) * (sizing.outputs?.numberOfValves || 1);
                                                        return `${formatLocaleNumber(convertValue(areaMm2, 'mm2', units.area.unit), 1)} ${units.area.label}`;
                                                    })()}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">% Used</Typography>
                                                <Typography variant="body2" fontWeight={600} color={
                                                    ((sizing.outputs?.requiredArea ?? 0) / ((sizing.outputs?.orificeArea ?? 1) * (sizing.outputs?.numberOfValves || 1)) * 100) > 90 ? 'warning.main' : 'text.primary'
                                                }>
                                                    {((sizing.outputs?.requiredArea ?? 0) / ((sizing.outputs?.orificeArea ?? 1) * (sizing.outputs?.numberOfValves || 1)) * 100).toFixed(1)}%
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Number of Valves</Typography>
                                                <Typography variant="body2" fontWeight={600} color={(sizing.outputs?.numberOfValves ?? 1) > 1 ? 'info.main' : 'text.primary'}>
                                                    {sizing.outputs?.numberOfValves || 1}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Rated Capacity</Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {sizing.outputs?.ratedCapacity !== undefined && sizing.outputs?.ratedCapacity !== null
                                                        ? formatMassFlowKgH(sizing.outputs.ratedCapacity, unitSystem, 0)
                                                        : '-'}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Flow Type</Typography>
                                                {(() => {
                                                    if (sizing.method === 'liquid') {
                                                        return <Chip label="Liquid Relief" size="small" color="info" />;
                                                    }
                                                    if (sizing.method === 'steam') {
                                                        return <Chip label="Steam Relief" size="small" color="warning" />;
                                                    }
                                                    return (
                                                        <Chip
                                                            label={sizing.outputs?.isCriticalFlow ? 'Critical' : 'Subcritical'}
                                                            size="small"
                                                            color={sizing.outputs?.isCriticalFlow ? 'success' : 'info'}
                                                        />
                                                    );
                                                })()}
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>

                                {sizing.outputs?.messages?.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <List dense disablePadding>
                                            {sizing.outputs?.messages?.map((msg, idx) => (
                                                <ListItem key={idx} disablePadding sx={{ py: 0.25 }}>
                                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                                        <Info sx={{ fontSize: 16, color: 'info.main' }} />
                                                    </ListItemIcon>
                                                    <ListItemText primary={msg} primaryTypographyProps={{ variant: 'body2' }} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    <Menu
                        anchorEl={statusMenu?.anchorEl}
                        open={Boolean(statusMenu)}
                        onClose={handleStatusMenuClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        {sizingStatusOptions.map((option) => {
                            const disabled = !statusMenu || !canTransitionToStatus(statusMenu.sizing, option.value);
                            return (
                                <MenuItem
                                    key={option.value}
                                    disabled={disabled}
                                    onClick={() => handleStatusSelect(option.value)}
                                >
                                    <ListItemIcon sx={{ color: disabled ? 'text.disabled' : 'inherit' }}>
                                        {option.icon}
                                    </ListItemIcon>
                                    <ListItemText primary={option.label} />
                                </MenuItem>
                            );
                        })}
                    </Menu>
                </Box>
            ) : (
                <Paper sx={{ py: 6, textAlign: 'center' }}>
                    <Air sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        No sizing cases
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Create a sizing case from an overpressure scenario
                    </Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
                        New Sizing Case
                    </Button>
                </Paper>
            )}
        </Box>
    );
}
