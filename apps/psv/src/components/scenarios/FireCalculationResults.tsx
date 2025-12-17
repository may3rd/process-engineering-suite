/**
 * Fire Calculation Results Display Component
 * 
 * Shows results following project UOM preferences
 * Displays multi-equipment breakdown
 */

import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Stack,
    Divider,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { Equipment } from '@/data/types';
import { convertUnit } from '@eng-suite/physics';
import { usePsvStore } from '@/store/usePsvStore';

interface FireCalculationResultsProps {
    equipment: Equipment[];
    results?: {
        equipmentResults: Array<{
            equipmentId: string;
            equipmentTag: string;
            wettedArea: number;
            liquidLevel: number;
        }>;
        totalWettedArea: number;
        limitedWettedArea: number;
        heatAbsorption: number;  // kW
        reliefRate: number;  // kg/h
        warnings: string[];
    };
}

export function FireCalculationResults({ equipment, results }: FireCalculationResultsProps) {
    const { selectedProject } = usePsvStore();

    if (!results) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                    No calculation results yet. Configure and calculate in previous steps.
                </Typography>
            </Box>
        );
    }

    // Get project unit preferences (or defaults)
    const unitSystem = selectedProject?.unitSystem || 'metric';
    const areaUnit = unitSystem === 'imperial' ? 'ft2' : 'm2';
    const powerUnit = 'kW';
    const flowUnit = unitSystem === 'imperial' ? 'lb/h' : 'kg/h';

    // Convert results to display units
    const displayResults = {
        totalWettedArea: convertUnit(results.totalWettedArea, 'm2', areaUnit),
        limitedWettedArea: convertUnit(results.limitedWettedArea, 'm2', areaUnit),
        heatAbsorption: results.heatAbsorption,  // already in kW
        reliefRate: convertUnit(results.reliefRate, 'kg/h', flowUnit),
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                📊 API-521 Calculation Results
            </Typography>

            <Alert
                severity="success"
                icon={<CheckCircleIcon />}
                sx={{ mb: 3, borderRadius: 2 }}
            >
                Calculation complete. Review results below and proceed to save scenario.
            </Alert>

            {/* Equipment Breakdown */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Equipment Wetted Areas
                    </Typography>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Equipment Tag</TableCell>
                                    <TableCell align="right">Liquid Level (m)</TableCell>
                                    <TableCell align="right">Wetted Area ({areaUnit})</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {results.equipmentResults.map((eqResult) => {
                                    const wettedArea = convertUnit(eqResult.wettedArea, 'm2', areaUnit);
                                    return (
                                        <TableRow key={eqResult.equipmentId}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {eqResult.equipmentTag}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                {eqResult.liquidLevel.toFixed(2)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {wettedArea.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                <TableRow>
                                    <TableCell colSpan={2}>
                                        <Typography variant="body2" fontWeight={600}>
                                            Total
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight={600}>
                                            {displayResults.totalWettedArea.toFixed(2)}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Heat Absorption */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Fire Heat Absorption
                    </Typography>

                    <Box sx={{ py: 2 }}>
                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                            Formula: Q = 43,200 × F × A^0.82
                        </Typography>

                        <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
                            <Box sx={{ flex: "1 1 45%" }}>
                                <Typography variant="body2" color="text.secondary">
                                    Wetted Area
                                </Typography>
                                <Typography variant="h6">
                                    {displayResults.totalWettedArea.toFixed(2)} {areaUnit}
                                </Typography>
                            </Box>
                            <Box sx={{ flex: "1 1 45%" }}>
                                <Typography variant="body2" color="text.secondary">
                                    Heat Load
                                </Typography>
                                <Typography variant="h6">
                                    {displayResults.heatAbsorption.toFixed(0)} {powerUnit}
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>

            {/* Required Relief Rate - Highlighted */}
            <Card
                sx={{
                    mb: 3,
                    borderRadius: 2,
                    border: 2,
                    borderColor: 'primary.main',
                    bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'rgba(25, 118, 210, 0.1)'
                            : 'rgba(25, 118, 210, 0.05)',
                }}
            >
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        🎯 Required Relief Rate
                    </Typography>

                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="h3" fontWeight={700} color="primary">
                            {displayResults.reliefRate.toFixed(0)}
                        </Typography>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            {flowUnit}
                        </Typography>

                        {unitSystem === 'imperial' && (
                            <Typography variant="body2" color="text.secondary">
                                ({(results.reliefRate / 2.205).toFixed(0)} kg/h)
                            </Typography>
                        )}

                        {unitSystem !== 'imperial' && (
                            <Typography variant="body2" color="text.secondary">
                                ({(results.reliefRate * 2.205).toFixed(0)} lb/h)
                            </Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="caption" color="text.secondary" display="block">
                        This relief rate is based on API-521 fire exposure calculation with the configured
                        environmental factor and equipment wetted areas.
                    </Typography>
                </CardContent>
            </Card>

            {/* Warnings */}
            {results.warnings && results.warnings.length > 0 && (
                <Alert severity="warning" icon={<WarningIcon />} sx={{ borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Validation Warnings:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {results.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                        ))}
                    </ul>
                </Alert>
            )}
        </Box>
    );
}
