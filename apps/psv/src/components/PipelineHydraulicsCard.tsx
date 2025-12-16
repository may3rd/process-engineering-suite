"use client";

import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    useTheme,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Tooltip,
    IconButton,
} from "@mui/material";
import {
    Timeline,
    CheckCircle,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Speed,
    Straighten,
    Circle,
    OpenInNew,
} from "@mui/icons-material";
import { ProtectiveSystem, OverpressureScenario, PipelineHydraulicSummary, PipelineNetwork } from "@/data/types";
import { useProjectUnitSystem } from "@/lib/useProjectUnitSystem";
import { convertValue, formatNumber, formatWithUnit } from "@/lib/projectUnits";

interface PipelineHydraulicsCardProps {
    type: 'inlet' | 'outlet';
    psv: ProtectiveSystem;
    governingScenario: OverpressureScenario | null;
    onOpenEditor?: () => void;
}

/**
 * Calculate hydraulic summary from pipeline network and scenario data.
 * This is a simplified calculation for display purposes.
 */
function calculateHydraulicSummary(
    network: PipelineNetwork | undefined,
    scenario: OverpressureScenario | null,
    setPressure: number,
    type: 'inlet' | 'outlet'
): PipelineHydraulicSummary | null {
    if (!network || !scenario || network.pipes.length === 0) {
        return null;
    }

    // Get total length and average diameter
    const totalLength = network.pipes.reduce((sum, pipe) => {
        const pipeLength = pipe.length ?? 0;
        const length = pipe.lengthUnit === 'ft' ? pipeLength * 0.3048 : pipeLength;
        return sum + length;
    }, 0);

    const avgDiameter = network.pipes.reduce((sum, pipe) => {
        const pipeDiameter = pipe.diameter ?? 0;
        const diameter = pipe.diameterUnit === 'in' ? pipeDiameter * 25.4 : pipeDiameter;
        return sum + diameter;
    }, 0) / network.pipes.length;

    // Simple velocity calculation based on mass flow rate
    // v = Q / A, where Q = mass_flow / density, A = pi * d^2 / 4
    const massFlowRate = scenario.relievingRate; // kg/h
    const density = scenario.phase === 'gas' || scenario.phase === 'steam'
        ? 10  // Approximate gas density kg/m³
        : 800; // Approximate liquid density kg/m³

    const volumetricFlow = (massFlowRate / density) / 3600; // m³/s
    const area = Math.PI * Math.pow(avgDiameter / 1000, 2) / 4; // m²
    const velocity = volumetricFlow / area; // m/s

    // Simplified pressure drop calculation (Darcy-Weisbach approximation)
    const viscosity = scenario.phase === 'liquid' ? 0.001 : 0.00002; // Pa.s
    const reynoldsNumber = (density * velocity * (avgDiameter / 1000)) / viscosity;

    // Friction factor (simplified Colebrook approximation for turbulent flow)
    const roughness = 0.046; // mm for commercial steel
    const relativerRoughness = roughness / avgDiameter;
    let frictionFactor = 0.02; // Default
    if (reynoldsNumber > 4000) {
        // Swamee-Jain approximation
        frictionFactor = 0.25 / Math.pow(
            Math.log10(relativerRoughness / 3.7 + 5.74 / Math.pow(reynoldsNumber, 0.9)),
            2
        );
    }

    // Pressure drop: ΔP = f * (L/D) * (ρv²/2)
    const pressureDrop = frictionFactor * (totalLength / (avgDiameter / 1000)) *
        (density * Math.pow(velocity, 2) / 2) / 1000; // kPa

    const pressureDropPercent = (pressureDrop / (setPressure * 100)) * 100; // % of set pressure (barg to kPa)

    // Validation based on API 520/521 criteria
    let validationStatus: 'pass' | 'warning' | 'fail';
    let validationMessage: string;

    if (type === 'inlet') {
        // Inlet: pressure drop should be < 3% of set pressure
        if (pressureDropPercent <= 3) {
            validationStatus = 'pass';
            validationMessage = `ΔP ${pressureDropPercent.toFixed(1)}% ≤ 3% limit`;
        } else if (pressureDropPercent <= 5) {
            validationStatus = 'warning';
            validationMessage = `ΔP ${pressureDropPercent.toFixed(1)}% exceeds 3%, consider larger diameter`;
        } else {
            validationStatus = 'fail';
            validationMessage = `ΔP ${pressureDropPercent.toFixed(1)}% exceeds 5% limit`;
        }
    } else {
        // Outlet: built-up backpressure check (simplified)
        if (pressureDropPercent <= 10) {
            validationStatus = 'pass';
            validationMessage = `Backpressure ${pressureDropPercent.toFixed(1)}% ≤ 10% limit`;
        } else if (pressureDropPercent <= 15) {
            validationStatus = 'warning';
            validationMessage = `Backpressure ${pressureDropPercent.toFixed(1)}%, consider balanced bellows`;
        } else {
            validationStatus = 'fail';
            validationMessage = `Backpressure ${pressureDropPercent.toFixed(1)}% exceeds 15% limit`;
        }
    }

    return {
        totalLength,
        nominalDiameter: avgDiameter,
        velocity,
        pressureDrop,
        pressureDropPercent,
        reynoldsNumber,
        frictionFactor,
        validationStatus,
        validationMessage,
    };
}

