/**
 * Unit Selector Component
 * 
 * Standard pattern for all number+unit inputs across apps/psv.
 * EXACTLY matches ScenarioEditor.tsx pattern (lines 277-395).
 * 
 * Pattern: TextField with nested TextField (select, variant="standard") as endAdornment
 */

import React, { useState, useEffect } from 'react';
import {
    TextField,
    MenuItem,
    InputAdornment,
} from '@mui/material';
import { convertUnit } from '@eng-suite/physics';

interface UnitSelectorProps {
    value: number | null;
    unit: string;
    availableUnits: readonly string[];
    label: string;
    onChange: (value: number | null, unit: string) => void;
    required?: boolean;
    helperText?: string;
    disabled?: boolean;
    error?: boolean;
}

export function UnitSelector({
    value,
    unit,
    availableUnits,
    label,
    onChange,
    required = false,
    helperText,
    disabled = false,
    error = false,
}: UnitSelectorProps) {
    const [displayValue, setDisplayValue] = useState<string>(value?.toString() || '');

    // Update display value when prop changes
    useEffect(() => {
        setDisplayValue(value?.toString() || '');
    }, [value]);

    const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setDisplayValue(newValue);

        // Parse and update
        const numValue = newValue === '' ? null : parseFloat(newValue);
        if (numValue !== null && !isNaN(numValue)) {
            onChange(numValue, unit);
        } else if (newValue === '') {
            onChange(null, unit);
        }
    };

    const handleUnitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newUnit = event.target.value;

        if (value !== null) {
            try {
                // Convert value from old unit to new unit
                const convertedValue = convertUnit(value, unit, newUnit);
                onChange(convertedValue, newUnit);
            } catch (error) {
                console.error('Unit conversion error:', error);
                // If conversion fails, just change unit without converting value
                onChange(value, newUnit);
            }
        } else {
            onChange(null, newUnit);
        }
    };

    const minWidth = Math.max(60, ...availableUnits.map(u => u.length * 8 + 24));

    return (
        <TextField
            label={label}
            type="number"
            value={displayValue}
            onChange={handleValueChange}
            required={required}
            helperText={helperText}
            fullWidth
            disabled={disabled}
            error={error}
            slotProps={{
                input: {
                    endAdornment: (
                        <InputAdornment position="end">
                            <TextField
                                select
                                variant="standard"
                                value={unit}
                                onChange={handleUnitChange}
                                sx={{ minWidth }}
                                disabled={disabled}
                            >
                                {availableUnits.map((u) => (
                                    <MenuItem key={u} value={u}>
                                        {u}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </InputAdornment>
                    ),
                },
            }}
            inputProps={{
                step: 'any',
            }}
        />
    );
}
