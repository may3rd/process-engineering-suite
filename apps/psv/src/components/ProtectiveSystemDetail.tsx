"use client";

import {
    Box,
    Tabs,
    Tab,
    Typography,
    Chip,
    Paper,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    useTheme,
    Card,
    CardContent,
    Button,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Checkbox,
    TextField,
    Menu,
    MenuItem,
    Fade,
    Alert,
} from "@mui/material";
import {
    Info,
    Warning as WarningIcon,
    LocalFireDepartment,
    Block,
    BrokenImage,
    FlashOff,
    WaterDrop,
    Air,
    AttachFile,
    Description,
    Note,
    CheckCircle,
    Edit,
    Add,
    AddCircle,
    Star,
    Calculate,
    Verified,
    Delete,
    KeyboardArrowDown,
    Drafts,
    RateReview,
    CheckCircleOutline,
    PublishedWithChanges,
    Visibility,
    ExpandLess,
} from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";
import { ScenarioCause, OverpressureScenario, SizingCase, Comment, TodoItem, ProtectiveSystem, ProjectNote } from "@/data/types";
import { SizingWorkspace } from "./SizingWorkspace";
import { ScenarioEditor } from "./ScenarioEditor"; // Import ScenarioEditor
import { getUserById, users } from "@/data/mockData";
import { useState, useEffect, MouseEvent, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { SortConfig, toggleSortConfig, sortByGetter } from "@/lib/sortUtils";
import { TableSortButton } from "@/components/shared/TableSortButton";
import { MarkdownPreview } from "@/components/shared/MarkdownEditor";
import { BasicInfoCard } from "./BasicInfoCard";
	import { OperatingConditionsCard } from "./OperatingConditionsCard";
	import { EquipmentCard } from "./EquipmentCard";
	import { TagsCard } from "./TagsCard";
	import { SummaryTab } from "./SummaryTab";
	import { RevisionsTab } from "./RevisionsTab";
	import { glassCardStyles } from "./styles";
	import { useAuthStore } from "@/store/useAuthStore";
import { PipelineHydraulicsCard } from "./PipelineHydraulicsCard";
import { WORKFLOW_STATUS_SEQUENCE, getWorkflowStatusColor, getWorkflowStatusLabel, SIZING_STATUS_SEQUENCE, getSizingStatusColor, getSizingStatusLabel } from "@/lib/statusColors";
import { RevisionBadge } from "./RevisionBadge";
import { NewRevisionDialog } from "./NewRevisionDialog";
	import { RevisionHistoryPanel } from "./RevisionHistoryPanel";
	import { SnapshotPreviewDialog } from "./SnapshotPreviewDialog";
import { RevisionHistory } from "@/data/types";
import { sortRevisionsByOriginatedAtDesc } from "@/lib/revisionSort";
import { useProjectUnitSystem } from "@/lib/useProjectUnitSystem";
import { convertValue, formatLocaleNumber, formatNumber, formatPressureGauge, formatTemperatureC, formatMassFlowKgH } from "@/lib/projectUnits";
import { getDefaultUnitPreferences } from "@/lib/unitPreferences";

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`psv-tabpanel-${index}`}
            aria-labelledby={`psv-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

// Overview Tab Content
function OverviewTab() {
    const { selectedPsv } = usePsvStore();
    const { unitSystem, units } = useProjectUnitSystem();

    if (!selectedPsv) return null;

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
            {/* Left Column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <BasicInfoCard psv={selectedPsv} />
                <EquipmentCard psv={selectedPsv} />
            </Box>

            {/* Right Column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <OperatingConditionsCard psv={selectedPsv} />
                <TagsCard psv={selectedPsv} />
            </Box>
        </Box>
    );
}

// Scenarios Tab Content
type ScenarioSortKey = 'cause' | 'rate' | 'created';

function ScenariosTab() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { unitSystem } = useProjectUnitSystem();
    const { scenarioList, selectedPsv, addScenario, updateScenario, deleteScenario } = usePsvStore();
    const canEdit = useAuthStore((state) => state.canEdit());
    const currentUser = useAuthStore((state) => state.currentUser);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingScenario, setEditingScenario] = useState<OverpressureScenario | undefined>(undefined);
    const [sortConfig, setSortConfig] = useState<SortConfig<ScenarioSortKey> | null>({ key: 'cause', direction: 'asc' });
    /**
     * Per-scenario UI state for the inline "Case Consideration" markdown block.
     * This allows quick reading (full expansion) without navigating away to the dedicated editor page.
     */
    const [expandedCaseConsiderationByScenarioId, setExpandedCaseConsiderationByScenarioId] = useState<Record<string, boolean>>({});

    const handleSort = (key: ScenarioSortKey) => {
        setSortConfig((prev) => toggleSortConfig(prev, key));
    };

    const getCauseIcon = (cause: ScenarioCause) => {
        switch (cause) {
            case 'blocked_outlet':
                return <Block />;
            case 'fire_case':
            case 'external_fire':
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
        () => sortByGetter(scenarioList, sortConfig, getSortValue),
        [scenarioList, sortConfig]
    );

    const handleAddScenario = () => {
        setEditingScenario(undefined);
        setEditorOpen(true);
    };

    const handleEditScenario = (scenario: OverpressureScenario) => {
        setEditingScenario(scenario);
        setEditorOpen(true);
    };

    const handleSaveScenario = (scenario: OverpressureScenario) => {
        if (editingScenario) {
            updateScenario(scenario);
        } else {
            addScenario(scenario);
        }
        setEditorOpen(false);
    };

    const handleDeleteScenario = (id: string) => {
        if (window.confirm("Are you sure you want to delete this scenario? This action cannot be undone.")) {
            deleteScenario(id);
            setEditorOpen(false);
        }
    };

    if (!selectedPsv) return null;

    // All possible scenario causes with display labels
    const ALL_SCENARIO_CAUSES: { cause: ScenarioCause; label: string }[] = [
        { cause: 'blocked_outlet', label: 'Blocked Outlet' },
        { cause: 'fire_case', label: 'Fire Case' },
        { cause: 'external_fire', label: 'External Fire' },
        { cause: 'tube_rupture', label: 'Tube Rupture' },
        { cause: 'thermal_expansion', label: 'Thermal Expansion' },
        { cause: 'utility_failure', label: 'Utility Failure' },
        { cause: 'control_valve_failure', label: 'Control Valve Failure' },
        { cause: 'power_failure', label: 'Power Failure' },
        { cause: 'cooling_water_failure', label: 'Cooling Water Failure' },
        { cause: 'check_valve_failure', label: 'Check Valve Failure' },
        { cause: 'other', label: 'Other' },
    ];

    // Get set of added scenario causes
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
                    <Button variant="contained" startIcon={<Add />} size="small" onClick={handleAddScenario}>
                        Add Scenario
                    </Button>
                )}
            </Box>

	            {/* Scenario Status Indicator Bar */}
	            <Box
	                sx={{
	                    display: 'flex',
	                    columnGap: 1,
	                    rowGap: 1,
	                    mb: 3,
	                    // Wrap on all viewports (mobile-first)
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

            {/* Governing Scenario Warnings */}
            {(() => {
                const governingScenarios = scenarioList.filter(s => s.isGoverning);
                const hasNoGoverning = scenarioList.length > 0 && governingScenarios.length === 0;
                const hasMultipleGoverning = governingScenarios.length > 1;

                return (
                    <>
                        {hasMultipleGoverning && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                <strong>Multiple governing scenarios selected.</strong> Only one scenario should be marked as governing. Edit scenarios to keep only one as governing.
                            </Alert>
                        )}
                        {hasNoGoverning && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <strong>No governing scenario selected.</strong> Mark one scenario as governing by editing it and enabling the "Governing" toggle.
                            </Alert>
                        )}
                    </>
                );
            })()}

            <Dialog
                open={editorOpen}
                onClose={() => setEditorOpen(false)}
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
                            onCancel={() => setEditorOpen(false)}
                            onDelete={editingScenario ? handleDeleteScenario : undefined}
                        />
                    )}
                </DialogContent>
            </Dialog>

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
                                                    {scenario.isGoverning && (
                                                        <Chip
                                                            label="Governing"
                                                            size="small"
                                                            color="warning"
                                                            icon={<Star sx={{ fontSize: 14 }} />}
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
                                            <Typography variant="body1" fontWeight={600} sx={{ textTransform: 'uppercase'}}>{scenario.phase}</Typography>
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

                                    {/* Case Consideration Preview */}
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
                                                        {/* Hide "Edit" wording when user is read-only; page still supports view mode. */}
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
                                                        // When expanded, allow selecting/scrolling content without navigating away.
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

// Sizing Tab Content
type SizingSortKey = 'scenario' | 'status' | 'created';

function SizingTab({ onEdit, onCreate }: { onEdit?: (id: string) => void; onCreate?: (id: string) => void }) {
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

        // Map fluid phase to sizing method
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
                molecularWeight: 28, // Default for gases
                temperature: scenario.relievingTemp,
                pressure: scenario.relievingPressure,
                compressibilityZ: 1.0,
                specificHeatRatio: 1.4,
                backpressure: 0,
                backpressureType: 'superimposed',
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

        // Open the new case for editing
        if (onCreate) {
            onCreate(newCase.id);
        }
    };

    if (!selectedPsv) return null;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                    >
                        New Sizing Case
                    </Button>
                )}
            </Box>

            {/* Governing Scenario Not Sized Alert */}
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

            {/* Scenario Picker Dialog */}
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
                                    {/* Inputs */}
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

                                    {/* Outputs */}
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
                                                <Chip
                                                    label={sizing.outputs?.isCriticalFlow ? 'Critical' : 'Subcritical'}
                                                    size="small"
                                                    color={sizing.outputs?.isCriticalFlow ? 'success' : 'info'}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Messages */}
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

// Attachments Tab Content
function AttachmentsTab() {
    const { selectedPsv, attachmentList, deleteAttachment } = usePsvStore();
    const canEdit = useAuthStore((state) => state.canEdit());

    if (!selectedPsv) return null;

    const attachments = attachmentList.filter(a => a.protectiveSystemId === selectedPsv.id);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}?`)) {
            deleteAttachment(id);
        }
    };

    return (
        <Box>
            {/* Attachments Section */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Attachments
                    </Typography>
                    {canEdit && (
                        <Button variant="contained" startIcon={<AttachFile />} size="small">
                            Upload File
                        </Button>
                    )}
                </Box>

                {attachments.length > 0 ? (
                    <List disablePadding>
                        {attachments.map((att) => (
                            <ListItem
                                key={att.id}
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    mb: 1,
                                }}
                                secondaryAction={
                                    canEdit ? (
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(att.id, att.fileName)}>
                                            <Delete />
                                        </IconButton>
                                    ) : null
                                }
                            >
                                <ListItemIcon>
                                    <Description color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={att.fileName}
                                    secondary={`${formatFileSize(att.size)} • Uploaded ${formatDate(att.createdAt)}`}
                                />
                                <Button size="small" sx={{ mr: 2 }}>Download</Button>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Paper variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
                        <AttachFile sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No attachments</Typography>
                    </Paper>
                )}
            </Box>
        </Box >
    );
}

