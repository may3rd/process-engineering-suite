"use client";

import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Box,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { HydraulicSegmentResult } from "@/lib/hydraulicValidation";

interface HydraulicReportTableProps {
    title: string;
    segments: HydraulicSegmentResult[];
    totalPressureDropKPa: number;
    hasChokedFlow: boolean;
    warnings: string[];
    defaultExpanded?: boolean;
}

const formatNumber = (val: number | undefined, decimals = 2) => {
    if (val === undefined || val === null || !Number.isFinite(val)) return "-";
    return val.toFixed(decimals);
};

const formatScientific = (val: number | undefined) => {
    if (val === undefined || val === null || !Number.isFinite(val)) return "-";
    if (val === 0) return "0";
    if (val > 1e6 || val < 1e-3) {
        return val.toExponential(2);
    }
    return val.toFixed(0);
};

export function HydraulicReportTable({
    title,
    segments,
    totalPressureDropKPa,
    hasChokedFlow,
    warnings,
    defaultExpanded = false,
}: HydraulicReportTableProps) {
    if (segments.length === 0) {
        return null;
    }

    // Calculate summary stats
    const maxVelocity = Math.max(...segments.map(s => s.velocity || 0));
    const maxMach = segments.some(s => s.machNumber !== undefined)
        ? Math.max(...segments.filter(s => s.machNumber !== undefined).map(s => s.machNumber!))
        : undefined;

    return (
        <Accordion
            defaultExpanded={defaultExpanded}
            sx={(theme) => ({
                mb: 2,
                borderRadius: '12px !important',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: hasChokedFlow
                    ? theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.3)' : 'rgba(237, 108, 2, 0.2)'
                    : theme.palette.mode === 'dark' ? 'rgba(2, 132, 199, 0.3)' : 'rgba(2, 132, 199, 0.2)',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                '&:before': { display: 'none' },
            })}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={(theme) => ({
                    bgcolor: hasChokedFlow
                        ? theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.15)' : 'rgba(237, 108, 2, 0.08)'
                        : theme.palette.mode === 'dark' ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.08)',
                    minHeight: 48,
                    borderRadius: 0,
                })}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        {title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto', mr: 2 }}>
                        <Chip
                            label={`ΔP: ${formatNumber(totalPressureDropKPa, 1)} kPa`}
                            size="small"
                            variant="outlined"
                        />
                        <Chip
                            label={`Vmax: ${formatNumber(maxVelocity, 1)} m/s`}
                            size="small"
                            variant="outlined"
                        />
                        {maxMach !== undefined && (
                            <Chip
                                label={`Mach: ${formatNumber(maxMach, 2)}`}
                                size="small"
                                color={maxMach > 0.5 ? 'error' : 'default'}
                                variant={maxMach > 0.5 ? 'filled' : 'outlined'}
                            />
                        )}
                        {hasChokedFlow ? (
                            <Chip
                                icon={<WarningIcon />}
                                label="Choked"
                                size="small"
                                color="error"
                            />
                        ) : (
                            <Chip
                                icon={<CheckCircleIcon />}
                                label="OK"
                                size="small"
                                color="success"
                            />
                        )}
                    </Box>
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
                {warnings.length > 0 && (
                    <Alert severity="warning" sx={{ borderRadius: 0 }}>
                        {warnings.map((w, i) => (
                            <Typography key={i} variant="body2">{w}</Typography>
                        ))}
                    </Alert>
                )}
                <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent', borderRadius: 0 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={(theme) => ({
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(2, 132, 199, 0.1)' : 'rgba(2, 132, 199, 0.06)'
                            })}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Segment</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Dia (mm)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Length (m)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>V (m/s)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Mach</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>P₁ (barg)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>P₂ (barg)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>ΔP (kPa)</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {segments.map((seg) => (
                                <TableRow
                                    key={seg.pipeId}
                                    sx={(theme) => ({
                                        bgcolor: seg.isChoked
                                            ? theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.15)' : 'rgba(211, 47, 47, 0.08)'
                                            : seg.isErosional
                                                ? theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.15)' : 'rgba(237, 108, 2, 0.08)'
                                                : 'inherit',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    })}
                                >
                                    <TableCell>{seg.name}</TableCell>
                                    <TableCell align="right">{formatNumber(seg.diameter, 1)}</TableCell>
                                    <TableCell align="right">{formatNumber(seg.length, 1)}</TableCell>
                                    <TableCell align="right">{formatNumber(seg.velocity, 1)}</TableCell>
                                    <TableCell align="right">
                                        {seg.machNumber !== undefined ? (
                                            <Typography
                                                component="span"
                                                variant="inherit"
                                                color={seg.machNumber > 0.5 ? 'error.main' : 'inherit'}
                                                fontWeight={seg.machNumber > 0.5 ? 'bold' : 'normal'}
                                            >
                                                {formatNumber(seg.machNumber, 3)}
                                            </Typography>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell align="right">{formatNumber(seg.inletPressureBarg, 2)}</TableCell>
                                    <TableCell align="right">{formatNumber(seg.outletPressureBarg, 2)}</TableCell>
                                    <TableCell align="right">
                                        <Typography
                                            component="span"
                                            variant="inherit"
                                            fontWeight="bold"
                                            color="primary.main"
                                        >
                                            {formatNumber(seg.pressureDropKPa, 2)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        {seg.isChoked ? (
                                            <Chip label="CHOKED" size="small" color="error" />
                                        ) : seg.isErosional ? (
                                            <Chip label="EROSIONAL" size="small" color="warning" />
                                        ) : (
                                            <Chip label="OK" size="small" color="success" />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {/* Total Row */}
                            <TableRow sx={{ bgcolor: 'action.selected' }}>
                                <TableCell colSpan={7} sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                                    TOTAL
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="inherit" fontWeight="bold" color="primary.main">
                                        {formatNumber(totalPressureDropKPa, 2)}
                                    </Typography>
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </AccordionDetails>
        </Accordion>
    );
}
