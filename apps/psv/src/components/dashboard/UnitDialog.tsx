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
import { Unit } from "@/data/types";
import { OwnerSelector } from "../shared";
import { plants, customers } from "@/data/mockData";

interface UnitDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (unit: Omit<Unit, 'id' | 'createdAt'>) => void;
    unit?: Unit | null;
}

export function UnitDialog({
    open,
    onClose,
    onSave,
    unit,
}: UnitDialogProps) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [customerId, setCustomerId] = useState<string>('');
    const [plantId, setPlantId] = useState<string>('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [ownerId, setOwnerId] = useState<string | null>(null);

    useEffect(() => {
        if (unit) {
            setName(unit.name);
            setCode(unit.code);
            setPlantId(unit.plantId);
            setStatus(unit.status);
            setOwnerId(unit.ownerId);

            // Find and set customer based on plant
            const plant = plants.find(p => p.id === unit.plantId);
            if (plant) {
                setCustomerId(plant.customerId);
            }
        } else {
            setName('');
            setCode('');
            setCustomerId('');
            setPlantId('');
            setStatus('active');
            setOwnerId(null);
        }
    }, [unit, open]);

    const handleSubmit = () => {
        if (!name.trim() || !code.trim() || !plantId || !ownerId) return;

        onSave({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            plantId,
            service: '', // Optional field, empty for now
            status,
            ownerId,
        });
    };

    const filteredPlants = customerId
        ? plants.filter(p => p.customerId === customerId)
        : [];

    const isValid = name.trim() && code.trim() && plantId && ownerId;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {unit ? 'Edit Unit' : 'Add Unit'}
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
                                setPlantId(''); // Reset plant when customer changes
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
                            onChange={(e) => setPlantId(e.target.value)}
                            label="Plant"
                        >
                            {filteredPlants.map((plant) => (
                                <MenuItem key={plant.id} value={plant.id}>
                                    {plant.name} ({plant.code})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Unit Name"
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
                        helperText="Short code for the unit (e.g., CDU-1)"
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                    />

                    <OwnerSelector
                        value={ownerId}
                        onChange={setOwnerId}
                        required
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
                    {unit ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
