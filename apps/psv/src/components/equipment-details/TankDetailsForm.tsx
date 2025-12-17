import React from 'react';
import {
    Box,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Typography,
    Grid,
    FormControlLabel,
    Checkbox,
    InputAdornment
} from '@mui/material';
import { TankDetails } from '@/data/types';
import { UnitSelector } from '../shared';
import { useUnitDetails, UNITS } from './hooks';

interface TankDetailsFormProps {
    details: TankDetails | null;
    onChange: (details: TankDetails) => void;
}

export function TankDetailsForm({ details, onChange }: TankDetailsFormProps) {
    const { getUnit, handleUnitChange, getDisplayValue } = useUnitDetails();

    const handleChange = (field: keyof TankDetails, value: any) => {
        onChange({
            ...details,
            tankType: details?.tankType || 'atmospheric',
            orientation: details?.orientation || 'vertical',
            innerDiameter: details?.innerDiameter || 0,
            height: details?.height || 0,
            insulated: details?.insulated || false,
            [field]: value
        } as TankDetails);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="primary">Tank Configuration</Typography>

            <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={details?.tankType || 'atmospheric'}
                            label="Type"
                            onChange={(e) => handleChange('tankType', e.target.value)}
                        >
                            <MenuItem value="atmospheric">Atmospheric</MenuItem>
                            <MenuItem value="low_pressure">Low Pressure</MenuItem>
                            <MenuItem value="pressure">Pressure Tank</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Orientation</InputLabel>
                        <Select
                            value={details?.orientation || 'vertical'}
                            label="Orientation"
                            onChange={(e) => handleChange('orientation', e.target.value)}
                        >
                            <MenuItem value="vertical">Vertical</MenuItem>
                            <MenuItem value="horizontal">Horizontal</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Diameter"
                        value={getDisplayValue(details?.innerDiameter, 'innerDiameter', 'mm', 'mm')}
                        unit={getUnit('innerDiameter', 'mm')}
                        availableUnits={UNITS.LENGTH}
                        onChange={(val, unit) => handleUnitChange('innerDiameter', val, unit, 'mm', details, onChange)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label={details?.orientation === 'horizontal' ? 'Length' : 'Height'}
                        value={getDisplayValue(details?.height, 'height', 'mm', 'mm')}
                        unit={getUnit('height', 'mm')}
                        availableUnits={UNITS.LENGTH}
                        onChange={(val, unit) => handleUnitChange('height', val, unit, 'mm', details, onChange)}
                    />
                </Grid>

                {details?.orientation !== 'horizontal' && (
                    <Grid size={{ xs: 6 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Roof Type</InputLabel>
                            <Select
                                value={details?.roofType || 'fixed_cone'}
                                label="Roof Type"
                                onChange={(e) => handleChange('roofType', e.target.value)}
                            >
                                <MenuItem value="fixed_cone">Fixed Cone</MenuItem>
                                <MenuItem value="fixed_dome">Fixed Dome</MenuItem>
                                <MenuItem value="floating_internal">Internal Floating</MenuItem>
                                <MenuItem value="floating_external">External Floating</MenuItem>
                                <MenuItem value="open">Open Top</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                )}
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
