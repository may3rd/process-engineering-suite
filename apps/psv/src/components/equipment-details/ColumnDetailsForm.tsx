import React from 'react';
import {
    Box,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Typography,
    Grid,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { ColumnDetails } from '@/data/types';
import { UnitSelector } from '../shared';
import { useUnitDetails, UNITS } from './hooks';

interface ColumnDetailsFormProps {
    details: ColumnDetails | null;
    onChange: (details: ColumnDetails) => void;
}

export function ColumnDetailsForm({ details, onChange }: ColumnDetailsFormProps) {
    const { getUnit, handleUnitChange, getDisplayValue } = useUnitDetails();

    const handleChange = (field: keyof ColumnDetails, value: any) => {
        onChange({
            ...details,
            innerDiameter: details?.innerDiameter || 0,
            tangentToTangentHeight: details?.tangentToTangentHeight || 0,
            headType: details?.headType || 'ellipsoidal',
            columnType: details?.columnType || 'tray',
            insulated: details?.insulated || false,
            [field]: value
        } as ColumnDetails);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="primary">Column Geometry</Typography>

            <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Column Type</InputLabel>
                        <Select
                            value={details?.columnType || 'tray'}
                            label="Column Type"
                            onChange={(e) => handleChange('columnType', e.target.value)}
                        >
                            <MenuItem value="tray">Tray</MenuItem>
                            <MenuItem value="packed">Packed</MenuItem>
                            <MenuItem value="structured_packing">Structured Packing</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Head Type</InputLabel>
                        <Select
                            value={details?.headType || 'ellipsoidal'}
                            label="Head Type"
                            onChange={(e) => handleChange('headType', e.target.value)}
                        >
                            <MenuItem value="ellipsoidal">Ellipsoidal (2:1)</MenuItem>
                            <MenuItem value="hemispherical">Hemispherical</MenuItem>
                            <MenuItem value="torispherical">Torispherical</MenuItem>
                            <MenuItem value="flat">Flat</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Inner Diameter"
                        value={getDisplayValue(details?.innerDiameter, 'innerDiameter', 'mm', 'mm')}
                        unit={getUnit('innerDiameter', 'mm')}
                        availableUnits={UNITS.LENGTH}
                        onChange={(val, unit) => handleUnitChange('innerDiameter', val, unit, 'mm', details, onChange)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="T-T Height"
                        value={getDisplayValue(details?.tangentToTangentHeight, 'tangentToTangentHeight', 'mm', 'mm')}
                        unit={getUnit('tangentToTangentHeight', 'mm')}
                        availableUnits={UNITS.LENGTH}
                        onChange={(val, unit) => handleUnitChange('tangentToTangentHeight', val, unit, 'mm', details, onChange)}
                    />
                </Grid>

                {details?.columnType === 'tray' && (
                    <>
                        <Grid size={{ xs: 6 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Number of Trays"
                                type="number"
                                value={details?.numberOfTrays || ''}
                                onChange={(e) => handleChange('numberOfTrays', parseFloat(e.target.value))}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <UnitSelector
                                label="Tray Spacing"
                                value={getDisplayValue(details?.traySpacing, 'traySpacing', 'mm', 'mm')}
                                unit={getUnit('traySpacing', 'mm')}
                                availableUnits={UNITS.LENGTH}
                                onChange={(val, unit) => handleUnitChange('traySpacing', val, unit, 'mm', details, onChange)}
                            />
                        </Grid>
                    </>
                )}

                {(details?.columnType === 'packed' || details?.columnType === 'structured_packing') && (
                    <Grid size={{ xs: 6 }}>
                        <UnitSelector
                            label="Packing Height"
                            value={getDisplayValue(details?.packingHeight, 'packingHeight', 'mm', 'mm')}
                            unit={getUnit('packingHeight', 'mm')}
                            availableUnits={UNITS.LENGTH}
                            onChange={(val, unit) => handleUnitChange('packingHeight', val, unit, 'mm', details, onChange)}
                        />
                    </Grid>
                )}

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Wall Thickness"
                        value={getDisplayValue(details?.wallThickness, 'wallThickness', 'mm', 'mm')}
                        unit={getUnit('wallThickness', 'mm')}
                        availableUnits={UNITS.LENGTH}
                        onChange={(val, unit) => handleUnitChange('wallThickness', val, unit, 'mm', details, onChange)}
                    />
                </Grid>
            </Grid>

            <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Insulation</Typography>

            <FormControlLabel
                control={
                    <Checkbox
                        checked={details?.insulated || false}
                        onChange={(e) => handleChange('insulated', e.target.checked)}
                    />
                }
                label="Insulated"
            />

            {details?.insulated && (
                <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={details?.insulationType || ''}
                                label="Type"
                                onChange={(e) => handleChange('insulationType', e.target.value)}
                            >
                                <MenuItem value="mineral_wool">Mineral Wool</MenuItem>
                                <MenuItem value="calcium_silicate">Calcium Silicate</MenuItem>
                                <MenuItem value="cellular_glass">Cellular Glass</MenuItem>
                                <MenuItem value="polyurethane">Polyurethane</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <UnitSelector
                            label="Thickness"
                            value={getDisplayValue(details?.insulationThickness, 'insulationThickness', 'mm', 'mm')}
                            unit={getUnit('insulationThickness', 'mm')}
                            availableUnits={UNITS.LENGTH}
                            onChange={(val, unit) => handleUnitChange('insulationThickness', val, unit, 'mm', details, onChange)}
                        />
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}
