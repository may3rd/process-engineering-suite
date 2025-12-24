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
    fullWidth = false,
}: UnitSelectorProps & { fullWidth?: boolean }) {
    const [displayValue, setDisplayValue] = useState<string>(value?.toString() || '');

    // Update display value when prop changes, but only if it's significantly different
    // from our current local state to avoid "fighting" the user's input
    useEffect(() => {
        if (value === null || value === undefined) {
            if (displayValue !== '') setDisplayValue('');
            return;
        }

        const currentNum = parseFloat(displayValue);
        // If the current input is a valid number, check if the prop value is effectively the same
        if (!isNaN(currentNum)) {
            const epsilon = 1e-10;
            if (Math.abs(currentNum - value) < epsilon) {
                return; // Ignore update, it's just floating point noise or round trip echo
            }
        }

        // Prop value is different, update display
        setDisplayValue(value.toString());
    }, [value]);

    const commitValue = () => {
        const numValue = displayValue === '' ? null : parseFloat(displayValue);
        if (numValue !== null && !isNaN(numValue)) {
            onChange(numValue, unit);
        } else if (displayValue === '') {
            onChange(null, unit);
        } else {
            // Invalid number (e.g. "5..5"), revert
            setDisplayValue(value?.toString() || '');
        }
    };

    const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setDisplayValue(newValue);
        // Immediately notify parent of the new value
        const numValue = newValue === '' ? null : parseFloat(newValue);
        if (numValue === null || !isNaN(numValue)) {
            onChange(numValue, unit);
        }
    };

    const handleUnitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newUnit = event.target.value;
        const currentNum = parseFloat(displayValue);

        if (!isNaN(currentNum) && displayValue !== '') {
            try {
                // Convert current visible value from old unit to new unit
                const convertedValue = convertUnit(currentNum, unit, newUnit);
                onChange(convertedValue, newUnit);
            } catch (error) {
                console.error('Unit conversion error:', error);
                onChange(currentNum, newUnit);
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
            onBlur={commitValue}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    commitValue();
                    (e.target as HTMLElement).blur();
                } else if (e.key === 'Escape') {
                    // Revert to original value
                    setDisplayValue(value?.toString() || '');
                    (e.target as HTMLElement).blur();
                }
            }}
            required={required}
            helperText={helperText}
            fullWidth={fullWidth}
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