// Notes Tab Content (Comments & Todos)
function NotesTab() {
    const {
        selectedPsv,
        todoList,
        commentList,
        noteList,
        addTodo,
        deleteTodo,
        toggleTodo,
        updateTodo,
        addComment,
        deleteComment,
        updateComment,
        addNote,
        updateNote,
        deleteNote,
    } = usePsvStore();
    const canEdit = useAuthStore((state) => state.canEdit());
    const currentUser = useAuthStore((state) => state.currentUser);

    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [addCommentOpen, setAddCommentOpen] = useState(false);
    const [addNoteOpen, setAddNoteOpen] = useState(false);
    const [editCommentOpen, setEditCommentOpen] = useState(false);
    const [editNoteOpen, setEditNoteOpen] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState(selectedPsv?.ownerId || '');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newCommentText, setNewCommentText] = useState('');
    const [newNoteText, setNewNoteText] = useState('');
    const [editCommentText, setEditCommentText] = useState('');
    const [editNoteText, setEditNoteText] = useState('');
    const [editTaskOpen, setEditTaskOpen] = useState(false);
    const [editTaskText, setEditTaskText] = useState('');
    const [editTaskAssignee, setEditTaskAssignee] = useState('');
    const [editTaskDueDate, setEditTaskDueDate] = useState('');
    const [editingComment, setEditingComment] = useState<Comment | null>(null);
    const [editingNote, setEditingNote] = useState<ProjectNote | null>(null);
    const [editingTask, setEditingTask] = useState<TodoItem | null>(null);

    if (!selectedPsv) return null;

    const filteredTodos = todoList.filter(t => t.protectiveSystemId === selectedPsv.id);
    const filteredComments = commentList.filter(c => c.protectiveSystemId === selectedPsv.id);
    const filteredNotes = noteList.filter(n => n.protectiveSystemId === selectedPsv.id);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        // Default due date: 1 week from now
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + 7);
        const dueDate = newTaskDueDate || defaultDueDate.toISOString().split('T')[0];

        const newTodo: TodoItem = {
            id: `todo-${Date.now()}`,
            protectiveSystemId: selectedPsv.id,
            text: newTaskText.trim(),
            completed: false,
            assignedTo: newTaskAssignee,
            dueDate: dueDate,
            createdBy: selectedPsv.ownerId,
            createdAt: new Date().toISOString(),
        };
        addTodo(newTodo);
        setNewTaskText('');
        setNewTaskAssignee(selectedPsv.ownerId);
        setNewTaskDueDate('');
        setAddTaskOpen(false);
    };

    const handleDeleteTodo = (id: string) => {
        if (window.confirm("Are you sure you want to delete this task?")) {
            deleteTodo(id);
        }
    };

    const handleStartEditTask = (todo: TodoItem) => {
        setEditingTask(todo);
        setEditTaskText(todo.text);
        setEditTaskAssignee(todo.assignedTo || selectedPsv.ownerId);
        setEditTaskDueDate(todo.dueDate || '');
        setEditTaskOpen(true);
    };

    const handleUpdateTask = () => {
        if (!editingTask || !editTaskText.trim() || !updateTodo) return;
        updateTodo(editingTask.id, {
            text: editTaskText.trim(),
            assignedTo: editTaskAssignee,
            dueDate: editTaskDueDate || undefined,
        });
        setEditTaskOpen(false);
        setEditingTask(null);
        setEditTaskText('');
        setEditTaskAssignee(selectedPsv.ownerId);
        setEditTaskDueDate('');
    };

    const handleAddComment = () => {
        if (!newCommentText.trim()) return;
        const creatorId = currentUser?.id || selectedPsv.ownerId;
        const newComment: Comment = {
            id: `comment-${Date.now()}`,
            protectiveSystemId: selectedPsv.id,
            body: newCommentText.trim(),
            createdBy: creatorId,
            createdAt: new Date().toISOString(),
        };
        addComment(newComment);
        setNewCommentText('');
        setAddCommentOpen(false);
    };

    const handleStartEditComment = (comment: Comment) => {
        setEditingComment(comment);
        setEditCommentText(comment.body);
        setEditCommentOpen(true);
    };

    const handleUpdateComment = () => {
        if (!editingComment || !editCommentText.trim()) return;
        updateComment(editingComment.id, {
            body: editCommentText.trim(),
            updatedBy: currentUser?.id || selectedPsv.ownerId,
            updatedAt: new Date().toISOString(),
        });
        setEditCommentOpen(false);
        setEditingComment(null);
        setEditCommentText('');
    };

    const handleDeleteComment = (id: string) => {
        if (window.confirm("Are you sure you want to delete this comment?")) {
            deleteComment(id);
        }
    };

    const handleAddNote = () => {
        if (!newNoteText.trim()) return;
        const creatorId = currentUser?.id || selectedPsv.ownerId;
        addNote({
            id: `note-${Date.now()}`,
            protectiveSystemId: selectedPsv.id,
            body: newNoteText.trim(),
            createdBy: creatorId,
            createdAt: new Date().toISOString(),
        });
        setNewNoteText('');
        setAddNoteOpen(false);
    };

    const handleStartEditNote = (note: ProjectNote) => {
        setEditingNote(note);
        setEditNoteText(note.body);
        setEditNoteOpen(true);
    };

    const handleUpdateNote = () => {
        if (!editingNote || !editNoteText.trim()) return;
        updateNote(editingNote.id, {
            body: editNoteText.trim(),
            updatedBy: currentUser?.id || selectedPsv.ownerId,
            updatedAt: new Date().toISOString(),
        });
        setEditNoteOpen(false);
        setEditingNote(null);
        setEditNoteText('');
    };

    const handleDeleteNote = (id: string) => {
        if (window.confirm("Delete this note? It will be removed from the printable summary.")) {
            deleteNote(id);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Todos Section */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Tasks
                    </Typography>
                    {canEdit && (
                        <Button variant="contained" startIcon={<AddCircle />} size="small" onClick={() => setAddTaskOpen(true)}>
                            Add Task
                        </Button>
                    )}
                </Box>

                {filteredTodos.length > 0 ? (
                    <Paper variant="outlined">
                        <List disablePadding>
                            {filteredTodos.map((todo, index) => {
                                const assignee = todo.assignedTo ? getUserById(todo.assignedTo) : null;
                                return (
                                        <ListItem
                                            key={todo.id}
                                            divider={index < filteredTodos.length - 1}
                                            secondaryAction={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {todo.dueDate && (
                                                    <Chip
                                                        label={formatDate(todo.dueDate)}
                                                        size="small"
                                                        color={new Date(todo.dueDate) < new Date() && !todo.completed ? 'error' : 'default'}
                                                        variant="outlined"
                                                    />
                                                )}
                                                {canEdit && (
                                                    <>
                                                        <IconButton
                                                            edge="end"
                                                            aria-label="edit"
                                                            onClick={() => handleStartEditTask(todo)}
                                                        >
                                                            <Edit />
                                                        </IconButton>
                                                        <IconButton
                                                            edge="end"
                                                            aria-label="delete"
                                                            onClick={() => handleDeleteTodo(todo.id)}
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    </>
                                                )}
                                            </Box>
                                        }
                                    >
                                        <ListItemIcon>
                                            <Checkbox
                                                checked={todo.completed}
                                                onChange={() => toggleTodo(todo.id)}
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography sx={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                                                    {todo.text}
                                                </Typography>
                                            }
                                            secondary={assignee ? `Assigned to ${assignee.name}` : undefined}
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Paper>
                ) : (
                    <Paper variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
                        <CheckCircle sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No tasks</Typography>
                    </Paper>
                )}
            </Box>

            {/* Notes Section */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            Notes
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            These appear on the printable summary.
                        </Typography>
                    </Box>
                    {canEdit && (
                        <Button variant="contained" startIcon={<AddCircle />} size="small" onClick={() => setAddNoteOpen(true)}>
                            Add Note
                        </Button>
                    )}
                </Box>

                {filteredNotes.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {filteredNotes.map((note) => {
                            const author = getUserById(note.updatedBy || note.createdBy);
                            const timestamp = note.updatedAt || note.createdAt;
                            return (
                                <Card
                                    key={note.id}
                                    variant="outlined"
                                    sx={{
                                        borderColor: 'success.main',
                                        backgroundColor: (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(34, 197, 94, 0.08)'
                                            : 'rgba(34, 197, 94, 0.12)',
                                    }}
                                >
                                    <CardContent sx={{ pb: '16px !important' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                                            <Box>
                                                <Typography fontWeight={600}>
                                                    {note.body}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {author?.name || 'Unknown'}, {new Date(timestamp).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                            {canEdit && (
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <IconButton size="small" onClick={() => handleStartEditNote(note)}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => handleDeleteNote(note.id)}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                ) : (
                    <Paper variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
                        <Description sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No notes</Typography>
                    </Paper>
                )}
            </Box>

            {/* Comments Section */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Comments
                    </Typography>
                    {canEdit && (
                        <Button variant="contained" startIcon={<AddCircle />} size="small" onClick={() => setAddCommentOpen(true)}>
                            Add Comment
                        </Button>
                    )}
                </Box>

                {filteredComments.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {filteredComments.map((comment) => {
                            const author = getUserById(comment.updatedBy || comment.createdBy);
                            const timestamp = comment.updatedAt || comment.createdAt;
                            return (
                                <Card key={comment.id} variant="outlined">
                                    <CardContent sx={{ pb: '16px !important' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                                            <Box>
                                                <Typography fontWeight={600}>
                                                    {comment.body}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {author?.name || 'Unknown'}, {formatDate(timestamp)}
                                                </Typography>
                                            </Box>
                                            {canEdit && (
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <IconButton size="small" onClick={() => handleStartEditComment(comment)}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => handleDeleteComment(comment.id)}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                ) : (
                    <Paper variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
                        <Note sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No comments</Typography>
                    </Paper>
                )}
            </Box>

            {/* Add Task Dialog */}
            <Dialog open={addTaskOpen} onClose={() => setAddTaskOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Task</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Task description"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <TextField
                        select
                        fullWidth
                        label="Assign to"
                        value={newTaskAssignee}
                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                        sx={{ mb: 2 }}
                        SelectProps={{ native: true }}
                    >
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        type="date"
                        label="Due date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{
                            '& input::-webkit-calendar-picker-indicator': {
                                filter: (theme) =>
                                    theme.palette.mode === 'dark'
                                        ? 'invert(0.8)'
                                        : 'invert(0.2)',
                                opacity: 0.9,
                            },
                        }}
                        helperText="Default: 1 week from today"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddTaskOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddTask} disabled={!newTaskText.trim()}>
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Comment Dialog */}
            <Dialog open={addCommentOpen} onClose={() => setAddCommentOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Comment</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={3}
                        label="Comment"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddCommentOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddComment} disabled={!newCommentText.trim()}>
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={editTaskOpen} onClose={() => setEditTaskOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Task description"
                        value={editTaskText}
                        onChange={(e) => setEditTaskText(e.target.value)}
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <TextField
                        select
                        fullWidth
                        label="Assign to"
                        value={editTaskAssignee}
                        onChange={(e) => setEditTaskAssignee(e.target.value)}
                        sx={{ mb: 2 }}
                        SelectProps={{ native: true }}
                    >
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        type="date"
                        label="Due date"
                        value={editTaskDueDate}
                        onChange={(e) => setEditTaskDueDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{
                            '& input::-webkit-calendar-picker-indicator': {
                                filter: (theme) =>
                                    theme.palette.mode === 'dark'
                                        ? 'invert(0.8)'
                                        : 'invert(0.2)',
                                opacity: 0.9,
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditTaskOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateTask} disabled={!editTaskText.trim()}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editCommentOpen} onClose={() => setEditCommentOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Comment</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={3}
                        label="Comment"
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditCommentOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateComment} disabled={!editCommentText.trim()}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Note Dialog */}
            <Dialog open={addNoteOpen} onClose={() => setAddNoteOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>New Note</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={4}
                        label="Formal note"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        sx={{ mt: 1 }}
                        helperText="Displayed on the printable summary"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddNoteOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddNote} disabled={!newNoteText.trim()}>
                        Save Note
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editNoteOpen} onClose={() => setEditNoteOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Note</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={4}
                        label="Note"
                        value={editNoteText}
                        onChange={(e) => setEditNoteText(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditNoteOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateNote} disabled={!editNoteText.trim()}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// Main Component
export function ProtectiveSystemDetail() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const {
        selectedPsv,
        selectPsv,
        deletePsv,
        updatePsv,
        updateSizingCase,
        sizingCaseList,
        deleteSizingCase,
        getCurrentRevision,
        loadRevisionHistory,
	    } = usePsvStore();
	    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	    const canEdit = useAuthStore((state) => state.canEdit());
	    const canApprove = useAuthStore((state) => state.canApprove());
	    const canCheck = useAuthStore((state) => ['lead', 'approver', 'admin'].includes(state.currentUser?.role || ''));
	    const canIssue = canCheck || canApprove;
    const [activeTab, setActiveTab] = useState(0);
    const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");

    const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
    const [revisionMenuAnchor, setRevisionMenuAnchor] = useState<null | HTMLElement>(null);
    const [psvRevisions, setPsvRevisions] = useState<RevisionHistory[]>([]);

    const [editPsvOpen, setEditPsvOpen] = useState(false);
    const [editTag, setEditTag] = useState('');
    const [editName, setEditName] = useState('');

    // Revision dialog state
    const [newRevisionDialogOpen, setNewRevisionDialogOpen] = useState(false);
    const [revisionPanelOpen, setRevisionPanelOpen] = useState(false);
    const [snapshotRevision, setSnapshotRevision] = useState<RevisionHistory | null>(null);

    useEffect(() => {
        if (!selectedPsv) return;
        let cancelled = false;
        (async () => {
            await loadRevisionHistory('protective_system', selectedPsv.id);
            if (cancelled) return;
	            const history = usePsvStore
	                .getState()
	                .revisionHistory
	                .filter((r) => r.entityType === 'protective_system' && r.entityId === selectedPsv.id)
	            setPsvRevisions(sortRevisionsByOriginatedAtDesc(history));
	        })();
        return () => {
            cancelled = true;
        };
    }, [loadRevisionHistory, selectedPsv]);

	    const latestPsvRevision = useMemo(() => sortRevisionsByOriginatedAtDesc(psvRevisions)[0], [psvRevisions]);

    const displayedRevision =
        (selectedPsv?.currentRevisionId
            ? psvRevisions.find((r) => r.id === selectedPsv.currentRevisionId)
            : undefined) ?? latestPsvRevision;

    const displayedRevisionCode =
        displayedRevision?.revisionCode ??
        getCurrentRevision('protective_system', selectedPsv?.id ?? '')?.revisionCode ??
        'O1';

    const revisionMenuCurrentId = selectedPsv?.currentRevisionId ?? latestPsvRevision?.id;

    const handleRevisionMenuOpen = async (event: MouseEvent<HTMLElement>) => {
        if (!selectedPsv) return;
        setRevisionMenuAnchor(event.currentTarget);
        await loadRevisionHistory('protective_system', selectedPsv.id);
	        const history = usePsvStore
	            .getState()
	            .revisionHistory
	            .filter((r) => r.entityType === 'protective_system' && r.entityId === selectedPsv.id)
	        setPsvRevisions(sortRevisionsByOriginatedAtDesc(history));
	    };

    const handleRevisionMenuClose = () => {
        setRevisionMenuAnchor(null);
    };

	    const handleRevisionSelect = async (revisionId: string) => {
	        if (!selectedPsv) return;
	        if (!isAuthenticated) return;
	        await updatePsv({ ...selectedPsv, currentRevisionId: revisionId });
	        handleRevisionMenuClose();
	    };

    // If editing a case, show the workspace
    if (editingCaseId) {
        const caseToEdit = sizingCaseList.find(c => c.id === editingCaseId);
        if (caseToEdit) {
            return (
                <SizingWorkspace
                    sizingCase={caseToEdit}
                    inletNetwork={selectedPsv?.inletNetwork}
                    outletNetwork={selectedPsv?.outletNetwork}
                    psvSetPressure={selectedPsv?.setPressure || 0}
                    onClose={() => setEditingCaseId(null)}
                    onSave={(updated, context) => {
                        updateSizingCase(updated);
                        if (context?.networkChanged && selectedPsv) {
                            sizingCaseList
                                .filter(c => c.id !== updated.id && c.status !== 'draft')
                                .forEach(c => updateSizingCase({ ...c, status: 'draft' }));
                        }
                        setEditingCaseId(null);
                    }}
                    onSaveNetworks={(updatedInlet, updatedOutlet) => {
                        if (selectedPsv) {
                            updatePsv({
                                ...selectedPsv,
                                inletNetwork: updatedInlet,
                                outletNetwork: updatedOutlet,
                            });
                        }
                    }}
                    psvTag={selectedPsv?.tag}
                    onDelete={() => {
                        deleteSizingCase(caseToEdit.id);
                        setEditingCaseId(null);
                    }}
                />
            );
        }
    }

    if (!selectedPsv) {
        return null;
    }





    const handleEditClick = () => {
        if (selectedPsv) {
            setEditTag(selectedPsv.tag);
            setEditName(selectedPsv.name);
            setEditPsvOpen(true);
        }
    };

    const handleSavePsv = () => {
        if (selectedPsv && editTag.trim()) {
            updatePsv({
                ...selectedPsv,
                tag: editTag.trim(),
                name: editName.trim(),
            });
            setEditPsvOpen(false);
        }
    };

    const handleDeletePsv = () => {
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (selectedPsv && deleteConfirmationInput === selectedPsv.tag) {
            deletePsv(selectedPsv.id);
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const statusSequenceIndex = WORKFLOW_STATUS_SEQUENCE.indexOf(selectedPsv.status);
    const statusEnabledSequentially = (value: ProtectiveSystem['status']) => {
        const targetIndex = WORKFLOW_STATUS_SEQUENCE.indexOf(value);
        if (targetIndex === -1 || statusSequenceIndex === -1) return true;
        if (targetIndex <= statusSequenceIndex) return true;
        return targetIndex === statusSequenceIndex + 1;
    };
    const statusPermissionFor = (value: ProtectiveSystem['status']) => {
        let roleAllowed: boolean;
        switch (value) {
            case 'checked':
                roleAllowed = canCheck;
                break;
            case 'approved':
                roleAllowed = canApprove;
                break;
            case 'issued':
                roleAllowed = canIssue;
                break;
            default:
                roleAllowed = canEdit;
        }
        return roleAllowed && statusEnabledSequentially(value);
    };
    const canOpenStatusMenu =
        Boolean(selectedPsv) &&
        WORKFLOW_STATUS_SEQUENCE.filter(value => value !== selectedPsv.status).some(value => statusPermissionFor(value));

    const handleStatusClick = (event: MouseEvent<HTMLElement>) => {
        if (!canOpenStatusMenu) return;
        setStatusMenuAnchor(event.currentTarget);
    };

    const handleStatusClose = () => {
        setStatusMenuAnchor(null);
    };

    const handleStatusChange = (status: ProtectiveSystem['status']) => {
        if (selectedPsv && statusPermissionFor(status)) {
            updatePsv({ ...selectedPsv, status });
        }
        handleStatusClose();
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <CheckCircleOutline fontSize="small" />;
            case 'issued': return <PublishedWithChanges fontSize="small" />;
            case 'checked': return <Verified fontSize="small" />;
            case 'in_review': return <RateReview fontSize="small" />;
            default: return <Drafts fontSize="small" />;
        }
    };

    return (
        <Box>
            {/* Header */}
            <Paper className="print-hide" sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Typography variant="h4" fontWeight={700}>
                                {selectedPsv.tag}
	                            </Typography>
	                            <RevisionBadge
	                                revisionCode={displayedRevisionCode}
	                                onClick={handleRevisionMenuOpen}
	                            />
		                            <Menu
		                                anchorEl={revisionMenuAnchor}
		                                open={Boolean(revisionMenuAnchor)}
		                                onClose={handleRevisionMenuClose}
		                                slots={{ transition: Fade }}
		                            >
		                                <MenuItem
		                                    onClick={() => {
		                                        setRevisionPanelOpen(true);
		                                        handleRevisionMenuClose();
		                                    }}
		                                >
		                                    <ListItemText>Revision History…</ListItemText>
		                                </MenuItem>
		                                {isAuthenticated
		                                    ? [
		                                        <Divider key="revision-divider" />,
		                                        ...psvRevisions.map((revision) => (
		                                            <MenuItem
		                                                key={revision.id}
		                                                selected={revision.id === revisionMenuCurrentId}
		                                                onClick={() => handleRevisionSelect(revision.id)}
		                                            >
		                                                <ListItemText
		                                                    primary={`Rev. ${revision.revisionCode}`}
		                                                    secondary={revision.description || undefined}
		                                                />
		                                            </MenuItem>
		                                        )),
		                                    ]
		                                    : null}
		                            </Menu>
		                            <Chip
		                                icon={getStatusIcon(selectedPsv.status)}
		                                label={getWorkflowStatusLabel(selectedPsv.status)}
                                color={getWorkflowStatusColor(selectedPsv.status) as any}
                                onClick={canOpenStatusMenu ? handleStatusClick : undefined}
                                deleteIcon={canOpenStatusMenu ? <KeyboardArrowDown /> : undefined}
                                onDelete={canOpenStatusMenu ? handleStatusClick : undefined} // Shows the arrow and makes it clickable
                                sx={{
                                    textTransform: 'capitalize',
                                    fontWeight: 600,
                                    pl: 0.5,
                                    '& .MuiChip-deleteIcon': {
                                        color: 'inherit',
                                        opacity: 0.7
                                    },
                                    cursor: canOpenStatusMenu ? 'pointer' : 'default'
                                }}
                            />
                            <Menu
                                anchorEl={statusMenuAnchor}
                                open={Boolean(statusMenuAnchor)}
                                onClose={handleStatusClose}
                                slots={{ transition: Fade }}
                            >
                                <MenuItem
                                    onClick={() => handleStatusChange('draft')}
                                    selected={selectedPsv.status === 'draft'}
                                    disabled={!statusPermissionFor('draft')}
                                >
                                    <ListItemIcon><Drafts fontSize="small" /></ListItemIcon>
                                    <ListItemText>Draft</ListItemText>
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleStatusChange('in_review')}
                                    selected={selectedPsv.status === 'in_review'}
                                    disabled={!statusPermissionFor('in_review')}
                                >
                                    <ListItemIcon><RateReview fontSize="small" sx={{ color: 'warning.main' }} /></ListItemIcon>
                                    <ListItemText>In Review</ListItemText>
                                </MenuItem>
                                {statusPermissionFor('checked') && (
                                    <MenuItem onClick={() => handleStatusChange('checked')} selected={selectedPsv.status === 'checked'}>
                                        <ListItemIcon><Verified fontSize="small" sx={{ color: 'info.main' }} /></ListItemIcon>
                                        <ListItemText>Checked</ListItemText>
                                    </MenuItem>
                                )}
                                {statusPermissionFor('approved') && (
                                    <MenuItem onClick={() => handleStatusChange('approved')} selected={selectedPsv.status === 'approved'}>
                                        <ListItemIcon><CheckCircleOutline fontSize="small" sx={{ color: 'success.main' }} /></ListItemIcon>
                                        <ListItemText>Approved</ListItemText>
                                    </MenuItem>
                                )}
                                {/* Issued can only be set from Approved status, by elevated roles */}
                                {selectedPsv.status === 'approved' && statusPermissionFor('issued') && (
                                    <MenuItem onClick={() => handleStatusChange('issued')}>
                                        <ListItemIcon><PublishedWithChanges fontSize="small" sx={{ color: 'info.main' }} /></ListItemIcon>
                                        <ListItemText>Issued</ListItemText>
                                    </MenuItem>
                                )}
                            </Menu>
                        </Box>
                        <Typography variant="body1" color="text.secondary">
                            {selectedPsv.name}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {canEdit && (
                            <>
                                {/* <Button
                                    variant="outlined"
                                    startIcon={<Edit />}
                                    onClick={handleEditClick}
                                >
                                    Edit
                                </Button> */}
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<Delete />}
                                    onClick={handleDeletePsv}
                                >
                                    Delete
                                </Button>
                            </>
                        )}
                        <Button variant="outlined" onClick={() => selectPsv(null)}>
                            Close
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Edit PSV Dialog */}
            <Dialog open={editPsvOpen} onClose={() => setEditPsvOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Protective System</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Tag"
                        value={editTag}
                        onChange={(e) => setEditTag(e.target.value)}
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="Description/Name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditPsvOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSavePsv} disabled={!editTag.trim()}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Protective System?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        This action cannot be undone. This will permanently delete the protective system
                        <strong> {selectedPsv.tag} </strong> and all associated scenarios and sizing cases.
                    </DialogContentText>
                    <Typography variant="body2" gutterBottom>
                        Please type <strong>{selectedPsv.tag}</strong> to confirm.
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        fullWidth
                        variant="outlined"
                        value={deleteConfirmationInput}
                        onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                        placeholder={selectedPsv.tag}
                        size="small"
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDelete}
                        disabled={deleteConfirmationInput !== selectedPsv.tag}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Tabs */}
	            <Paper className="print-hide" sx={{ mb: 3 }}>
	                <Tabs
	                    value={activeTab}
	                    onChange={handleTabChange}
	                    indicatorColor="primary"
	                    textColor="primary"
	                    sx={{
	                        borderBottom: 1,
	                        borderColor: 'divider',
	                        '& .MuiTabs-flexContainer': {
	                            flexWrap: 'wrap',
	                        },
	                        '& .MuiTab-root': {
	                            minHeight: 56,
	                            minWidth: { xs: 120, sm: 140 },
	                            flex: { xs: '1 1 auto', sm: '0 0 auto' },
	                        },
	                    }}
	                >
	                    <Tab label="Overview" />
	                    <Tab label="Scenarios" />
	                    <Tab label="Sizing" />
	                    <Tab label="Notes" />
	                    <Tab label="Attachments" />
	                    <Tab label="Revisions" />
	                    <Tab label="Summary" />
	                </Tabs>
	            </Paper>

            {/* Tab Panels */}
            <TabPanel value={activeTab} index={0}>
                <OverviewTab />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
                <ScenariosTab />
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
                <SizingTab onEdit={(id) => setEditingCaseId(id)} onCreate={(id) => setEditingCaseId(id)} />
            </TabPanel>
            <TabPanel value={activeTab} index={3}>
                <NotesTab />
            </TabPanel>
	            <TabPanel value={activeTab} index={4}>
	                <AttachmentsTab />
	            </TabPanel>
	            <TabPanel value={activeTab} index={5}>
	                <RevisionsTab entityId={selectedPsv.id} currentRevisionId={selectedPsv.currentRevisionId} />
	            </TabPanel>
	            <TabPanel value={activeTab} index={6}>
	                <SummaryTab />
	            </TabPanel>

            {/* New Revision Dialog */}
            <NewRevisionDialog
                open={newRevisionDialogOpen}
                onClose={() => setNewRevisionDialogOpen(false)}
                entityType="protective_system"
                entityId={selectedPsv.id}
                currentRevisionCode={getCurrentRevision('protective_system', selectedPsv.id)?.revisionCode}
            />

            {/* Revision History Panel */}
            <RevisionHistoryPanel
                open={revisionPanelOpen}
                onClose={() => setRevisionPanelOpen(false)}
                entityType="protective_system"
                entityId={selectedPsv.id}
                currentRevisionId={selectedPsv.currentRevisionId}
                onViewSnapshot={(revision) => {
                    setSnapshotRevision(revision);
                    setRevisionPanelOpen(false);
                }}
            />

            {/* Snapshot Preview Dialog */}
            <SnapshotPreviewDialog
                open={snapshotRevision !== null}
                onClose={() => setSnapshotRevision(null)}
                revision={snapshotRevision}
            />
        </Box>
    );
}