export function PipelineHydraulicsCard({
    type,
    psv,
    governingScenario,
    onOpenEditor,
}: PipelineHydraulicsCardProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { unitSystem, units } = useProjectUnitSystem();

    const network = type === 'inlet' ? psv.inletNetwork : psv.outletNetwork;
    const summary = calculateHydraulicSummary(network, governingScenario, psv.setPressure, type);

    const getStatusIcon = () => {
        if (!summary) return <Circle sx={{ fontSize: 16, color: 'text.disabled' }} />;
        switch (summary.validationStatus) {
            case 'pass':
                return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />;
            case 'warning':
                return <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />;
            case 'fail':
                return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
        }
    };

    const getStatusColor = (): 'success' | 'warning' | 'error' | 'default' => {
        if (!summary) return 'default';
        return summary.validationStatus === 'pass' ? 'success' :
            summary.validationStatus === 'warning' ? 'warning' : 'error';
    };

    const title = type === 'inlet' ? 'Inlet Pipeline' : 'Outlet Pipeline';

    return (
        <Card
            sx={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                backdropFilter: 'blur(10px)',
                borderRadius: 3,
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Timeline sx={{ color: type === 'inlet' ? 'primary.main' : 'secondary.main' }} />
                        <Typography variant="subtitle1" fontWeight={600}>
                            {title}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {summary && (
                            <Chip
                                icon={getStatusIcon()}
                                label={summary.validationStatus.toUpperCase()}
                                size="small"
                                color={getStatusColor()}
                                variant="outlined"
                            />
                        )}
                        {onOpenEditor && (
                            <Tooltip title="Open Pipeline Editor">
                                <IconButton size="small" onClick={onOpenEditor}>
                                    <OpenInNew fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>

                {!network || network.pipes.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            No {type} piping defined
                        </Typography>
                    </Box>
                ) : !governingScenario ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            No governing scenario selected
                        </Typography>
                    </Box>
                ) : summary ? (
                    <>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                            Based on: <strong>{governingScenario.cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong> scenario
                        </Typography>

                        <Table size="small" sx={{ '& td, & th': { border: 0, py: 0.75 } }}>
                            <TableBody>
                                <TableRow>
                                    <TableCell sx={{ pl: 0, color: 'text.secondary', width: '50%' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Straighten sx={{ fontSize: 14 }} />
                                            Total Length
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                                        {formatWithUnit(convertValue(summary.totalLength, 'm', units.length.unit), units.length.label, 1)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ pl: 0, color: 'text.secondary' }}>
                                        Nominal Diameter
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                                        {formatWithUnit(convertValue(summary.nominalDiameter, 'mm', units.diameter.unit), units.diameter.label, 0)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ pl: 0, color: 'text.secondary' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Speed sx={{ fontSize: 14 }} />
                                            Velocity
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                                        {unitSystem === 'imperial'
                                            ? formatWithUnit(convertValue(summary.velocity, 'm/s', 'ft/s'), 'ft/s', 1)
                                            : formatWithUnit(summary.velocity, 'm/s', 1)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ pl: 0, color: 'text.secondary' }}>
                                        Pressure Drop
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                                        {formatWithUnit(convertValue(summary.pressureDrop, 'kPa', units.pressureDrop.unit), units.pressureDrop.label, 2)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ pl: 0, color: 'text.secondary' }}>
                                        ΔP / Set Pressure
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            fontWeight: 600,
                                            color: summary.validationStatus === 'pass' ? 'success.main' :
                                                summary.validationStatus === 'warning' ? 'warning.main' : 'error.main'
                                        }}
                                    >
                                        {summary.pressureDropPercent.toFixed(1)}%
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>

                        <Box
                            sx={{
                                mt: 2,
                                p: 1.5,
                                borderRadius: 2,
                                backgroundColor: summary.validationStatus === 'pass'
                                    ? isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)'
                                    : summary.validationStatus === 'warning'
                                        ? isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.08)'
                                        : isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                            }}
                        >
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {getStatusIcon()}
                                {summary.validationMessage}
                            </Typography>
                        </Box>
                    </>
                ) : null}
            </CardContent>
        </Card>
    );
}
