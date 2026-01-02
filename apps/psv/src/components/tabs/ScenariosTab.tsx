"use client";

import React, { useState, useMemo } from 'react';
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
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme,
} from "@mui/material";
import {
    Block,
    LocalFireDepartment,
    BrokenImage,
    FlashOff,
    WaterDrop,
    Warning as WarningIcon,
    Star,
    Edit,
    ExpandLess,
    Visibility,
    FileDownload,
    Download,
    Add,
    CheckCircle,
} from "@mui/icons-material";
import { v4 as uuidv4 } from "uuid";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectUnitSystem } from "@/lib/useProjectUnitSystem";
import { ScenarioCause, OverpressureScenario } from "@/data/types";
import { exportScenariosToExcel } from "@/lib/export/excelExport";
import { ScenarioEditor } from "../ScenarioEditor";
import { FireCaseDialog } from "../scenarios/FireCaseDialog";
import { ScenarioTemplateSelector } from "../scenarios/ScenarioTemplateSelector";
import { BlockedOutletDialog } from "../scenarios/BlockedOutletDialog";
import { ControlValveFailureDialog } from "../scenarios/ControlValveFailureDialog";
import { TubeRuptureDialog } from "../scenarios/TubeRuptureDialog";
import { SortConfig, toggleSortConfig, sortByGetter } from "@/lib/sortUtils";
import { TableSortButton } from "@/components/shared/TableSortButton";
import { MarkdownPreview } from "@/components/shared/MarkdownEditor";
import { formatPressureGauge, formatTemperatureC, formatMassFlowKgH } from "@/lib/projectUnits";

type ScenarioSortKey = 'cause' | 'rate' | 'created';

