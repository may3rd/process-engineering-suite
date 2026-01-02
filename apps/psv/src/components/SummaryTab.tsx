"use client";

import {
    Box,
    Typography,
    Paper,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme,
    Alert,
} from "@mui/material";
import {
    Business,
    AttachFile,
    Star,
    PictureAsPdf,
} from "@mui/icons-material";
import { generatePsvSummaryPdf } from "@/lib/export/pdfExport";
import { usePsvStore } from "@/store/usePsvStore";
import { getUserById } from "@/data/mockData";
import { PipelineNetwork, OverpressureScenario, PipeProps } from "@/data/types";
import { getWorkflowStatusLabel } from "@/lib/statusColors";
import { convertUnit } from "@eng-suite/physics";
import { RevisionHistoryCard } from "./RevisionHistoryCard";
import { getProjectUnits, convertValue, formatWithUnit, formatNumber, formatLocaleNumber, formatPressureGauge, formatPressureDrop, formatMassFlowKgH } from "@/lib/projectUnits";
import { UnitSystem, Equipment } from "@/data/types";


// Helper functions for hydraulic calculations
function calculateTotalLength(network: PipelineNetwork): number {
    return network.pipes.reduce((sum, pipe) => {
        const pipeLength = pipe.length ?? 0;
        const length = pipe.lengthUnit === 'ft' ? pipeLength * 0.3048 : pipeLength;
        return sum + length;
    }, 0);
}

function calculateAvgDiameter(network: PipelineNetwork): number {
    if (network.pipes.length === 0) return 0;
    return network.pipes.reduce((sum, pipe) => {
        const pipeDiameter = pipe.diameter ?? 0;
        const diameter = pipe.diameterUnit === 'in' ? pipeDiameter * 25.4 : pipeDiameter;
        return sum + diameter;
    }, 0) / network.pipes.length;
}



function toMeters(length?: number, unit?: string): number {
    if (!length) return 0;
    switch ((unit || 'm').toLowerCase()) {
        case 'ft':
            return length * 0.3048;
        case 'km':
            return length * 1000;
        case 'cm':
            return length / 100;
        case 'mm':
            return length / 1000;
        default:
            return length;
    }
}

function toMillimeters(diameter?: number, unit?: string): number {
    if (!diameter) return 0;
    switch ((unit || 'mm').toLowerCase()) {
        case 'ft':
        case 'ft-in':
            return diameter * 304.8;
        case 'in':
            return diameter * 25.4;
        case 'cm':
            return diameter * 10;
        case 'm':
            return diameter * 1000;
        default:
            return diameter;
    }
}

function formatNumberValue(value: number | null | undefined, unit?: string, digits = 1): string {
    if (value === undefined || value === null) return '—';
    if (Number.isNaN(value)) return '—';
    return `${value.toFixed(digits)}${unit ? ` ${unit}` : ''}`;
}


