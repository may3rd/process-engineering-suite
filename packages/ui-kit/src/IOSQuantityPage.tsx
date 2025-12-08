import { Box } from "@mui/material";
import { Check } from "@mui/icons-material";
import { IOSTextField } from "./IOSTextField";
import { IOSListGroup } from "./IOSListGroup";
import { IOSListItem } from "./IOSListItem";
import { convertUnit, UnitFamily } from "@eng-suite/physics";
import { useState, useEffect, useMemo, useRef, ReactNode, useCallback } from "react";

type Props = {
    label: string;
    value: number | string;
    unit?: string;
    units?: readonly string[];
    onValueChange?: (value: number | undefined) => void;
    onUnitChange?: (unit: string) => void;
    onChange?: (value: number | undefined, unit: string) => void;
    unitFamily?: UnitFamily;
    min?: number;
    placeholder?: string;
    autoFocus?: boolean;
    action?: ReactNode;
    onBack?: () => void;
};

export function IOSQuantityPage({
    label,
    value,
    unit = "",
    units = [],
    onValueChange,
    onUnitChange,
    onChange,
    unitFamily,
    min,
    placeholder,
    autoFocus,
    action,
    onBack,
}: Props) {
    const [inputValue, setInputValue] = useState<string>("");
    const [localUnit, setLocalUnit] = useState<string>(unit);
    const [error, setError] = useState<string | null>(null);
    const [isUnitSelectionActive, setIsUnitSelectionActive] = useState(false);
    const [highlightedUnitIndex, setHighlightedUnitIndex] = useState(() => Math.max(0, units.indexOf(unit)));
    const [isInputFocused, setIsInputFocused] = useState(false);

    // Refs to track latest values for cleanup/commit
    const valueRef = useRef<number | undefined>(typeof value === 'number' ? value : undefined);
    const unitRef = useRef<string>(unit);
    const isDirty = useRef(false);
    const cancelledRef = useRef(false);
    const initialValueRef = useRef<number | undefined>(valueRef.current);
    const initialUnitRef = useRef<string>(unit);

    // Refs for callbacks to ensure fresh access in cleanup
    const onValueChangeRef = useRef(onValueChange);
    const onUnitChangeRef = useRef(onUnitChange);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onValueChangeRef.current = onValueChange;
        onUnitChangeRef.current = onUnitChange;
        onChangeRef.current = onChange;
    }, [onValueChange, onUnitChange, onChange]);

    // Format value for display
    const formatValue = useMemo(() => (val: number | string | undefined) => {
        if (val === "" || val === null || val === undefined) return "";
        if (typeof val === "number") {
            if (!Number.isFinite(val)) return "";
            return `${val}`;
        }
        return val;
    }, []);

    // Sync input value with prop value
    useEffect(() => {
        setInputValue(formatValue(value));
        if (typeof value === 'number') {
            valueRef.current = value;
        }
        cancelledRef.current = false;
    }, [value, formatValue]);

    // Sync unit with prop unit
    useEffect(() => {
        setLocalUnit(unit);
        unitRef.current = unit;
    }, [unit]);

    // Keep highlighted index aligned with active unit
    useEffect(() => {
        const idx = units.indexOf(localUnit);
        setHighlightedUnitIndex(idx >= 0 ? idx : 0);
    }, [localUnit, units]);

    // Commit changes on unmount (only if not cancelled)
    useEffect(() => {
        return () => {
            if (isDirty.current && !cancelledRef.current) {
                if (onChangeRef.current) {
                    onChangeRef.current(valueRef.current, unitRef.current);
                } else {
                    // Fallback to separate callbacks if onChange is not provided
                    if (onValueChangeRef.current) {
                        onValueChangeRef.current(valueRef.current);
                    }
                    if (onUnitChangeRef.current && unitRef.current !== unit) {
                        onUnitChangeRef.current(unitRef.current);
                    }
                }
            }
        };
    }, [unit]);

    const handleInputChange = (text: string) => {
        // Allow empty, minus, dot
        if (text === "" || text === "-" || text === "." || text === "-.") {
            setInputValue(text);
            if (text === "") {
                valueRef.current = undefined;
                isDirty.current = true;
            }
            return;
        }

        // Regex for number validation
        if (!/^[-+]?\d*(?:\.\d*)?$/.test(text)) {
            return;
        }

        setInputValue(text);
        const parsed = Number(text);
        if (!Number.isNaN(parsed)) {
            valueRef.current = parsed;
            isDirty.current = true;

            // Validation (Visual only)
            if (min !== undefined && parsed < min) {
                setError(`Value cannot be less than ${min}`);
            } else {
                setError(null);
            }
        }
    };

    const commitChanges = useCallback(() => {
        if (!isDirty.current) return;
        if (onChangeRef.current) {
            onChangeRef.current(valueRef.current, unitRef.current);
        } else {
            onValueChangeRef.current?.(valueRef.current);
            if (unitRef.current !== unit) {
                onUnitChangeRef.current?.(unitRef.current);
            }
        }
        isDirty.current = false;
    }, [unit]);

    const revertChanges = useCallback(() => {
        cancelledRef.current = true;
        valueRef.current = initialValueRef.current;
        unitRef.current = initialUnitRef.current;
        setInputValue(formatValue(initialValueRef.current));
        setLocalUnit(initialUnitRef.current);
        setError(null);
        setIsUnitSelectionActive(false);
        const idx = units.indexOf(initialUnitRef.current ?? "");
        setHighlightedUnitIndex(idx >= 0 ? idx : 0);
        isDirty.current = false;
    }, [formatValue, units]);

    const handleUnitSelect = useCallback((newUnit: string) => {
        if (newUnit === localUnit) return;

        // Convert value if unitFamily provided
        const numericValue = valueRef.current;
        if (unitFamily && numericValue !== undefined && !Number.isNaN(numericValue)) {
            const converted = convertUnit(numericValue, localUnit, newUnit, unitFamily);
            valueRef.current = converted;
            setInputValue(formatValue(converted));
        }

        setLocalUnit(newUnit);
        unitRef.current = newUnit;
        isDirty.current = true;
        setHighlightedUnitIndex(() => {
            const idx = units.indexOf(newUnit);
            return idx >= 0 ? idx : 0;
        });
        setIsUnitSelectionActive(false);
    }, [localUnit, unitFamily, formatValue, units]);

    const beginUnitSelection = useCallback(() => {
        if (units.length === 0) return;
        setIsUnitSelectionActive(true);
        setHighlightedUnitIndex((current) => {
            if (current >= 0 && current < units.length) return current;
            const idx = units.indexOf(localUnit);
            return idx >= 0 ? idx : 0;
        });
    }, [units, localUnit]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === "Escape") {
            event.preventDefault();
            revertChanges();
            onBack?.();
            return;
        }

        if (event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            beginUnitSelection();
            return;
        }

        if ((event.key === "ArrowDown" || event.key === "ArrowUp") && isUnitSelectionActive) {
            event.preventDefault();
            setHighlightedUnitIndex((current) => {
                if (units.length === 0) return current;
                if (event.key === "ArrowDown") {
                    return (current + 1) % units.length;
                }
                return (current - 1 + units.length) % units.length;
            });
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            if (isUnitSelectionActive) {
                const highlightedUnit = units[highlightedUnitIndex];
                if (highlightedUnit) {
                    handleUnitSelect(highlightedUnit);
                }
                setIsUnitSelectionActive(false);
            } else {
                // Always commit and go back on Enter, regardless of focus
                commitChanges();
                onBack?.();
            }
        }
    }, [beginUnitSelection, commitChanges, handleUnitSelect, highlightedUnitIndex, isUnitSelectionActive, revertChanges, units, onBack]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    return (
        <Box sx={{ pt: 2 }}>
            <IOSListGroup>
                <IOSTextField
                    fullWidth
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onClear={() => {
                        setInputValue("");
                        valueRef.current = undefined;
                        isDirty.current = true;
                    }}
                    placeholder={placeholder || label}
                    autoFocus={autoFocus}
                    error={!!error}
                    helperText={error}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                />
            </IOSListGroup>

            {units.length > 0 && (
                <IOSListGroup>
                    {units.map((u) => (
                        <IOSListItem
                            key={u}
                            label={u}
                            value={u === localUnit ? <Check color="primary" sx={{ fontSize: 16 }} /> : ""}
                            onClick={() => handleUnitSelect(u)}
                            selected={isUnitSelectionActive && units[highlightedUnitIndex] === u}
                            last={u === units[units.length - 1]}
                        />
                    ))}
                </IOSListGroup>
            )}

            {action && (
                <Box>
                    {action}
                </Box>
            )}
        </Box>
    );
}
