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
    InputAdornment
} from '@mui/material';
import { PumpDetails } from '@/data/types';
import { UnitSelector } from '../shared';
import { useUnitDetails, UNITS } from './hooks';

interface PumpDetailsFormProps {
    details: PumpDetails | null;
    onChange: (details: PumpDetails) => void;
}

export function PumpDetailsForm({ details, onChange }: PumpDetailsFormProps) {
    const { getUnit, handleUnitChange, getDisplayValue } = useUnitDetails();

    const handleChange = (field: keyof PumpDetails, value: any) => {
        onChange({
            ...details,
            pumpType: details?.pumpType || 'centrifugal',
            ratedFlow: details?.ratedFlow || 0,
            ratedHead: details?.ratedHead || 0,
            maxDischargePressure: details?.maxDischargePressure || 0,
            [field]: value
        } as PumpDetails);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="primary">Pump Specification</Typography>

            <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={details?.pumpType || 'centrifugal'}
                            label="Type"
                            onChange={(e) => handleChange('pumpType', e.target.value)}
                        >
                            <MenuItem value="centrifugal">Centrifugal</MenuItem>
                            <MenuItem value="positive_displacement">PD (Reciprocating)</MenuItem>
                            <MenuItem value="rotary">PD (Rotary)</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Rated Flow"
                        value={getDisplayValue(details?.ratedFlow, 'ratedFlow', 'm3/h', 'm3/h')}
                        unit={getUnit('ratedFlow', 'm3/h')}
                        availableUnits={UNITS.FLOW_RATE}
                        onChange={(val, unit) => handleUnitChange('ratedFlow', val, unit, 'm3/h', details, onChange)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Rated Head"
                        value={getDisplayValue(details?.ratedHead, 'ratedHead', 'm', 'm')}
                        unit={getUnit('ratedHead', 'm')}
                        availableUnits={UNITS.LENGTH}
                        onChange={(val, unit) => handleUnitChange('ratedHead', val, unit, 'm', details, onChange)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Power"
                        value={getDisplayValue(details?.motorPower, 'motorPower', 'kW', 'kW')}
                        unit={getUnit('motorPower', 'kW')}
                        availableUnits={UNITS.POWER}
                        onChange={(val, unit) => handleUnitChange('motorPower', val, unit, 'kW', details, onChange)}
                    />
                </Grid>

                <Grid size={{ xs: 6 }}>
                    <UnitSelector
                        label="Max Discharge P"
                        value={getDisplayValue(details?.maxDischargePressure, 'maxDischargePressure', 'barg', 'barg')}
                        unit={getUnit('maxDischargePressure', 'barg')}
                        availableUnits={UNITS.PRESSURE}
                        onChange={(val, unit) => handleUnitChange('maxDischargePressure', val, unit, 'barg', details, onChange)}
                    />
                </Grid>

                {details?.pumpType === 'centrifugal' && (
                    <Grid size={{ xs: 6 }}>
                        <UnitSelector
                            label="Shutoff Head"
                            value={getDisplayValue(details?.shutoffHead, 'shutoffHead', 'm', 'm')}
                            unit={getUnit('shutoffHead', 'm')}
                            availableUnits={UNITS.LENGTH}
                            onChange={(val, unit) => handleUnitChange('shutoffHead', val, unit, 'm', details, onChange)}
                        />
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