function formatFluidLabel(pipe: PipeProps): string {
    const candidate =
        pipe.fluid?.name ||
        (typeof pipe.fluid?.phase === 'string' ? pipe.fluid?.phase : undefined) ||
        (pipe.resultSummary?.inletState?.phase as string | undefined) ||
        (pipe.resultSummary?.outletState?.phase as string | undefined);

    if (!candidate) return '—';

    return candidate
        .toString()
        .replace(/_/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

type PipelineSegmentRow = {
    id: string;
    label: string;
    p1Barg?: number;  // Inlet pressure in barg
    p2Barg?: number;  // Outlet pressure in barg
    lengthMeters: number;
    diameterMm: number;
    sectionType: string;
    fluid: string;
    fittings?: string;
    pressureDrop?: number;
};

function getPipelineSegments(network: PipelineNetwork | undefined, kind: 'inlet' | 'outlet'): PipelineSegmentRow[] {
    if (!network) return [];

    void kind; // kind parameter no longer needed for labels

    return network.pipes.map<PipelineSegmentRow>((pipe, index) => {
        const lengthMeters = toMeters(pipe.length, pipe.lengthUnit);
        const diameterMm = toMillimeters(
            pipe.inletDiameter ?? pipe.diameter ?? pipe.pipeDiameter ?? pipe.outletDiameter,
            pipe.inletDiameterUnit ?? pipe.diameterUnit ?? pipe.pipeDiameterUnit ?? pipe.outletDiameterUnit
        );
        const fittings = pipe.fittings?.map(f => `${f.count}x ${f.type}`).join(', ');
        const pressureDropPa = pipe.pressureDropCalculationResults?.totalSegmentPressureDrop;
        const pressureDrop = typeof pressureDropPa === 'number' ? pressureDropPa / 1000 : undefined;

        // Extract inlet/outlet pressure from resultSummary (stored in Pa, convert to barg for display)
        const inletPressurePa = pipe.resultSummary?.inletState?.pressure;
        const outletPressurePa = pipe.resultSummary?.outletState?.pressure;
        const p1Barg = typeof inletPressurePa === 'number' ? convertUnit(inletPressurePa, 'Pa', 'barg') : undefined;
        const p2Barg = typeof outletPressurePa === 'number' ? convertUnit(outletPressurePa, 'Pa', 'barg') : undefined;

        return {
            id: pipe.id,
            label: pipe.name || `Segment ${index + 1}`,
            p1Barg,
            p2Barg,
            lengthMeters,
            diameterMm,
            sectionType: (pipe.pipeSectionType || 'pipeline').replace('_', ' '),
            fluid: formatFluidLabel(pipe),
            fittings,
            pressureDrop,
        };
    });
}

type HydraulicStatus = {
    label: string;
    color: 'success' | 'warning' | 'error' | 'default';
    message: string;
};

function getHydraulicStatus(percent: number, limit: number): HydraulicStatus {
    if (!Number.isFinite(percent)) {
        return { label: 'N/A', color: 'default', message: 'Awaiting hydraulic data' };
    }

    if (percent <= limit * 0.8) {
        return {
            label: 'PASS',
            color: 'success',
            message: `Within ${limit}% design criteria`,
        };
    }

    if (percent <= limit) {
        return {
            label: 'CAUTION',
            color: 'warning',
            message: `Approaching ${limit}% design criteria`,
        };
    }

    return {
        label: 'EXCEEDS',
        color: 'error',
        message: `Exceeds ${limit}% allowable drop`,
    };
}

function summarizePipeline(
    network: PipelineNetwork,
    scenario: OverpressureScenario,
    setPressure: number,
    limit: number,
    kind: 'inlet' | 'outlet',
) {
    if (!network || network.pipes.length === 0) return null;

    const totalLength = calculateTotalLength(network);
    const avgDiameter = calculateAvgDiameter(network);

    // Use actual calculated results stored in pipes
    const pressureDropPa = network.pipes.reduce((sum, pipe) => {
        return sum + (pipe.pressureDropCalculationResults?.totalSegmentPressureDrop ?? 0);
    }, 0);
    const pressureDrop = pressureDropPa / 1000; // Pa -> kPa

    // Use max velocity from pipes
    const velocity = Math.max(...network.pipes.map(p => p.velocity ?? 0));

    // Percent of set pressure (assuming setPressure is in barg)
    // 1 bar = 100 kPa
    const percent = setPressure > 0 ? (pressureDrop / (setPressure * 100)) * 100 : 0;

    const segments = getPipelineSegments(network, kind);
    const diameterValues = segments
        .map(segment => segment.diameterMm)
        .filter(value => Number.isFinite(value) && value > 0);

    const minDiameter = diameterValues.length > 0 ? Math.min(...diameterValues) : undefined;
    const maxDiameter = diameterValues.length > 0 ? Math.max(...diameterValues) : undefined;

    return {
        totalLength,
        avgDiameter,
        minDiameter,
        maxDiameter,
        velocity,
        pressureDrop,
        percent,
        limit,
        segmentCount: segments.length,
        status: getHydraulicStatus(percent, limit),
    };
}

export function SummaryTab() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const {
        selectedCustomer,
        selectedPlant,
        selectedUnit,
        selectedArea,
        selectedProject,
        selectedPsv,
        scenarioList,
        sizingCaseList,
        attachmentList,
        equipmentLinkList,
        equipment: equipmentList,
        noteList,
        revisionHistory,
    } = usePsvStore();

    if (!selectedPsv) return null;

    const unitSystem: UnitSystem = selectedProject?.unitSystem || 'metric';
    const projectUnits = getProjectUnits(unitSystem);

    const linkedEquipment = equipmentLinkList.filter(link => link.psvId === selectedPsv.id);
    const equipmentForExport = linkedEquipment
        .map(link => equipmentList.find(e => e.id === link.equipmentId))
        .filter((e): e is Equipment => !!e);

    const owner = getUserById(selectedPsv.ownerId);
    const psvScenarios = scenarioList.filter(s => s.protectiveSystemId === selectedPsv.id && s.isActive !== false);
    const psvSizingCases = sizingCaseList.filter(c => c.protectiveSystemId === selectedPsv.id && c.isActive !== false);
    const psvAttachments = attachmentList.filter(a => a.protectiveSystemId === selectedPsv.id && a.isActive !== false);
    const psvNotes = noteList.filter(n => n.protectiveSystemId === selectedPsv.id);
    const psvRevisions = revisionHistory
        .filter(r => r.entityType === 'protective_system' && r.entityId === selectedPsv.id && r.isActive !== false)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Find the governing scenario for this PSV
    const governingScenario = psvScenarios.find(s => s.isGoverning) || null;

    // Find the sizing case for the governing scenario (must be calculated)
    const governingSizingCase = governingScenario
        ? psvSizingCases.find(c => c.scenarioId === governingScenario.id && c.status === 'calculated')
        : null;

    // Validation states for warnings
    const governingScenarios = psvScenarios.filter(s => s.isGoverning);
    const hasNoGoverning = psvScenarios.length > 0 && governingScenarios.length === 0;
    const hasMultipleGoverning = governingScenarios.length > 1;
    const governingNotSized = governingScenario && !governingSizingCase;

    // Helper to get project units (moved up or used from hook if available)
    // Note: projectUnits is defined below, let's make sure order is correct.
    // Actually, `projectUnits` is defined at line 282, above this block.

    const facilityDescriptor = selectedPlant
        ? `${selectedPlant.name}${selectedUnit ? ` / ${selectedUnit.name}` : ''}`
        : selectedUnit?.name || '—';
    const areaDescriptor = selectedArea
        ? `${selectedArea.code ? `${selectedArea.code} – ` : ''}${selectedArea.name}`
        : '—';

    const documentMetadata = [
        { label: 'Client', value: selectedCustomer?.name || '—' },
        { label: 'Facility', value: facilityDescriptor },
        { label: 'Area', value: areaDescriptor },
        { label: 'Project', value: selectedProject?.name || '—' },
        { label: 'Document No.', value: selectedPsv.tag },
        { label: 'Prepared By', value: owner?.name || '—' },
        { label: 'Revision Date', value: new Date(selectedPsv.updatedAt).toLocaleDateString() },
        { label: 'Workflow Status', value: getWorkflowStatusLabel(selectedPsv.status) },
    ];

    const inletSegments = getPipelineSegments(selectedPsv.inletNetwork, 'inlet');
    const outletSegments = getPipelineSegments(selectedPsv.outletNetwork, 'outlet');
    const inletOverview = governingScenario && governingSizingCase && selectedPsv.inletNetwork
        ? summarizePipeline(selectedPsv.inletNetwork, governingScenario, selectedPsv.setPressure, 3, 'inlet')
        : null;
    const outletOverview = governingScenario && governingSizingCase && selectedPsv.outletNetwork
        ? summarizePipeline(selectedPsv.outletNetwork, governingScenario, selectedPsv.setPressure, 10, 'outlet')
        : null;
    const inletBaseLength = selectedPsv.inletNetwork ? calculateTotalLength(selectedPsv.inletNetwork) : 0;
    const inletAvgDiameter = selectedPsv.inletNetwork ? calculateAvgDiameter(selectedPsv.inletNetwork) : 0;
    const outletBaseLength = selectedPsv.outletNetwork ? calculateTotalLength(selectedPsv.outletNetwork) : 0;
    const outletAvgDiameter = selectedPsv.outletNetwork ? calculateAvgDiameter(selectedPsv.outletNetwork) : 0;

    const formatScenarioCause = (cause?: string) => {
        if (!cause) return '—';
        return cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const formatLength = (valueMeters: number | null | undefined, digits = 2) => {
        const converted = convertValue(valueMeters, 'm', projectUnits.length.unit);
        return formatWithUnit(converted, projectUnits.length.label, digits);
    };

    const formatDiameter = (valueMm: number | null | undefined, digits = 0) => {
        const converted = convertValue(valueMm, 'mm', projectUnits.diameter.unit);
        return formatWithUnit(converted, projectUnits.diameter.label, digits);
    };

    const formatVelocity = (valueMs: number | null | undefined, digits = 2) => {
        const converted = convertValue(valueMs, 'm/s', unitSystem === 'imperial' ? 'ft/s' : 'm/s');
        return formatWithUnit(converted, unitSystem === 'imperial' ? 'ft/s' : 'm/s', digits);
    };

    const generatedTimestamp = new Date().toLocaleString();
    const hydraulicMessage = !governingScenario
        ? 'No governing scenario selected. Mark a scenario as governing to evaluate inlet/outlet hydraulics.'
        : 'Governing scenario has not been sized. Calculate a sizing case for the governing scenario to evaluate inlet/outlet hydraulics.';



    const handleExportPdf = () => {
        // Format revisions for export
        const formatDate = (dateStr?: string | null) => {
            if (!dateStr) return '-';
            try {
                // e.g., 12-Dec-2025
                return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
            } catch (e) {
                return '-';
            }
        };

        const getInitials = (userId?: string | null) => {
            if (!userId) return '-';
            const user = getUserById(userId);
            if (user) {
                return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
            }
            // Fallback if UUID
            return userId.length > 5 ? 'USR' : userId.toUpperCase();
        };

        const exportRevisions = psvRevisions.map(r => {
            const isCurrent = r.id === selectedPsv.currentRevisionId;
            return {
                id: r.id,
                rev: r.revisionCode + (isCurrent ? ' (Current)' : ''),
                desc: r.description || '-',
                by: getInitials(r.originatedBy),
                date: formatDate(r.originatedAt),
                chk: getInitials(r.checkedBy),
                chkDate: formatDate(r.checkedAt),
                app: getInitials(r.approvedBy),
                appDate: formatDate(r.approvedAt)
            };
        });

        generatePsvSummaryPdf({
            psv: selectedPsv,
            project: selectedProject || undefined,
            customer: selectedCustomer || undefined,
            plant: selectedPlant || undefined,
            unit: selectedUnit || undefined,
            area: selectedArea || undefined,
            owner: owner || undefined,
            scenarios: psvScenarios,
            sizingCases: psvSizingCases,
            unitSystem: unitSystem || 'metric', // Pass unitSystem
            linkedEquipment: equipmentForExport,
            projectNotes: psvNotes,
            attachments: psvAttachments,
            inletSegments,
            outletSegments,
            revisions: exportRevisions,
            inletSummary: inletOverview,
            outletSummary: outletOverview,
        });
    };

    const sectionStyles = {
        mb: 2,
        p: 1.5,
        bgcolor: isDark ? 'background.paper' : 'grey.50',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        boxShadow: 'none',
        '@media print': {
            breakInside: 'avoid',
            boxShadow: 'none',
            p: 1,
            mb: 1,
        },
    };

    const headerStyles = {
        fontWeight: 600,
        fontSize: '1rem',
        mb: 1,
        pb: 0.5,
        borderBottom: 1,
        borderColor: 'divider',
    };

    const infoGridStyles = {
        display: 'grid',
        gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
        },
        gap: 1,
    };

    return (
        <Box
            sx={{
                '@media print': {
                    bgcolor: 'white',
                    color: 'black',
                    '& .no-print': { display: 'none' },
                },
            }}
        >
            <Box className="no-print" sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                    variant="contained"
                    startIcon={<PictureAsPdf />}
                    size="small"
                    onClick={handleExportPdf}
                >
                    Export PDF
                </Button>
            </Box>

            {/* Warning Messages */}
            {psvScenarios.length === 0 && (
                <Alert severity="error" variant="outlined" sx={{ mb: 2 }} className="no-print">
                    <strong>No overpressure scenarios configured.</strong> Add at least one scenario in the Scenarios tab to define relief conditions.
                </Alert>
            )}
            {hasMultipleGoverning && (
                <Alert severity="error" variant="outlined" sx={{ mb: 2 }} className="no-print">
                    <strong>Multiple governing scenarios selected.</strong> Only one scenario should be marked as governing. Go to Scenarios tab to fix.
                </Alert>
            )}
            {hasNoGoverning && (
                <Alert severity="warning" variant="outlined" sx={{ mb: 2 }} className="no-print">
                    <strong>No governing scenario selected.</strong> Mark a scenario as governing in the Scenarios tab to enable hydraulic validation.
                </Alert>
            )}
            {governingNotSized && !hasMultipleGoverning && (
                <Alert severity="info" variant="outlined" sx={{ mb: 2 }} className="no-print">
                    <strong>Governing scenario not sized.</strong> Create and calculate a sizing case for "{formatScenarioCause(governingScenario?.cause)}" in the Sizing Cases tab to complete the analysis.
                </Alert>
            )}
            {psvSizingCases.length === 0 && psvScenarios.length > 0 && (
                <Alert severity="warning" variant="outlined" sx={{ mb: 2 }} className="no-print">
                    <strong>No sizing cases calculated.</strong> Go to the Sizing Cases tab to create and calculate sizing cases for your scenarios.
                </Alert>
            )}

            <Paper
                sx={{
                    ...sectionStyles,
                    mb: 2,
                    bgcolor: isDark ? 'background.paper' : 'white',
                    border: 0,
                    borderColor: 'transparent',
                    p: 2,
                    boxShadow: 'none',
                    '@media print': {
                        breakInside: 'avoid',
                        boxShadow: 'none',
                        p: 1,
                        mb: 1,
                        border: 0,
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Business sx={{ fontSize: 32, color: 'text.secondary' }} />
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" fontWeight={500}>
                                Pressure Relief Engineering Sheet
                            </Typography>
                            <Typography variant="h5" fontWeight={700}>
                                PSV Summary
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                        <Typography variant="h5" color="primary.main" fontWeight={700}>
                            {selectedPsv.tag}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {selectedPsv.name}
                        </Typography>
                    </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                        gap: 1.5,
                    }}
                >
                    {documentMetadata.map((item) => (
                        <Box key={item.label}>
                            <Typography variant="caption" color="text.secondary">
                                {item.label}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ mt: 0.25 }}>
                                {item.value}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Paper>

            {/* Revision History - show after PSV Summary */}
            <RevisionHistoryCard
                entityType="protective_system"
                entityId={selectedPsv.id}
                currentRevisionId={selectedPsv.currentRevisionId}
                showActions={false}
                hideBorder
            />

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                    gap: 1.5,
                    mb: 2,
                }}
            >
                <Paper sx={sectionStyles}>
                    <Typography variant="h6" sx={headerStyles}>
                        Valve Design Data
                    </Typography>
                    <Box sx={infoGridStyles}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Tag Number</Typography>
                            <Typography variant="body2" fontWeight={500}>{selectedPsv.tag}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Valve Type</Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'uppercase' }}>
                                {selectedPsv.type.replace('_', ' ')}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Operating Type</Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                                {selectedPsv.valveType ? selectedPsv.valveType.replace('_', ' ') : '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Design Code</Typography>
                            <Typography variant="body2" fontWeight={500}>{selectedPsv.designCode}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Set Pressure</Typography>
                            <Typography variant="body2" fontWeight={500}>
                                {formatPressureGauge(selectedPsv.setPressure, unitSystem, 2)}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">MAWP</Typography>
                            <Typography variant="body2" fontWeight={500}>
                                {formatPressureGauge(selectedPsv.mawp, unitSystem, 2)}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>

                <Paper sx={sectionStyles}>
                    <Typography variant="h6" sx={headerStyles}>
                        Service & Governing Scenario
                    </Typography>
                    <Box sx={infoGridStyles}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Service Fluid</Typography>
                            <Typography variant="body2" fontWeight={500}>{selectedPsv.serviceFluid}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Fluid Phase</Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'uppercase' }}>
                                {selectedPsv.fluidPhase.replace('_', ' ')}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Relief Scenarios</Typography>
                            <Typography variant="body2" fontWeight={500}>{psvScenarios.length}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Governing Scenario</Typography>
                            <Typography variant="body2" fontWeight={500}>{formatScenarioCause(governingScenario?.cause)}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Relieving Rate</Typography>
                            <Typography variant="body2" fontWeight={500}>
                                {governingScenario ? formatMassFlowKgH(governingScenario.relievingRate, unitSystem, 0) : '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Relieving Pressure</Typography>
                            <Typography variant="body2" fontWeight={500}>
                                {governingScenario ? formatPressureGauge(governingScenario.relievingPressure, unitSystem, 2) : '—'}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Box>

            <Paper sx={sectionStyles}>
                <Typography variant="h6" sx={headerStyles}>
                    Protected Equipment
                </Typography>
                {linkedEquipment.length > 0 ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Tag</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Relationship</TableCell>
                                    <TableCell>Design Pressure</TableCell>
                                    <TableCell>Design Temp</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {linkedEquipment.map((link) => {
                                    const eq = equipmentList.find(e => e.id === link.equipmentId);
                                    return eq ? (
                                        <TableRow key={link.id}>
                                            <TableCell>{eq.tag}</TableCell>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>{eq.type.replace('_', ' ')}</TableCell>
                                            <TableCell>{link.isPrimary ? 'Primary' : 'Secondary'}</TableCell>
                                            <TableCell>
                                                {eq.designPressure !== undefined && eq.designPressure !== null
                                                    ? formatNumber(convertValue(eq.designPressure, 'barg', projectUnits.pressureGauge.unit), 2)
                                                    : '—'}
                                                {eq.designPressure !== undefined && eq.designPressure !== null ? ` ${projectUnits.pressureGauge.label}` : ''}
                                            </TableCell>
                                            <TableCell>
                                                {eq.designTemperature !== undefined && eq.designTemperature !== null
                                                    ? formatNumber(convertValue(eq.designTemperature, 'C', projectUnits.temperature.unit), 0)
                                                    : '—'}
                                                {eq.designTemperature !== undefined && eq.designTemperature !== null ? ` ${projectUnits.temperature.label}` : ''}
                                            </TableCell>
                                        </TableRow>
                                    ) : null;
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body2" color="text.secondary">No equipment linked.</Typography>
                )}
            </Paper>

            <Paper sx={sectionStyles}>
                <Typography variant="h6" sx={headerStyles}>
                    Relief Scenarios
                </Typography>
                {psvScenarios.length > 0 ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Cause</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Phase</TableCell>
                                    <TableCell align="right">{`Relieving Rate (${projectUnits.massFlow.label})`}</TableCell>
                                    <TableCell align="right">{`Pressure (${projectUnits.pressureGauge.label})`}</TableCell>
                                    <TableCell align="center">Governing</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {psvScenarios.map((scenario) => (
                                    <TableRow key={scenario.id}>
                                        <TableCell>{formatScenarioCause(scenario.cause)}</TableCell>
                                        <TableCell>{scenario.description}</TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>
                                            {scenario.phase.replace('_', ' ')}
                                        </TableCell>
                                        <TableCell align="right">
                                            {formatLocaleNumber(convertValue(scenario.relievingRate, 'kg/h', projectUnits.massFlow.unit), 0)}
                                        </TableCell>
                                        <TableCell align="right">
                                            {formatNumber(convertValue(scenario.relievingPressure, 'barg', projectUnits.pressureGauge.unit), 2)}
                                        </TableCell>
                                        <TableCell align="center">
                                            {scenario.isGoverning ? (
                                                <Star sx={{ color: 'warning.main', fontSize: 18 }} />
                                            ) : '–'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body2" color="text.secondary">No scenarios defined.</Typography>
                )}
            </Paper>

            <Paper sx={sectionStyles}>
                <Typography variant="h6" sx={headerStyles}>
                    Sizing Cases
                </Typography>
                {psvSizingCases.length > 0 ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Scenario</TableCell>
                                    <TableCell>Method / Flow Type</TableCell>
                                    <TableCell align="right">Required Area (mm²)</TableCell>
                                    <TableCell>Selected Orifice</TableCell>
                                    <TableCell align="right">% Used</TableCell>
                                    <TableCell align="right">{`Inlet ΔP (${projectUnits.pressureDrop.label})`}</TableCell>
                                    <TableCell align="right">{`Backpressure (${projectUnits.pressureGauge.label})`}</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {psvSizingCases.map((sizingCase) => {
                                    const scenario = psvScenarios.find(s => s.id === sizingCase.scenarioId);
                                    return (
                                        <TableRow key={sizingCase.id}>
                                            <TableCell>{formatScenarioCause(scenario?.cause)}</TableCell>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>
                                                {(() => {
                                                    if (sizingCase.method === 'liquid') return 'Liquid Relief';
                                                    if (sizingCase.method === 'steam') return 'Steam Relief';
                                                    if (sizingCase.method === 'gas') {
                                                        return sizingCase.outputs?.isCriticalFlow ? 'Gas - Critical' : 'Gas - Subcritical';
                                                    }
                                                    return sizingCase.method.replace('_', ' ');
                                                })()}
                                            </TableCell>
                                            <TableCell align="right">
                                                {sizingCase.outputs?.requiredArea?.toFixed(1) ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {(sizingCase.outputs?.numberOfValves || 1) > 1
                                                    ? `${sizingCase.outputs?.numberOfValves} x `
                                                    : ''
                                                }
                                                {sizingCase.outputs?.selectedOrifice ?? '—'} ({sizingCase.outputs?.orificeArea ?? '—'} mm²)
                                            </TableCell>
                                            <TableCell align="right">
                                                {(() => {
                                                    const requiredArea = sizingCase.outputs?.requiredArea ?? 0;
                                                    const orificeArea = sizingCase.outputs?.orificeArea ?? 1;
                                                    const numberOfValves = sizingCase.outputs?.numberOfValves || 1;
                                                    const percentUsed = (requiredArea / (orificeArea * numberOfValves)) * 100;
                                                    return `${percentUsed.toFixed(1)}%`;
                                                })()}
                                            </TableCell>
                                            <TableCell align="right">
                                                {sizingCase.outputs?.inletPressureDrop !== undefined
                                                    ? formatNumber(convertValue(sizingCase.outputs.inletPressureDrop, 'kPa', projectUnits.pressureDrop.unit), 2)
                                                    : '—'}
                                            </TableCell>
                                            <TableCell align="right">
                                                {sizingCase.inputs?.backpressure !== undefined
                                                    ? formatNumber(convertValue(sizingCase.inputs.backpressure, 'barg', projectUnits.pressureGauge.unit), 2)
                                                    : '—'}
                                            </TableCell>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>
                                                <Chip
                                                    label={sizingCase.status}
                                                    size="small"
                                                    color={sizingCase.status === 'approved' ? 'success' : sizingCase.status === 'verified' ? 'info' : 'default'}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body2" color="text.secondary">No sizing cases calculated.</Typography>
                )}
            </Paper>

            <Paper sx={sectionStyles}>
                <Typography variant="h6" sx={headerStyles}>
                    Hydraulic Networks & Segment Details
                </Typography>
                {governingScenario && governingSizingCase ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                        {[
                            {
                                title: 'Inlet Network',
                                overview: inletOverview,
                                baseLength: inletBaseLength,
                                avgDiameter: inletAvgDiameter,
                                segments: inletSegments,
                            },
                            {
                                title: 'Outlet Network',
                                overview: outletOverview,
                                baseLength: outletBaseLength,
                                avgDiameter: outletAvgDiameter,
                                segments: outletSegments,
                            },
                        ].map((networkDetail) => (
                            <Box
                                key={networkDetail.title}
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    p: 1.25,
                                    bgcolor: isDark ? 'background.default' : 'white',
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        {networkDetail.title}
                                    </Typography>
                                    {networkDetail.overview && (
                                        <Chip
                                            label={networkDetail.overview.status.label}
                                            size="small"
                                            color={networkDetail.overview.status.color}
                                            sx={{ fontSize: '0.7rem' }}
                                        />
                                    )}
                                </Box>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))' },
                                        gap: 1,
                                    }}
                                >
                                    {[
                                        { label: 'Segments', value: networkDetail.segments.length || '—' },
                                        { label: 'Total Length', value: formatLength(networkDetail.overview?.totalLength ?? networkDetail.baseLength, 2) },
                                        { label: 'Average Diameter', value: networkDetail.overview?.avgDiameter || networkDetail.avgDiameter ? formatDiameter(networkDetail.overview?.avgDiameter ?? networkDetail.avgDiameter, 0) : '—' },
                                        {
                                            label: 'Diameter Range',
                                            value: networkDetail.overview?.minDiameter && networkDetail.overview?.maxDiameter
                                                ? `${formatNumber(convertValue(networkDetail.overview.minDiameter, 'mm', projectUnits.diameter.unit), 0)} – ${formatNumber(convertValue(networkDetail.overview.maxDiameter, 'mm', projectUnits.diameter.unit), 0)} ${projectUnits.diameter.label}`
                                                : '—'
                                        },
                                        { label: 'Velocity', value: networkDetail.overview ? formatVelocity(networkDetail.overview.velocity, 2) : '—' },
                                        { label: 'Pressure Drop', value: networkDetail.overview ? formatPressureDrop(networkDetail.overview.pressureDrop, unitSystem, 3) : '—' },
                                        { label: 'ΔP / Set Pressure', value: networkDetail.overview ? `${networkDetail.overview.percent.toFixed(1)}%` : '—' },
                                    ].map((metric) => (
                                        <Box key={`${networkDetail.title}-${metric.label}`}>
                                            <Typography variant="caption" color="text.secondary">
                                                {metric.label}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {metric.value}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    {networkDetail.overview ? networkDetail.overview.status.message : hydraulicMessage}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {hydraulicMessage}
                    </Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                    {[{ title: 'Inlet Network Segments', segments: inletSegments, hasNetwork: !!selectedPsv.inletNetwork }, { title: 'Outlet Network Segments', segments: outletSegments, hasNetwork: !!selectedPsv.outletNetwork }].map((segmentGroup) => (
                        <Box key={segmentGroup.title}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                {segmentGroup.title}
                            </Typography>
                            {segmentGroup.segments.length > 0 ? (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Segment</TableCell>
                                                <TableCell align="right">{`P1 (${projectUnits.pressureGauge.label})`}</TableCell>
                                                <TableCell align="right">{`P2 (${projectUnits.pressureGauge.label})`}</TableCell>
                                                <TableCell>Fluid</TableCell>
                                                <TableCell align="right">{`Length (${projectUnits.length.label})`}</TableCell>
                                                <TableCell align="right">{`Diameter (${projectUnits.diameter.label})`}</TableCell>
                                                <TableCell>Fittings / Notes</TableCell>
                                                <TableCell align="right">{`ΔP (${projectUnits.pressureDrop.label})`}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {segmentGroup.segments.map((segment) => (
                                                <TableRow key={segment.id}>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={500}>{segment.label}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{segment.sectionType}</Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {segment.p1Barg !== undefined
                                                            ? formatNumber(convertValue(segment.p1Barg, 'barg', projectUnits.pressureGauge.unit), 2)
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {segment.p2Barg !== undefined
                                                            ? formatNumber(convertValue(segment.p2Barg, 'barg', projectUnits.pressureGauge.unit), 2)
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>{segment.fluid}</TableCell>
                                                    <TableCell align="right">
                                                        {segment.lengthMeters
                                                            ? formatNumber(convertValue(segment.lengthMeters, 'm', projectUnits.length.unit), 2)
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {segment.diameterMm
                                                            ? formatNumber(convertValue(segment.diameterMm, 'mm', projectUnits.diameter.unit), 0)
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell sx={{ maxWidth: 180 }}>
                                                        {segment.fittings || '—'}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {segment.pressureDrop !== undefined
                                                            ? formatNumber(convertValue(segment.pressureDrop, 'kPa', projectUnits.pressureDrop.unit), 3)
                                                            : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    {segmentGroup.hasNetwork ? 'No segments defined for this network.' : `No ${segmentGroup.title.toLowerCase()}.`}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Box>
            </Paper >

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 1.5,
                    mb: 2,
                }}
            >
                <Paper sx={sectionStyles}>
                    <Typography variant="h6" sx={headerStyles}>
                        Notes ({psvNotes.length})
                    </Typography>
                    {psvNotes.length > 0 ? (
                        <List dense disablePadding>
                            {psvNotes.map((note) => (
                                <ListItem key={note.id} disablePadding sx={{ py: 0.5, alignItems: 'flex-start' }}>
                                    <ListItemText
                                        primary={note.body}
                                        secondary={`— ${getUserById(note.createdBy)?.name || 'Unknown'}, ${new Date(note.createdAt).toLocaleDateString()}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography variant="body2" color="text.secondary">No notes.</Typography>
                    )}
                </Paper>

                <Paper sx={sectionStyles}>
                    <Typography variant="h6" sx={headerStyles}>
                        Attachments ({psvAttachments.length})
                    </Typography>
                    {psvAttachments.length > 0 ? (
                        <List dense disablePadding>
                            {psvAttachments.map((attachment) => (
                                <ListItem key={attachment.id} disablePadding sx={{ py: 0.5 }}>
                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                        <AttachFile fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={attachment.fileName}
                                        secondary={`${(attachment.size / 1024).toFixed(1)} KB • Uploaded ${new Date(attachment.createdAt).toLocaleDateString()}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography variant="body2" color="text.secondary">No attachments.</Typography>
                    )}
                </Paper>
            </Box>

            <Box sx={{ textAlign: 'center', mt: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                    Generated on: {generatedTimestamp} • PSV Summary Document
                </Typography>
            </Box>
        </Box >
    );
}
