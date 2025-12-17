import React from 'react';
import {
    Box,
    TextField,
    Typography,
    Grid,
    FormControlLabel,
    Checkbox,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { PipingDetails } from '@/data/types';
import { UnitSelector } from '../shared';
import { useUnitDetails, UNITS } from './hooks';

interface PipingDetailsFormProps {
    details: PipingDetails | null;
    onChange: (details: PipingDetails) => void;
}

export function PipingDetailsForm({ details, onChange }: PipingDetailsFormProps) {
    const { getUnit, handleUnitChange, getDisplayValue } = useUnitDetails();

    const handleChange = (field: keyof PipingDetails, value: any) => {
        onChange({
            ...details,
            nominalDiameter: details?.nominalDiameter || 0,
            schedule: details?.schedule || '40',
            material: details?.material || 'Carbon Steel',
            insulated: details?.insulated || false,
            [field]: value
        } as PipingDetails);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="primary">Piping Details</Typography>

            <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Nominal Diameter"
                        value={getDisplayValue(details?.nominalDiameter, 'nominalDiameter', 'mm', 'mm')}
                        unit={getUnit('nominalDiameter', 'mm')}
                        availableUnits={UNITS.LENGTH}
                        onChange={(val, unit) => handleUnitChange('nominalDiameter', val, unit, 'mm', details, onChange)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Material"
                        value={details?.material || ''}
                        onChange={(e) => handleChange('material', e.target.value)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Schedule"
                        value={details?.schedule || ''}
                        onChange={(e) => handleChange('schedule', e.target.value)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Total Length"
                        value={getDisplayValue(details?.totalLength, 'totalLength', 'm', 'm')}
                        unit={getUnit('totalLength', 'm')}
                        availableUnits={UNITS.LENGTH}
                        onChange={(val, unit) => handleUnitChange('totalLength', val, unit, 'm', details, onChange)}
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
