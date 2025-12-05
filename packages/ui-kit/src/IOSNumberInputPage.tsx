"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, InputAdornment, Typography } from "@mui/material";
import { IOSListGroup } from "./IOSListGroup";
import { IOSTextField } from "./IOSTextField";

type Props = {
    label: string;
    value?: number;
    placeholder?: string;
    description?: ReactNode;
    helperText?: string;
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    allowNegative?: boolean;
    allowDecimal?: boolean;
    allowEmpty?: boolean;
    autoFocus?: boolean;
    action?: ReactNode;
    prefix?: ReactNode;
    suffix?: ReactNode;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    onCommit?: (value: number | undefined) => void;
    onChange?: (value: number | undefined) => void;
    onCancel?: () => void;
    onBack?: () => void;
    formatValue?: (value?: number) => string;
    parseValue?: (text: string) => number | undefined;
};

export function IOSNumberInputPage({
    label,
    value,
    placeholder,
    description,
    helperText,
    min,
    max,
    step,
    decimals,
    allowNegative = true,
    allowDecimal = true,
    allowEmpty = true,
    autoFocus = true,
    action,
    prefix,
    suffix,
    inputMode,
    onCommit,
    onChange,
    onCancel,
    onBack,
    formatValue,
    parseValue,
}: Props) {
    const formatFn = useCallback((val?: number) => {
        if (formatValue) return formatValue(val);
        if (val === undefined || Number.isNaN(val)) return "";
        if (typeof decimals === "number") {
            return val.toFixed(decimals);
        }
        return `${val}`;
    }, [decimals, formatValue]);

    const parseFn = useCallback((text: string) => {
        if (parseValue) return parseValue(text);
        if (text.trim() === "") return undefined;
        const parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : undefined;
    }, [parseValue]);

    const [inputValue, setInputValue] = useState(() => formatFn(value));
    const [error, setError] = useState<string | null>(null);
    const dirtyRef = useRef(false);
    const initialValueRef = useRef(value);
    const onCommitRef = useRef(onCommit);

    useEffect(() => {
        onCommitRef.current = onCommit;
    }, [onCommit]);

    useEffect(() => {
        setInputValue(formatFn(value));
        initialValueRef.current = value;
        dirtyRef.current = false;
        setError(null);
    }, [formatFn, value]);

    const numberPattern = useMemo(() => {
        const decimalPart = allowDecimal ? "(?:\\.\\d*)?" : "";
        const signPart = allowNegative ? "-?" : "";
        return new RegExp(`^${signPart}\\d*${decimalPart}$`);
    }, [allowDecimal, allowNegative]);

    const validate = useCallback((numericValue: number | undefined) => {
        if (numericValue === undefined) {
            if (!allowEmpty) {
                setError("Value is required");
                return false;
            }
            return true;
        }

        if (typeof min === "number" && numericValue < min) {
            setError(`Must be at least ${min}`);
            return false;
        }

        if (typeof max === "number" && numericValue > max) {
            setError(`Must be at most ${max}`);
            return false;
        }

        return true;
    }, [allowEmpty, max, min]);

    const commitValue = useCallback((shouldClose = true) => {
        const numericValue = parseFn(inputValue);
        if (!validate(numericValue)) {
            return false;
        }

        if (dirtyRef.current || numericValue !== initialValueRef.current) {
            onCommitRef.current?.(numericValue);
            initialValueRef.current = numericValue;
            dirtyRef.current = false;
        }

        setError(null);

        if (shouldClose) {
            onBack?.();
        }

        return true;
    }, [inputValue, onBack, parseFn, validate]);

    const handleCancel = useCallback(() => {
        setInputValue(formatFn(initialValueRef.current));
        dirtyRef.current = false;
        setError(null);
        onCancel?.();
        onBack?.();
    }, [formatFn, onBack, onCancel]);

    useEffect(() => {
        return () => {
            commitValue(false);
        };
    }, [commitValue]);

    const handleChange = (text: string) => {
        if (text === "" || numberPattern.test(text)) {
            setInputValue(text);
            dirtyRef.current = true;
            setError(null);
            onChange?.(parseFn(text));
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
            event.preventDefault();
            commitValue();
        } else if (event.key === "Escape") {
            event.preventDefault();
            handleCancel();
        }
    };

    return (
        <Box sx={{ pt: 2 }}>
            {description && (
                <Typography sx={{ px: 3, pb: 1, fontSize: 13, color: "text.secondary" }}>
                    {description}
                </Typography>
            )}
            <IOSListGroup>
                <IOSTextField
                    type="text"
                    fullWidth
                    value={inputValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onClear={() => handleChange("")}
                    placeholder={placeholder ?? label}
                    autoFocus={autoFocus}
                    inputMode={inputMode ?? (allowDecimal ? "decimal" : "numeric")}
                    inputProps={step ? { step } : undefined}
                    onKeyDown={handleKeyDown}
                    error={Boolean(error)}
                    helperText={error ?? helperText}
                    InputProps={{
                        startAdornment: prefix ? (
                            <InputAdornment position="start">{prefix}</InputAdornment>
                        ) : undefined,
                        endAdornment: suffix ? (
                            <InputAdornment position="end">{suffix}</InputAdornment>
                        ) : undefined,
                    }}
                />
            </IOSListGroup>
            {action}
        </Box>
    );
}
