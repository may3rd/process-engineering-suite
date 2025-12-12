"use client";

import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    IconButton,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Divider,
    TablePagination,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { HydraulicSegmentResult } from "@/lib/hydraulicValidation";

interface HydraulicReportDialogProps {
    open: boolean;
    onClose: () => void;
    inletSegments: HydraulicSegmentResult[];
    outletSegments: HydraulicSegmentResult[];
    inletTotalDropKPa: number;
    outletTotalDropKPa: number;
    inletHasChoked: boolean;
    outletHasChoked: boolean;
    caseName?: string;
}

type RowConfig =
    | { type: "section"; label: string }
    | {
        type: "data";
        label: string;
        unit?: string;
        getValue: (seg: HydraulicSegmentResult, unitSystem: UnitSystem) => string | number | undefined;
        decimals?: number;
        color?: (seg: HydraulicSegmentResult) => string | undefined;
    };

type UnitSystem = "metric" | "imperial";

const formatNumber = (val: number | string | undefined, decimals = 2): string => {
    if (val === undefined || val === null) return "—";
    if (typeof val === "string") return val;
    if (!Number.isFinite(val)) return "—";
    return val.toFixed(decimals);
};

// Fitting type display names mapping
const FITTING_TYPES = [
    { key: "elbow_45", label: "Elbow 45°" },
    { key: "elbow_90", label: "Elbow 90°" },
    { key: "u_bend", label: "U-Bend" },
    { key: "stub_in_elbow", label: "Stub-In Elbow" },
    { key: "tee_elbow", label: "Tee Elbow" },
    { key: "tee_through", label: "Tee Through" },
    { key: "block_valve_full", label: "Block Valve Full Line Size" },
    { key: "block_valve_reduced_09", label: "Block Valve Reduced Trim 0.9D" },
    { key: "block_valve_reduced_08", label: "Block Valve Reduced Trim 0.8D" },
    { key: "globe_valve", label: "Globe Valve" },
    { key: "diaphragm_valve", label: "Diaphragm Valve" },
    { key: "butterfly_valve", label: "Butterfly Valve" },
    { key: "check_valve_swing", label: "Check Valve Swing" },
    { key: "check_valve_lift", label: "Check Valve Lift" },
    { key: "check_valve_tilting", label: "Check Valve Tilting" },
    { key: "pipe_entrance_normal", label: "Pipe Entrance Normal" },
    { key: "pipe_entrance_raise", label: "Pipe Entrance Raise" },
    { key: "pipe_exit", label: "Pipe Exit" },
    { key: "input_swage", label: "Input Swage" },
    { key: "output_swage", label: "Output Swage" },
];

// Helper to get fitting count safely
const getFittingCount = (seg: HydraulicSegmentResult, fittingKey: string): string | number => {
    const count = seg.fittingCounts?.[fittingKey];
    return (count && count > 0) ? count : "";
};