export function ScenariosTab() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { unitSystem } = useProjectUnitSystem();
    const { scenarioList, selectedPsv, addScenario, updateScenario, softDeleteScenario } = usePsvStore();
    const canEdit = useAuthStore((state) => state.canEdit());

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingScenario, setEditingScenario] = useState<OverpressureScenario | undefined>(undefined);
    const [fireDialogOpen, setFireDialogOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig<ScenarioSortKey> | null>({ key: 'cause', direction: 'asc' });

    const [expandedCaseConsiderationByScenarioId, setExpandedCaseConsiderationByScenarioId] = useState<Record<string, boolean>>({});

    const handleSort = (key: ScenarioSortKey) => {
        setSortConfig((prev) => toggleSortConfig(prev, key));
    };

    const getCauseIcon = (cause: ScenarioCause) => {
        switch (cause) {
            case 'blocked_outlet':
                return <Block />;
            case 'fire_case':
                return <LocalFireDepartment />;
            case 'tube_rupture':
                return <BrokenImage />;
            case 'utility_failure':
            case 'power_failure':
                return <FlashOff />;
            case 'thermal_expansion':
                return <WaterDrop />;
            default:
                return <WarningIcon />;
        }
    };

    const getCauseLabel = (cause: ScenarioCause) => {
        return cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const getSortValue = (scenario: OverpressureScenario, key: ScenarioSortKey): string | number => {
        switch (key) {
            case 'cause':
                return getCauseLabel(scenario.cause).toLowerCase();
            case 'rate':
                return scenario.relievingRate;
            case 'created':
                return scenario.createdAt ? new Date(scenario.createdAt).getTime() : 0;
            default:
                return '';
        }
    };

    const sortedScenarios = useMemo(
        () => sortByGetter(scenarioList.filter(s => s.isActive !== false), sortConfig, getSortValue),
        [scenarioList, sortConfig]
    );

    const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
    const [blockedOutletOpen, setBlockedOutletOpen] = useState(false);
    const [cvFailureOpen, setCvFailureOpen] = useState(false);
    const [tubeRuptureOpen, setTubeRuptureOpen] = useState(false);

    const handleAddScenario = () => {
        setTemplateSelectorOpen(true);
    };

    const handleTemplateSelect = (template: 'fire_case' | 'blocked_outlet' | 'control_valve_failure' | 'tube_rupture' | 'generic') => {
        setTemplateSelectorOpen(false);
        if (template === 'fire_case') {
            setFireDialogOpen(true);
        } else if (template === 'blocked_outlet') {
            setBlockedOutletOpen(true);
        } else if (template === 'control_valve_failure') {
            setCvFailureOpen(true);
        } else if (template === 'tube_rupture') {
            setTubeRuptureOpen(true);
        } else {
            setEditingScenario(undefined);
            setEditorOpen(true);
        }
    };

    const handleEditScenario = (scenario: OverpressureScenario) => {
        setEditingScenario(scenario);
        setEditorOpen(true);
    };

    const handleSaveScenario = (scenario: Partial<OverpressureScenario>) => {
        if (!selectedPsv) return;

        const now = new Date().toISOString();
        const scenarioId = scenario.id;
        const existingScenario = scenarioId ? scenarioList.find((s) => s.id === scenarioId) : editingScenario;
        const shouldUpdate = !!existingScenario && (scenarioId ? existingScenario.id === scenarioId : true);

        if (shouldUpdate) {
            updateScenario({ ...existingScenario, ...scenario, updatedAt: now } as OverpressureScenario);
        } else {
            const relievingRate = scenario.relievingRate ?? 0;
            addScenario({
                id: scenarioId ?? uuidv4(),
                protectiveSystemId: selectedPsv.id,
                cause: scenario.cause ?? 'blocked_outlet',
                description: scenario.description ?? '',
                relievingTemp: scenario.relievingTemp ?? 0,
                relievingPressure: scenario.relievingPressure ?? selectedPsv.setPressure * 1.1,
                phase: scenario.phase ?? 'gas',
                relievingRate,
                accumulationPct: scenario.accumulationPct ?? 10,
                requiredCapacity: scenario.requiredCapacity ?? relievingRate,
                assumptions: scenario.assumptions ?? [],
                codeRefs: scenario.codeRefs ?? [],
                isGoverning: scenario.isGoverning ?? false,
                setPressure: scenario.setPressure ?? selectedPsv.setPressure,
                currentRevisionId: scenario.currentRevisionId,
                caseConsideration: scenario.caseConsideration,
                createdAt: scenario.createdAt ?? now,
                updatedAt: now,
            });
        }
        setEditorOpen(false);
        setEditingScenario(undefined);
        setBlockedOutletOpen(false);
        setCvFailureOpen(false);
        setTubeRuptureOpen(false);
    };

    const handleToggleGoverning = (scenarioId: string, isGoverning: boolean) => {
        if (!selectedPsv) return;

        if (isGoverning) {
            sortedScenarios.forEach(s => {
                if (s.id !== scenarioId && s.isGoverning) {
                    updateScenario({ ...s, isGoverning: false });
                }
            });
        }

        const target = sortedScenarios.find(s => s.id === scenarioId);
        if (target) {
            updateScenario({ ...target, isGoverning });
        }
    };

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [scenarioToDelete, setScenarioToDelete] = useState<OverpressureScenario | null>(null);

    const handleDeleteScenarioClick = (scenario: OverpressureScenario) => {
        setScenarioToDelete(scenario);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (scenarioToDelete) {
            await softDeleteScenario(scenarioToDelete.id);
            setDeleteDialogOpen(false);
            setScenarioToDelete(null);
        }
    };

    const handleForceDelete = async () => {
        if (scenarioToDelete) {
            const { deleteScenario } = usePsvStore.getState();
            await deleteScenario(scenarioToDelete.id);
            setDeleteDialogOpen(false);
            setScenarioToDelete(null);
        }
    };

    const handleFireCaseSave = (fireScenario: Partial<OverpressureScenario>) => {
        if (!selectedPsv) return;

        const now = new Date().toISOString();
        const completeScenario: OverpressureScenario = {
            id: uuidv4(),
            protectiveSystemId: selectedPsv.id,
            cause: 'fire_case',
            description: fireScenario.description || 'External fire exposure',
            relievingTemp: fireScenario.relievingTemp || 50,
            relievingPressure: fireScenario.relievingPressure || selectedPsv.setPressure * 1.21,
            phase: fireScenario.phase || 'gas',
            relievingRate: fireScenario.relievingRate || 0,
            accumulationPct: fireScenario.accumulationPct ?? 21,
            requiredCapacity: fireScenario.relievingRate || 0,
            assumptions: fireScenario.assumptions || [],
            codeRefs: fireScenario.codeRefs || ['API-521 Section 4.4'],
            isGoverning: false,
            setPressure: fireScenario.setPressure ?? selectedPsv.setPressure,
            caseConsideration: fireScenario.caseConsideration,
            fireCalculation: fireScenario.fireCalculation,
            createdAt: now,
            updatedAt: now,
        };

        addScenario(completeScenario);
        setFireDialogOpen(false);
    };

    if (!selectedPsv) return null;

    const ALL_SCENARIO_CAUSES: { cause: ScenarioCause; label: string }[] = [
        { cause: 'blocked_outlet', label: 'Blocked Outlet' },
        { cause: 'fire_case', label: 'Fire Case' },
        { cause: 'tube_rupture', label: 'Tube Rupture' },
        { cause: 'thermal_expansion', label: 'Thermal Expansion' },
        { cause: 'utility_failure', label: 'Utility Failure' },
        { cause: 'control_valve_failure', label: 'Control Valve Failure' },
        { cause: 'power_failure', label: 'Power Failure' },
        { cause: 'cooling_water_failure', label: 'Cooling Water Failure' },
        { cause: 'reflux_failure', label: 'Loss of Reflux' },
        { cause: 'abnormal_heat_input', label: 'Abnormal Heat Input' },
        { cause: 'check_valve_failure', label: 'Check Valve Failure' },
        { cause: 'other', label: 'Other' },
    ];

    const addedCauses = new Set(scenarioList.map(s => s.cause));

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Overpressure Scenarios
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Sort:</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="caption">Cause</Typography>
                            <TableSortButton
                                label="Cause"
                                active={sortConfig?.key === 'cause'}
                                direction={sortConfig?.direction ?? 'asc'}
                                onClick={() => handleSort('cause')}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                            <Typography variant="caption">Rate</Typography>
                            <TableSortButton
                                label="Rate"
                                active={sortConfig?.key === 'rate'}
                                direction={sortConfig?.direction ?? 'asc'}
                                onClick={() => handleSort('rate')}
                            />
                        </Box>
                    </Box>
                </Box>
                {canEdit && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<FileDownload />}
                            size="small"
                            onClick={() => exportScenariosToExcel(scenarioList, selectedPsv!, unitSystem)}
                            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                            Export Excel
                        </Button>
                        <Tooltip title="Export Excel">
                            <IconButton
                                size="small"
                                onClick={() => exportScenariosToExcel(scenarioList, selectedPsv!, unitSystem)}
                                sx={{
                                    display: { xs: 'inline-flex', sm: 'none' },
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                }}
                            >
                                <Download />
                            </IconButton>
                        </Tooltip>
                        <IconButton
                            size="small"
                            onClick={handleAddScenario}
                            sx={{
                                display: { xs: 'inline-flex', sm: 'none' },
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                '&:hover': { bgcolor: 'primary.dark' },
                            }}
                        >
                            <Add />
                        </IconButton>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            size="small"
                            onClick={handleAddScenario}
                            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                            Add Scenario
                        </Button>
                    </Box>
                )}
            </Box>

            <Box
                sx={{
                    display: 'flex',
                    columnGap: 1,
                    rowGap: 1,
                    mb: 3,
                    flexWrap: 'wrap',
                }}
            >
                {ALL_SCENARIO_CAUSES.map(({ cause, label }) => {
                    const isAdded = addedCauses.has(cause);
                    return (
                        <Typography
                            key={cause}
                            variant="body2"
                            sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 2,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                fontWeight: isAdded ? 600 : 400,
                                color: isAdded ? 'success.main' : 'text.disabled',
                                bgcolor: isAdded
                                    ? (theme) => theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)'
                                    : 'transparent',
                                border: 1,
                                borderColor: isAdded ? 'success.main' : 'divider',
                                opacity: isAdded ? 1 : 0.6,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {label}
                        </Typography>
                    );
                })}
            </Box>

            {(() => {
                const governingScenarios = scenarioList.filter(s => s.isGoverning);
                const hasNoGoverning = scenarioList.length > 0 && governingScenarios.length === 0;
                const hasMultipleGoverning = governingScenarios.length > 1;

                return (
                    <>
                        {hasMultipleGoverning && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                <strong>Multiple governing scenarios selected.</strong> Only one scenario should be marked as governing.
                            </Alert>
                        )}
                        {hasNoGoverning && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <strong>No governing scenario selected.</strong> Mark one scenario as governing.
                            </Alert>
                        )}
                    </>
                );
            })()}

            <Dialog
                open={editorOpen}
                onClose={() => {
                    setEditorOpen(false);
                    setEditingScenario(undefined);
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {editingScenario ? "Edit Scenario" : "Add Scenario"}
                </DialogTitle>
                <DialogContent dividers>
                    {selectedPsv && (
                        <ScenarioEditor
                            psvId={selectedPsv.id}
                            initialData={editingScenario}
                            onSave={handleSaveScenario}
                            onCancel={() => {
                                setEditorOpen(false);
                                setEditingScenario(undefined);
                            }}
                            onDelete={editingScenario ? () => handleDeleteScenarioClick(editingScenario) : undefined}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <ScenarioTemplateSelector
                open={templateSelectorOpen}
                onClose={() => setTemplateSelectorOpen(false)}
                onSelectTemplate={handleTemplateSelect}
            />

            <FireCaseDialog
                open={fireDialogOpen}
                onClose={() => setFireDialogOpen(false)}
                psvId={selectedPsv?.id || ''}
                areaId={selectedPsv?.areaId || ''}
                onSave={handleFireCaseSave}
            />

            <BlockedOutletDialog
                open={blockedOutletOpen}
                onClose={() => setBlockedOutletOpen(false)}
                psvId={selectedPsv.id}
                onSave={handleSaveScenario}
            />

            <ControlValveFailureDialog
                open={cvFailureOpen}
                onClose={() => setCvFailureOpen(false)}
                psvId={selectedPsv.id}
                onSave={handleSaveScenario}
            />

            <TubeRuptureDialog
                open={tubeRuptureOpen}
                onClose={() => setTubeRuptureOpen(false)}
                psvId={selectedPsv.id}
                onSave={handleSaveScenario}
            />
            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                onForceDelete={handleForceDelete}
                allowForceDelete={canEdit}
                title="Deactivate Scenario"
                itemName={scenarioToDelete ? getCauseLabel(scenarioToDelete.cause) : "scenario"}
            />

            {sortedScenarios.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sortedScenarios.map((scenario) => {
                        const isExpanded = !!expandedCaseConsiderationByScenarioId[scenario.id];
                        const canExpand = !!scenario.caseConsideration;

                        return (
                            <Card key={scenario.id}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 2,
                                                    backgroundColor: scenario.cause.includes('fire')
                                                        ? 'rgba(239, 68, 68, 0.15)'
                                                        : isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: scenario.cause.includes('fire') ? 'error.main' : 'secondary.main',
                                                }}
                                            >
                                                {getCauseIcon(scenario.cause)}
                                            </Box>
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="h6" fontWeight={600}>
                                                        {getCauseLabel(scenario.cause)}
                                                    </Typography>
                                                    <Tooltip title={scenario.isGoverning ? "Governing Case (Click to unset)" : "Set as Governing Case"}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleGoverning(scenario.id, !scenario.isGoverning);
                                                            }}
                                                            color={scenario.isGoverning ? "warning" : "default"}
                                                        >
                                                            {scenario.isGoverning ? <Star sx={{ fontSize: 20 }} /> : <Star sx={{ fontSize: 20, opacity: 0.2 }} />}
                                                        </IconButton>
                                                    </Tooltip>
                                                    {scenario.isGoverning && (
                                                        <Chip
                                                            label="Governing"
                                                            size="small"
                                                            color="warning"
                                                            variant="outlined"
                                                            sx={{ height: 24 }}
                                                        />
                                                    )}
                                                </Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    {scenario.description}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {canEdit && (
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => handleEditScenario(scenario)}>
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>

                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                            gap: 2,
                                            p: 2,
                                            borderRadius: 2,
                                            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                                            mb: 2,
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Relieving Rate</Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                {formatMassFlowKgH(scenario.relievingRate, unitSystem, 0)}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Relieving Pressure</Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                {formatPressureGauge(scenario.relievingPressure, unitSystem, 2)}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Relieving Temp</Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                {formatTemperatureC(scenario.relievingTemp, unitSystem, 1)}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Accumulation</Typography>
                                            <Typography variant="body1" fontWeight={600}>{scenario.accumulationPct}%</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Phase</Typography>
                                            <Typography variant="body1" fontWeight={600} sx={{ textTransform: 'uppercase' }}>{scenario.phase}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Required Capacity</Typography>
                                            <Typography variant="body1" fontWeight={600} color="primary.main">
                                                {formatMassFlowKgH(scenario.requiredCapacity, unitSystem, 0)}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Assumptions</Typography>
                                        <List dense disablePadding>
                                            {scenario.assumptions.map((assumption, idx) => (
                                                <ListItem key={idx} disablePadding sx={{ py: 0.25 }}>
                                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                                        <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                                                    </ListItemIcon>
                                                    <ListItemText primary={assumption} primaryTypographyProps={{ variant: 'body2' }} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {scenario.codeRefs.map((ref, idx) => (
                                            <Chip key={idx} label={ref} size="small" variant="outlined" />
                                        ))}
                                    </Box>

                                    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="subtitle2">Case Consideration</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {canExpand && (
                                                    <Button
                                                        size="small"
                                                        startIcon={isExpanded ? <ExpandLess /> : <Visibility />}
                                                        onClick={() => {
                                                            setExpandedCaseConsiderationByScenarioId((prev) => ({
                                                                ...prev,
                                                                [scenario.id]: !isExpanded,
                                                            }));
                                                        }}
                                                    >
                                                        {isExpanded ? 'Collapse' : 'Expand'}
                                                    </Button>
                                                )}
                                                {(canEdit || scenario.caseConsideration) && (
                                                    <Button
                                                        size="small"
                                                        onClick={() => {
                                                            usePsvStore.setState({
                                                                editingScenarioId: scenario.id,
                                                                currentPage: 'scenario_consideration',
                                                            });
                                                        }}
                                                    >
                                                        {canEdit
                                                            ? (scenario.caseConsideration ? 'Edit Full Page' : 'Add Details')
                                                            : 'View Full Page'}
                                                    </Button>
                                                )}
                                            </Box>
                                        </Box>
                                        {scenario.caseConsideration ? (
                                            <Paper
                                                variant="outlined"
                                                sx={{
                                                    p: 1.5,
                                                    bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                                                    ...(isExpanded
                                                        ? { overflow: 'visible' }
                                                        : { maxHeight: 120, overflow: 'hidden' }),
                                                    position: 'relative',
                                                    cursor: isExpanded ? 'default' : 'pointer',
                                                    ...(isExpanded
                                                        ? {}
                                                        : {
                                                            '&:hover': { borderColor: 'primary.main' },
                                                            '&::after': {
                                                                content: '""',
                                                                position: 'absolute',
                                                                bottom: 0,
                                                                left: 0,
                                                                right: 0,
                                                                height: 40,
                                                                background: isDark
                                                                    ? 'linear-gradient(transparent, rgba(30,30,30,1))'
                                                                    : 'linear-gradient(transparent, rgba(255,255,255,1))',
                                                            },
                                                        }),
                                                }}
                                                onClick={
                                                    isExpanded
                                                        ? undefined
                                                        : () => {
                                                            usePsvStore.setState({
                                                                editingScenarioId: scenario.id,
                                                                currentPage: 'scenario_consideration',
                                                            });
                                                        }
                                                }
                                            >
                                                <MarkdownPreview
                                                    content={scenario.caseConsideration}
                                                    maxLines={isExpanded ? undefined : 4}
                                                />
                                            </Paper>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                No case consideration documented yet.
                                            </Typography>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
            ) : (
                <Paper sx={{ py: 6, textAlign: 'center' }}>
                    <WarningIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        No scenarios defined
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Add overpressure scenarios to size this device
                    </Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={handleAddScenario}>
                        Add First Scenario
                    </Button>
                </Paper>
            )}
        </Box>
    );
}
