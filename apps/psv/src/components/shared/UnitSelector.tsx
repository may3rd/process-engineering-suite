/**
 * Unit Selector Component
 *
 * Standard pattern for all number+unit inputs across apps/psv.
 * EXACTLY matches ScenarioEditor.tsx pattern (lines 277-395).
 *
 * Pattern: TextField with nested TextField (select, variant="standard") as endAdornment
 */

import React, { useState, useEffect } from "react";
import { TextField, MenuItem, InputAdornment } from "@mui/material";
import { convertUnit } from "@eng-suite/physics";

interface UnitSelectorProps {
  value: number | null;
  unit: string;
  availableUnits: readonly string[];
  label: string;
  onChange: (value: number | null, unit: string) => void;
  onBlur?: (committedValue: number | null, unit: string) => void;
  onValidate?: () => void;
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
  onBlur,
  onValidate,
  required = false,
  helperText,
  disabled = false,
  error = false,
  fullWidth = false,
}: UnitSelectorProps & { fullWidth?: boolean }) {
  const [displayValue, setDisplayValue] = useState<string>(
    value?.toString() || "",
  );

  // Update display value when prop changes, but only if it's significantly different
  // from our current local state to avoid "fighting" the user's input
  useEffect(() => {
    if (value === null || value === undefined) {
      if (displayValue !== "") setDisplayValue("");
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
    const numValue = displayValue === "" ? null : parseFloat(displayValue);
    if (numValue !== null && !isNaN(numValue)) {
      onChange(numValue, unit);
      onBlur?.(numValue, unit);
    } else if (displayValue === "") {
      onChange(null, unit);
      onBlur?.(null, unit);
    } else {
      setDisplayValue(value?.toString() || "");
      onBlur?.(value ?? null, unit);
    }
  };

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setDisplayValue(newValue);
    // Immediately notify parent of the new value
    const numValue = newValue === "" ? null : parseFloat(newValue);
    if (numValue === null || !isNaN(numValue)) {
      onChange(numValue, unit);
    }
  };

  const handleUnitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUnit = event.target.value;
    const currentNum = parseFloat(displayValue);

    if (!isNaN(currentNum) && displayValue !== "") {
      try {
        const convertedValue = convertUnit(currentNum, unit, newUnit);
        onChange(convertedValue, newUnit);
      } catch (error) {
        console.error("Unit conversion error:", error);
        setDisplayValue(value?.toString() || "");
        return;
      }
    } else {
      onChange(null, newUnit);
    }

    setTimeout(() => onValidate?.(), 0);
  };

  const minWidth = Math.max(
    60,
    ...availableUnits.map((u) => u.length * 8 + 24),
  );

  const errorId = `${label?.replace(/\s+/g, "-").toLowerCase()}-error`;

  return (
    <TextField
      label={label}
      type="number"
      value={displayValue}
      onChange={handleValueChange}
      onBlur={commitValue}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commitValue();
          (e.target as HTMLElement).blur();
        } else if (e.key === "Escape") {
          // Revert to original value
          setDisplayValue(value?.toString() || "");
          (e.target as HTMLElement).blur();
        }
      }}
      required={required}
      helperText={helperText}
      fullWidth={fullWidth}
      disabled={disabled}
      error={error}
      aria-invalid={error}
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
        formHelperText: {
          id: error ? errorId : undefined,
        },
      }}
      inputProps={{
        step: "any",
      }}
    />
  );
}