const getRowConfigs = (): RowConfig[] => [
    // Header rows
    { type: "data", label: "Segment ID", getValue: (s) => s.name },
    { type: "data", label: "Description", getValue: (s) => s.description ?? "" },

    // I. GENERAL DATA
    { type: "section", label: "I. GENERAL DATA" },
    { type: "data", label: "Fluid Phase", getValue: (s) => s.fluidPhase ?? "—" },
    { type: "data", label: "Calculation Type", getValue: (s) => s.calculationType ?? "Pipeline" },
    { type: "data", label: "Flow Direction", getValue: (s) => s.flowDirection ?? "Forward" },
    { type: "data", label: "Flow Type (Adiabatic or Isothermal)", getValue: (s) => s.gasFlowModel ?? "N/A" },
    { type: "data", label: "Pressure", unit: "kPag", getValue: (s) => s.boundaryPressureKPag, decimals: 2 },

    // II. FLUID DATA
    { type: "section", label: "II. FLUID DATA" },
    { type: "data", label: "Design Flow Rate", unit: "kg/h", getValue: (s) => s.massFlowRateKgH, decimals: 1 },
    { type: "data", label: "Design Volumetric Flow Rate", unit: "m³/h", getValue: (s) => s.volumetricFlowRateM3H, decimals: 2 },
    { type: "data", label: "Temperature", unit: "°C", getValue: (s) => s.temperatureC, decimals: 2 },
    { type: "data", label: "Density", unit: "kg/m³", getValue: (s) => s.densityKgM3, decimals: 2 },
    { type: "data", label: "Molecular Weight", getValue: (s) => s.molecularWeight, decimals: 1 },
    { type: "data", label: "Compressibility Factor Z", getValue: (s) => s.compressibilityZ, decimals: 3 },
    { type: "data", label: "Specific Heat Ratio k (Cp/Cv)", getValue: (s) => s.specificHeatRatio, decimals: 2 },
    { type: "data", label: "Viscosity", unit: "cP", getValue: (s) => s.viscosityCp, decimals: 4 },

    // III. PIPE, FITTING & ELEVATION
    { type: "section", label: "III. PIPE, FITTING & ELEVATION" },
    { type: "data", label: "Main Pipe DN", unit: "mm", getValue: (s) => s.diameter, decimals: 0 },
    { type: "data", label: "Pipe Schedule", getValue: (s) => s.schedule ?? "—" },
    { type: "data", label: "Main Pipe ID", unit: "mm", getValue: (s) => s.pipeID ?? s.diameter, decimals: 2 },
    { type: "data", label: "Inlet Pipe DN", unit: "mm", getValue: (s) => s.inletPipeDN ?? "", decimals: 2 },
    { type: "data", label: "Outlet Pipe DN", unit: "mm", getValue: (s) => s.outletPipeDN ?? "", decimals: 2 },
    { type: "data", label: "Pipe Roughness", unit: "mm", getValue: (s) => s.roughnessMm, decimals: 4 },
    { type: "data", label: "Pipe Length", unit: "m", getValue: (s) => s.length, decimals: 3 },
    { type: "data", label: "Elevation Change (- for DOWN)", unit: "m", getValue: (s) => s.elevationChangeM ?? "N/A", decimals: 3 },
    { type: "data", label: "Erosional Constant C (API 14E)", getValue: (s) => s.erosionalConstantC ?? 100 },

    // Fitting Count subsection
    { type: "section", label: "Fitting Count" },
    ...FITTING_TYPES.map(ft => ({
        type: "data" as const,
        label: ft.label,
        getValue: (s: HydraulicSegmentResult) => getFittingCount(s, ft.key)
    })),

    // K-factors
    { type: "data", label: "Fitting K", getValue: (s) => s.fittingK, decimals: 4 },
    { type: "data", label: "Pipe Length K", getValue: (s) => s.pipeLengthK, decimals: 4 },
    { type: "data", label: "User Supply K", getValue: (s) => s.userK ?? 0, decimals: 4 },
    { type: "data", label: "Total K", getValue: (s) => s.totalK, decimals: 4 },
    { type: "data", label: "Pipe & Fitting Safety Factor", unit: "%", getValue: (s) => (s.pipingFittingSafetyFactor ?? 0) * 100, decimals: 0 },
    { type: "data", label: "Total K (with safety factor)", getValue: (s) => s.totalKWithSafety ?? s.totalK, decimals: 4 },

    // IV. OPTIONAL CALCULATIONS
    { type: "section", label: "IV. OPTIONAL CALCULATIONS" },
    { type: "data", label: "Control Valve Cv", getValue: (s) => s.controlValveCv ?? "—" },
    { type: "data", label: "Control Valve Cg", getValue: (s) => s.controlValveCg ?? "—" },
    { type: "data", label: "Recovery Factor C1", getValue: (s) => s.recoveryFactorC1 ?? "—" },
    { type: "data", label: "Terminal Pressure Drop Ratio (xT)", getValue: (s) => s.terminalDPRatioXT ?? "—" },
    { type: "data", label: "Thin Sharp Edged Orifice d/D Ratio (β)", getValue: (s) => s.orificeBetaRatio ?? "—" },

    // V. CHARACTERISTIC SUMMARY
    { type: "section", label: "V. CHARACTERISTIC SUMMARY" },
    { type: "data", label: "Reynolds Number", getValue: (s) => s.reynoldsNumber ? s.reynoldsNumber.toExponential(2) : "—" },
    { type: "data", label: "Flow Regime", getValue: (s) => s.flowRegime ?? "Turbulent" },
    { type: "data", label: "Moody Friction Factor", getValue: (s) => s.frictionFactor, decimals: 6 },
    { type: "data", label: "Flow Momentum (ρv²)", unit: "Pa", getValue: (s) => s.flowMomentumPa, decimals: 2 },
    { type: "data", label: "Critical Pressure", unit: "kPa(a)", getValue: (s) => s.criticalPressureKPa ?? "N/A" },

    // VI. PRESSURE LOSSES SUMMARY
    { type: "section", label: "VI. PRESSURE LOSSES SUMMARY" },
    { type: "data", label: "Pipe & Fitting", unit: "kPa", getValue: (s) => s.pipeAndFittingDropKPa, decimals: 4 },
    { type: "data", label: "Elevation Change", unit: "kPa", getValue: (s) => s.elevationDropKPa ?? "N/A", decimals: 4 },
    { type: "data", label: "Control Valve Pressure Drop", unit: "kPa", getValue: (s) => s.controlValveDropKPa ?? "N/A" },
    { type: "data", label: "Orifice Pressure Drop", unit: "kPa", getValue: (s) => s.orificeDropKPa ?? "N/A" },
    { type: "data", label: "User Supplied Fixed Loss", unit: "kPa", getValue: (s) => s.userSpecifiedDropKPa ?? 0, decimals: 2 },
    { type: "data", label: "Segment Total Loss", unit: "kPa", getValue: (s) => s.segmentTotalDropKPa ?? s.pressureDropKPa, decimals: 4 },
    { type: "data", label: "Unit Friction Loss", unit: "kPa/100m", getValue: (s) => s.unitFrictionLossKPa100m, decimals: 4 },

    // VII. RESULT SUMMARY
    { type: "section", label: "VII. RESULT SUMMARY" },
    { type: "data", label: "INLET Pressure", unit: "kPag", getValue: (s) => s.inletPressureBarg * 100, decimals: 2 },
    { type: "data", label: "INLET Temperature", unit: "°C", getValue: (s) => s.inletTemperatureC, decimals: 2 },
    { type: "data", label: "INLET Density", unit: "kg/m³", getValue: (s) => s.inletDensityKgM3, decimals: 2 },
    { type: "data", label: "INLET Mach Number", getValue: (s) => s.inletMachNumber ?? "N/A", decimals: 4 },
    { type: "data", label: "INLET Velocity", unit: "m/s", getValue: (s) => s.inletVelocityMs, decimals: 4 },
    { type: "data", label: "INLET Erosional Velocity", unit: "m/s", getValue: (s) => s.inletErosionalVelocityMs, decimals: 4 },
    { type: "data", label: "INLET Flow Momentum", unit: "Pa", getValue: (s) => s.inletFlowMomentumPa, decimals: 2 },
    { type: "data", label: "OUTLET Pressure", unit: "kPag", getValue: (s) => s.outletPressureBarg * 100, decimals: 2 },
    { type: "data", label: "OUTLET Temperature", unit: "°C", getValue: (s) => s.outletTemperatureC, decimals: 2 },
    { type: "data", label: "OUTLET Density", unit: "kg/m³", getValue: (s) => s.outletDensityKgM3, decimals: 2 },
    { type: "data", label: "OUTLET Mach Number", getValue: (s) => s.outletMachNumber ?? "N/A", decimals: 4 },
    { type: "data", label: "OUTLET Velocity", unit: "m/s", getValue: (s) => s.outletVelocityMs, decimals: 4 },
    { type: "data", label: "OUTLET Erosional Velocity", unit: "m/s", getValue: (s) => s.outletErosionalVelocityMs, decimals: 4 },
    { type: "data", label: "OUTLET Flow Momentum", unit: "Pa", getValue: (s) => s.outletFlowMomentumPa, decimals: 2 },

    // VIII. STATUS
    { type: "section", label: "VIII. STATUS" },
    {
        type: "data",
        label: "Choked",
        getValue: (s) => s.isChoked ? "YES" : "NO",
        color: (s) => s.isChoked ? "error.main" : "success.main",
    },
    {
        type: "data",
        label: "Erosional",
        getValue: (s) => s.isErosional ? "YES" : "NO",
        color: (s) => s.isErosional ? "warning.main" : "success.main",
    },
];

