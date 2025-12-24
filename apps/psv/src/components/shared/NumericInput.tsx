import React, { useState, useEffect } from 'react';
import { TextField, InputAdornment } from '@mui/material';

interface NumericInputProps {
    value: number | undefined | null;
    onChange: (value: number | undefined) => void;
    label: string;
    endAdornment?: React.ReactNode;
    min?: number;
    max?: number;
    step?: number | string;
    fullWidth?: boolean;
    required?: boolean;
    disabled?: boolean;
    error?: boolean;
    helperText?: string;
    size?: 'small' | 'medium';
}

export function NumericInput({
    value,
    onChange,
    label,
    endAdornment,
    min,
    max,
    step,
    fullWidth = true,
    required = false,
    disabled = false,
    error = false,
    helperText,
    size,
}: NumericInputProps) {
    const [displayValue, setDisplayValue] = useState<string>(value?.toString() || '');

    // Update display value when prop changes, but only if it's significantly different
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
                return; // Ignore update
            }
        }

        // Prop value is different, update display
        setDisplayValue(value.toString());
    }, [value]);

    const commitValue = () => {
        const numValue = displayValue === '' ? undefined : parseFloat(displayValue);

        if (numValue !== undefined && !isNaN(numValue)) {
            onChange(numValue);
        } else if (displayValue === '') {
            onChange(undefined);
        } else {
            // Invalid number, revert
            setDisplayValue(value?.toString() || '');
        }
    };

    return (
        <TextField
            label={label}
            type="number"
            value={displayValue}
            onChange={(e) => setDisplayValue(e.target.value)}
            onBlur={commitValue}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    commitValue();
                    (e.target as HTMLElement).blur();
                } else if (e.key === 'Escape') {
                    setDisplayValue(value?.toString() || '');
                    (e.target as HTMLElement).blur();
                }
            }}
            required={required}
            helperText={helperText}
            fullWidth={fullWidth}
            disabled={disabled}
            error={error}
            size={size}
            slotProps={{
                input: {
                    endAdornment: endAdornment ? (
                        <InputAdornment position="end">{endAdornment}</InputAdornment>
                    ) : undefined,
                },
                htmlInput: {
                    min,
                    max,
                    step
                }
            }}
        />
    );
}
