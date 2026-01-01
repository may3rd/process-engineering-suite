"use client";

import { useState, useMemo } from "react";
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Chip,
} from "@mui/material";
import { ChevronRight } from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";

interface AreaSelectorProps {
    value: string | null;
    onChange: (areaId: string | null) => void;
    label?: string;
    required?: boolean;
    disabled?: boolean;
}

export function AreaSelector({
    value,
    onChange,
    label = "Area",
    required = false,
    disabled = false,
}: AreaSelectorProps) {
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

    const { customers, plants, units, areas } = usePsvStore();

    // Only show active items in dropdowns, but allow currently selected item if it's inactive
    const activeCustomers = useMemo(() => customers.filter(c => c.status === 'active' || c.id === selectedCustomer), [customers, selectedCustomer]);
    const activePlants = useMemo(() => plants.filter(p => p.status === 'active' || p.id === selectedPlant), [plants, selectedPlant]);
    const activeUnits = useMemo(() => units.filter(u => u.status === 'active' || u.id === selectedUnit), [units, selectedUnit]);
    const activeAreas = useMemo(() => areas.filter(a => a.status === 'active' || a.id === value), [areas, value]);

    // Initialize selections based on current value
    useMemo(() => {
        if (value) {
            const area = areas.find(a => a.id === value);
            if (area) {
                const unit = units.find(u => u.id === area.unitId);
                if (unit) {
                    setSelectedUnit(unit.id);
                    const plant = plants.find(p => p.id === unit.plantId);
                    if (plant) {
                        setSelectedPlant(plant.id);
                        const customer = customers.find(c => c.id === plant.customerId);
                        if (customer) {
                            setSelectedCustomer(customer.id);
                        }
                    }
                }
            }
        }
    }, [value]);

    const filteredPlants = selectedCustomer
        ? activePlants.filter(p => p.customerId === selectedCustomer)
        : [];

    const filteredUnits = selectedPlant
        ? activeUnits.filter(u => u.plantId === selectedPlant)
        : [];

    const filteredAreas = selectedUnit
        ? activeAreas.filter(a => a.unitId === selectedUnit)
        : [];

    // Get full path for display
    const getFullPath = () => {
        if (!value) return null;
        const area = areas.find(a => a.id === value);
        if (!area) return null;

        const unit = units.find(u => u.id === area.unitId);
        const plant = unit ? plants.find(p => p.id === unit.plantId) : null;
        const customer = plant ? customers.find(c => c.id === plant.customerId) : null;

        return { customer, plant, unit, area };
    };

    const path = getFullPath();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Hierarchy Path Display */}
            {path && (
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip label={path.customer?.name} size="small" color="primary" variant="outlined" />
                    <ChevronRight sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Chip label={path.plant?.name} size="small" color="primary" variant="outlined" />
                    <ChevronRight sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Chip label={path.unit?.name} size="small" color="primary" variant="outlined" />
                    <ChevronRight sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Chip label={path.area?.name} size="small" color="primary" />
                </Box>
            )}

            {/* Customer Select */}
            <FormControl fullWidth size="small">
                <InputLabel>Customer</InputLabel>
                <Select
                    value={selectedCustomer || ''}
                    onChange={(e) => {
                        setSelectedCustomer(e.target.value);
                        setSelectedPlant(null);
                        setSelectedUnit(null);
                        onChange(null);
                    }}
                    label="Customer"
                    disabled={disabled}
                >
                    {activeCustomers.map((customer) => (
                        <MenuItem key={customer.id} value={customer.id}>
                            {customer.name} ({customer.code}) {customer.status === 'inactive' && '(Inactive)'}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Plant Select */}
            <FormControl fullWidth size="small" disabled={!selectedCustomer || disabled}>
                <InputLabel>Plant</InputLabel>
                <Select
                    value={selectedPlant || ''}
                    onChange={(e) => {
                        setSelectedPlant(e.target.value);
                        setSelectedUnit(null);
                        onChange(null);
                    }}
                    label="Plant"
                >
                    {filteredPlants.map((plant) => (
                        <MenuItem key={plant.id} value={plant.id}>
                            {plant.name} ({plant.code}) {plant.status === 'inactive' && '(Inactive)'}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Unit Select */}
            <FormControl fullWidth size="small" disabled={!selectedPlant || disabled}>
                <InputLabel>Unit</InputLabel>
                <Select
                    value={selectedUnit || ''}
                    onChange={(e) => {
                        setSelectedUnit(e.target.value);
                        onChange(null);
                    }}
                    label="Unit"
                >
                    {filteredUnits.map((unit) => (
                        <MenuItem key={unit.id} value={unit.id}>
                            {unit.name} ({unit.code}) {unit.status === 'inactive' && '(Inactive)'}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Area Select */}
            <FormControl fullWidth size="small" disabled={!selectedUnit || disabled} required={required}>
                <InputLabel>{label}</InputLabel>
                <Select
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value || null)}
                    label={label}
                >
                    {filteredAreas.map((area) => (
                        <MenuItem key={area.id} value={area.id}>
                            {area.name} ({area.code}) {area.status === 'inactive' && '(Inactive)'}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}
