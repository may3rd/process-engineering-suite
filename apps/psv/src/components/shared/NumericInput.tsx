import React, { useState, useEffect } from "react";
import { TextField, InputAdornment } from "@mui/material";

interface NumericInputProps {
  value: number | undefined | null;
  onChange: (value: number | undefined) => void;
  onBlur?: (committedValue: number | undefined) => void;
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
  size?: "small" | "medium";
}

export function NumericInput({
  value,
  onChange,
  onBlur,
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
  const [displayValue, setDisplayValue] = useState<string>(
    value?.toString() || "",
  );

  const getRangeError = (num: number | null | undefined): string | null => {
    if (num === undefined || num === null || isNaN(num)) return null;
    if (min !== undefined && num < min) {
      return `Value must be ≥ ${min}`;
    }
    if (max !== undefined && num > max) {
      return `Value must be ≤ ${max}`;
    }
    return null;
  };

  const displayError = error || !!getRangeError(value);
  const displayHelperText = displayError
    ? getRangeError(value) || helperText
    : helperText;
  const errorId = `${label?.replace(/\s+/g, "-").toLowerCase()}-error`;

  const commitValue = (): number | undefined => {
    const numValue = displayValue === "" ? undefined : parseFloat(displayValue);
    const rangeError = getRangeError(numValue);

    if (numValue !== undefined && !isNaN(numValue) && !rangeError) {
      onChange(numValue);
      return numValue;
    } else if (displayValue === "") {
      onChange(undefined);
      return undefined;
    } else {
      setDisplayValue(value?.toString() || "");
      return value ?? undefined;
    }
  };

  return (
    <TextField
      label={label}
      type="number"
      value={displayValue}
      onChange={(e) => {
        const newValue = e.target.value;
        setDisplayValue(newValue);
        const numValue = newValue === "" ? undefined : parseFloat(newValue);
        if (numValue === undefined || !isNaN(numValue)) {
          const rangeError = getRangeError(numValue);
          if (!rangeError) {
            onChange(numValue);
          }
        }
      }}
      onBlur={() => {
        const committed = commitValue();
        onBlur?.(committed);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commitValue();
          (e.target as HTMLElement).blur();
        } else if (e.key === "Escape") {
          setDisplayValue(value?.toString() || "");
          (e.target as HTMLElement).blur();
        }
      }}
      required={required}
      helperText={displayHelperText}
      fullWidth={fullWidth}
      disabled={disabled}
      error={displayError}
      size={size}
      aria-invalid={displayError}
      slotProps={{
        input: {
          endAdornment: endAdornment ? (
            <InputAdornment position="end">{endAdornment}</InputAdornment>
          ) : undefined,
        },
        htmlInput: {
          min,
          max,
          step,
        },
        formHelperText: {
          id: displayError ? errorId : undefined,
        },
      }}
    />
  );
}
