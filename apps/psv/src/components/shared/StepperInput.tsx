import React from "react";
import {
    TextField,
    IconButton,
    InputAdornment,
    Box,
    Typography,
} from "@mui/material";
import { Add as AddIcon, Remove as RemoveIcon } from "@mui/icons-material";

interface StepperInputProps {
    value: number;
    onChange: (value: number) => void;
    label: string;
    min?: number;
    max?: number;
    step?: number;
    fullWidth?: boolean;
    disabled?: boolean;
    size?: "small" | "medium";
    helperText?: string;
    error?: boolean;
}

export function StepperInput({
    value,
    onChange,
    label,
    min = 0,
    max,
    step = 1,
    fullWidth = true,
    disabled = false,
    size = "small",
    helperText,
    error = false,
}: StepperInputProps) {
    const handleIncrement = () => {
        const newValue = value + step;
        if (max === undefined || newValue <= max) {
            onChange(newValue);
        }
    };

    const handleDecrement = () => {
        const newValue = value - step;
        if (min === undefined || newValue >= min) {
            onChange(newValue);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
            if ((min === undefined || val >= min) && (max === undefined || val <= max)) {
                onChange(val);
            }
        } else if (e.target.value === "") {
            onChange(min || 0);
        }
    };

    const isAtMin = min !== undefined && value <= min;
    const isAtMax = max !== undefined && value >= max;

    return (
        <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
            <TextField
                label={label}
                value={value}
                onChange={handleInputChange}
                type="number"
                size={size}
                fullWidth={fullWidth}
                disabled={disabled}
                error={error}
                helperText={helperText}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <IconButton
                                    size="small"
                                    onClick={handleDecrement}
                                    disabled={disabled || isAtMin}
                                    edge="start"
                                >
                                    <RemoveIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    size="small"
                                    onClick={handleIncrement}
                                    disabled={disabled || isAtMax}
                                    edge="end"
                                >
                                    <AddIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                    htmlInput: {
                        style: { textAlign: "center" },
                        min,
                        max,
                    },
                }}
                sx={{
                    "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                        display: "none",
                    },
                    "& input": {
                        MozAppearance: "textfield",
                    },
                }}
            />
        </Box>
    );
}