export function HydraulicReportDialog({
    open,
    onClose,
    inletSegments,
    outletSegments,
    inletTotalDropKPa,
    outletTotalDropKPa,
    inletHasChoked,
    outletHasChoked,
    caseName = "Sizing Case",
}: HydraulicReportDialogProps) {
    const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(8);

    const allSegments = [
        ...inletSegments.map(s => ({ ...s, network: "Inlet" as const })),
        ...outletSegments.map(s => ({ ...s, network: "Outlet" as const })),
    ];

    const visibleSegments = allSegments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const rowConfigs = getRowConfigs();

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        const headers = ["Property", "Unit", ...allSegments.map(s => `${s.network}-${s.name}`)];
        const rows: string[][] = [];

        rowConfigs.forEach(row => {
            if (row.type === "section") {
                rows.push([row.label, "", ...allSegments.map(() => "")]);
            } else {
                const dataRow = [
                    row.label,
                    row.unit || "",
                    ...allSegments.map(seg => {
                        const val = row.getValue(seg, unitSystem);
                        return formatNumber(val, row.decimals ?? 2);
                    }),
                ];
                rows.push(dataRow);
            }
        });

        const csvContent = [
            headers.map(h => `"${h}"`).join(","),
            ...rows.map(r => r.map(c => `"${c}"`).join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hydraulic_report.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const pressureUnit = unitSystem === "imperial" ? "psi" : "kPa";

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: {
                    minHeight: "85vh",
                    "@media print": {
                        minHeight: "auto",
                        boxShadow: "none",
                    },
                },
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="h6" fontWeight={600}>
                        Hydraulic Calculations Report
                    </Typography>
                    <IconButton onClick={onClose} sx={{ "@media print": { display: "none" } }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
                {/* Header with title and actions */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
                    <Typography variant="h5" fontWeight={600} sx={{ textTransform: "uppercase" }}>
                        PSV Hydraulic Summary
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, "@media print": { display: "none" } }}>
                        <ToggleButtonGroup
                            color="primary"
                            value={unitSystem}
                            exclusive
                            onChange={(_, val) => val && setUnitSystem(val)}
                            size="small"
                        >
                            <Tooltip title="Metric (kPa)">
                                <ToggleButton value="metric">kPa</ToggleButton>
                            </Tooltip>
                            <Tooltip title="Imperial (psi)">
                                <ToggleButton value="imperial">psi</ToggleButton>
                            </Tooltip>
                        </ToggleButtonGroup>
                        <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} size="small">
                            Print
                        </Button>
                        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV} size="small">
                            CSV
                        </Button>
                    </Box>
                </Box>

                {/* Summary chips */}
                <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
                    <Chip
                        label={`Inlet: ${inletSegments.length} segments`}
                        color="primary"
                        variant="outlined"
                    />
                    <Chip
                        label={`Inlet ΔP: ${formatNumber(unitSystem === "imperial" ? inletTotalDropKPa * 0.145038 : inletTotalDropKPa, 2)} ${pressureUnit}`}
                        color={inletHasChoked ? "error" : "primary"}
                    />
                    <Chip
                        label={`Outlet: ${outletSegments.length} segments`}
                        color="secondary"
                        variant="outlined"
                    />
                    <Chip
                        label={`Outlet ΔP: ${formatNumber(unitSystem === "imperial" ? outletTotalDropKPa * 0.145038 : outletTotalDropKPa, 2)} ${pressureUnit}`}
                        color={outletHasChoked ? "error" : "secondary"}
                    />
                </Box>

                {/* Main table - property rows, segment columns */}
                <TableContainer component={Paper} elevation={1} sx={{ mb: 2 }}>
                    <Table size="small" sx={{ minWidth: 800 }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: "primary.dark" }}>
                                <TableCell sx={{ color: "white", fontWeight: "bold", minWidth: 180, position: "sticky", left: 0, bgcolor: "primary.dark", zIndex: 1 }}>
                                    Property
                                </TableCell>
                                <TableCell sx={{ color: "white", fontWeight: "bold", minWidth: 60 }}>
                                    Unit
                                </TableCell>
                                {visibleSegments.map((seg) => (
                                    <TableCell
                                        key={`${seg.network}-${seg.pipeId}`}
                                        align="center"
                                        sx={{
                                            color: "white",
                                            fontWeight: "bold",
                                            minWidth: 100,
                                            bgcolor: seg.network === "Inlet" ? "primary.dark" : "secondary.dark",
                                        }}
                                    >
                                        <Typography variant="caption" display="block" sx={{ opacity: 0.7 }}>
                                            {seg.network}
                                        </Typography>
                                        {seg.name}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rowConfigs.map((row, rowIdx) => {
                                if (row.type === "section") {
                                    return (
                                        <TableRow key={rowIdx} sx={{ bgcolor: "action.hover" }}>
                                            <TableCell
                                                colSpan={2 + visibleSegments.length}
                                                sx={{ fontWeight: "bold", py: 1 }}
                                            >
                                                {row.label}
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                return (
                                    <TableRow key={rowIdx} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                                        <TableCell sx={{ position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 1 }}>
                                            {row.label}
                                        </TableCell>
                                        <TableCell sx={{ color: "text.secondary" }}>
                                            {row.unit === "kPa" ? pressureUnit : row.unit || ""}
                                        </TableCell>
                                        {visibleSegments.map((seg) => {
                                            const val = row.getValue(seg, unitSystem);
                                            const color = row.color?.(seg);
                                            return (
                                                <TableCell
                                                    key={seg.pipeId}
                                                    align="center"
                                                    sx={{ color: color || "inherit", fontWeight: color ? "bold" : "normal" }}
                                                >
                                                    {formatNumber(val, row.decimals ?? 2)}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                <TablePagination
                    component="div"
                    count={allSegments.length}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[4, 8, 12, 16]}
                    labelRowsPerPage="Items per page:"
                    sx={{ "@media print": { display: "none" } }}
                />
            </DialogContent>
        </Dialog>
    );
}
