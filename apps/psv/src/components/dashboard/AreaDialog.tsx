"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
} from "@mui/material";
import { Area } from "@/data/types";
import { units, plants, customers } from "@/data/mockData";

interface AreaDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (area: Omit<Area, 'id' | 'createdAt'>) => void;
    area?: Area | null;
}

export function AreaDialog({
    open,
    onClose,
    onSave,
    area,
}: AreaDialogProps) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [customerId, setCustomerId] = useState<string>('');
    const [plantId, setPlantId] = useState<string>('');
    const [unitId, setUnitId] = useState<string>('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');

    useEffect(() => {
        if (area) {
            setName(area.name);
            setCode(area.code);
            setUnitId(area.unitId);
            setStatus(area.status);

            // Find and set plant and customer based on unit
            const unit = units.find(u => u.id === area.unitId);
            if (unit) {
                setPlantId(unit.plantId);
                const plant = plants.find(p => p.id === unit.plantId);
                if (plant) {
                    setCustomerId(plant.customerId);
                }
            }
        } else {
            setName('');
            setCode('');
            setCustomerId('');
            setPlantId('');
            setUnitId('');
            setStatus('active');
        }
    }, [area, open]);

    const handleSubmit = () => {
        if (!name.trim() || !code.trim() || !unitId) return;

        onSave({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            unitId,
            status,
        });
    };

    const filteredPlants = customerId
        ? plants.filter(p => p.customerId === customerId)
        : [];

    const filteredUnits = plantId
        ? units.filter(u => u.plantId === plantId)
        : [];

    const isValid = name.trim() && code.trim() && unitId;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {area ? 'Edit Area' : 'Add Area'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {/* Customer Selector */}
                    <FormControl fullWidth size="small" required>
                        <InputLabel>Customer</InputLabel>
                        <Select
                            value={customerId}
                            onChange={(e) => {
                                setCustomerId(e.target.value);
                                setPlantId(''); // Reset downstream selections
                                setUnitId('');
                            }}
                            label="Customer"
                        >
                            {customers.map((customer) => (
                                <MenuItem key={customer.id} value={customer.id}>
                                    {customer.name} ({customer.code})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Plant Selector */}
                    <FormControl fullWidth size="small" required disabled={!customerId}>
                        <InputLabel>Plant</InputLabel>
                        <Select
                            value={plantId}
                            onChange={(e) => {
                                setPlantId(e.target.value);
                                setUnitId(''); // Reset unit when plant changes
                            }}
                            label="Plant"
                        >
                            {filteredPlants.map((plant) => (
                                <MenuItem key={plant.id} value={plant.id}>
                                    {plant.name} ({plant.code})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Unit Selector */}
                    <FormControl fullWidth size="small" required disabled={!plantId}>
                        <InputLabel>Unit</InputLabel>
                        <Select
                            value={unitId}
                            onChange={(e) => setUnitId(e.target.value)}
                            label="Unit"
                        >
                            {filteredUnits.map((unit) => (
                                <MenuItem key={unit.id} value={unit.id}>
                                    {unit.name} ({unit.code})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Area Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
                    />

                    <TextField
                        label="Code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        fullWidth
                        required
                        helperText="Short code for the area (e.g., DIST-1)"
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                    />

                    <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                            label="Status"
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={!isValid}
                >
                    {area ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
