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
} from '@mui/material';
import { VesselDetails } from '@/data/types';
import { UnitSelector } from '../shared';
import { useUnitDetails, UNITS } from './hooks';

interface VesselDetailsFormProps {
    details: VesselDetails | null;
    onChange: (details: VesselDetails) => void;
}

export function VesselDetailsForm({ details, onChange }: VesselDetailsFormProps) {
    const { getUnit, handleUnitChange, getDisplayValue } = useUnitDetails();

    const handleChange = (field: keyof VesselDetails, value: any) => {
        onChange({
            ...details,
            orientation: details?.orientation || 'vertical',
            innerDiameter: details?.innerDiameter || 0,
            tangentToTangentLength: details?.tangentToTangentLength || 0,
            headType: details?.headType || 'ellipsoidal',
            insulated: details?.insulated || false,
            [field]: value
        } as VesselDetails);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="primary">Vessel Geometry</Typography>

            <Grid container spacing={2}>
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
                        label="Tan-to-Tan Length"
                        value={getDisplayValue(details?.tangentToTangentLength, 'tangentToTangentLength', 'mm', 'mm')}
                        unit={getUnit('tangentToTangentLength', 'mm')}
                        availableUnits={UNITS.LENGTH}
                        onChange={(val, unit) => handleUnitChange('tangentToTangentLength', val, unit, 'mm', details, onChange)}
                    />
                </Grid>

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
