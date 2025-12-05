"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { IOSListGroup } from "./IOSListGroup";
import { IOSTextField } from "./IOSTextField";

type Props = {
    label: string;
    value?: string;
    placeholder?: string;
    description?: ReactNode;
    helperText?: string;
    maxLength?: number;
    multiline?: boolean;
    rows?: number;
    autoFocus?: boolean;
    allowEmpty?: boolean;
    trim?: boolean;
    autoComplete?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    action?: ReactNode;
    onCommit?: (value: string) => void;
    onChange?: (value: string) => void;
    onCancel?: () => void;
    onBack?: () => void;
};

export function IOSTextInputPage({
    label,
    value = "",
    placeholder,
    description,
    helperText,
    maxLength,
    multiline = false,
    rows = 1,
    autoFocus = true,
    allowEmpty = true,
    trim = false,
    autoComplete,
    inputMode,
    action,
    onCommit,
    onChange,
    onCancel,
    onBack,
}: Props) {
    const [localValue, setLocalValue] = useState(value);
    const [error, setError] = useState<string | null>(null);
    const initialValueRef = useRef(value);
    const dirtyRef = useRef(false);
    const onCommitRef = useRef(onCommit);

    useEffect(() => {
        onCommitRef.current = onCommit;
    }, [onCommit]);

    useEffect(() => {
        setLocalValue(value);
        initialValueRef.current = value;
        dirtyRef.current = false;
        setError(null);
    }, [value]);

    const commitValue = useCallback((shouldClose = true) => {
        const next = trim ? localValue.trim() : localValue;
        if (!allowEmpty && next === "") {
            setError("Value is required");
            return false;
        }

        if (dirtyRef.current || next !== initialValueRef.current) {
            onCommitRef.current?.(next);
            initialValueRef.current = next;
            dirtyRef.current = false;
        }

        setError(null);

        if (shouldClose) {
            onBack?.();
        }

        return true;
    }, [allowEmpty, localValue, onBack, trim]);

    const handleCancel = useCallback(() => {
        setLocalValue(initialValueRef.current);
        dirtyRef.current = false;
        setError(null);
        onCancel?.();
        onBack?.();
    }, [onBack, onCancel]);

    useEffect(() => {
        return () => {
            commitValue(false);
        };
    }, [commitValue]);

    const handleChange = (text: string) => {
        setLocalValue(text);
        dirtyRef.current = true;
        setError(null);
        onChange?.(text);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (!multiline && event.key === "Enter") {
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
                    fullWidth
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onClear={() => handleChange("")}
                    placeholder={placeholder ?? label}
                    autoFocus={autoFocus}
                    multiline={multiline}
                    rows={rows}
                    autoComplete={autoComplete}
                    inputMode={inputMode}
                    inputProps={maxLength ? { maxLength } : undefined}
                    onKeyDown={handleKeyDown}
                    error={Boolean(error)}
                    helperText={error ?? helperText}
                />
            </IOSListGroup>
            {action}
        </Box>
    );
}
