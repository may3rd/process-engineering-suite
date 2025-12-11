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

const getRowConfigs = (): RowConfig[] => [
    { type: "data", label: "Segment ID", getValue: (s) => s.name },
    { type: "data", label: "Pipe ID", getValue: (s) => s.pipeId },

    { type: "section", label: "I. PIPE GEOMETRY" },
    { type: "data", label: "Diameter", unit: "mm", getValue: (s) => s.diameter, decimals: 1 },
    { type: "data", label: "Length", unit: "m", getValue: (s) => s.length, decimals: 2 },

    { type: "section", label: "II. FLOW CONDITIONS" },
    {
        type: "data",
        label: "Velocity",
        unit: "m/s",
        getValue: (s) => s.velocity,
        decimals: 1,
        color: (s) => s.isErosional ? "error.main" : undefined,
    },
    {
        type: "data",
        label: "Mach Number",
        getValue: (s) => s.machNumber,
        decimals: 3,
        color: (s) => (s.machNumber ?? 0) > 0.7 ? "error.main" : (s.machNumber ?? 0) > 0.5 ? "warning.main" : undefined,
    },
    { type: "data", label: "Reynolds Number", getValue: (s) => s.reynoldsNumber ? s.reynoldsNumber.toExponential(2) : undefined },
    { type: "data", label: "Friction Factor", getValue: (s) => s.frictionFactor, decimals: 5 },
    { type: "data", label: "Total K", getValue: (s) => s.totalK, decimals: 3 },

    { type: "section", label: "III. PRESSURE DATA" },
    { type: "data", label: "Inlet Pressure", unit: "barg", getValue: (s) => s.inletPressureBarg, decimals: 2 },
    { type: "data", label: "Outlet Pressure", unit: "barg", getValue: (s) => s.outletPressureBarg, decimals: 2 },
    {
        type: "data",
        label: "Pressure Drop",
        unit: "kPa",
        getValue: (s, us) => us === "imperial" ? (s.pressureDropKPa ?? 0) * 0.145038 : s.pressureDropKPa,
        decimals: 2
    },

    { type: "section", label: "IV. STATUS" },
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
                                {visibleSegments.map((seg, idx) => (
                                    <TableCell
                                        key={seg.pipeId}
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
