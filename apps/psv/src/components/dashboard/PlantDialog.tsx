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
import { Plant } from "@/data/types";
import { OwnerSelector } from "../shared";
import { usePsvStore } from "@/store/usePsvStore";

interface PlantDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (plant: Omit<Plant, 'id' | 'createdAt'>) => void;
    plant?: Plant | null;
    initialCustomerId?: string;
}

export function PlantDialog({
    open,
    onClose,
    onSave,
    plant,
    initialCustomerId,
}: PlantDialogProps) {
    const customers = usePsvStore((state) => state.customers);

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [customerId, setCustomerId] = useState<string>('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [ownerId, setOwnerId] = useState<string | null>(null);

    useEffect(() => {
        if (plant) {
            setName(plant.name);
            setCode(plant.code);
            setCustomerId(plant.customerId);
            setStatus(plant.status);
            setOwnerId(plant.ownerId);
        } else if (initialCustomerId) {
            setCustomerId(initialCustomerId);
            setName('');
            setCode('');
            setStatus('active');
            setOwnerId(null);
        } else {
            setName('');
            setCode('');
            setCustomerId('');
            setStatus('active');
            setOwnerId(null);
        }
    }, [plant, initialCustomerId, open]);

    const handleSubmit = () => {
        if (!name.trim() || !code.trim() || !customerId || !ownerId) return;

        onSave({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            customerId,
            location: '', // Optional field, empty for now
            status,
            ownerId,
        });
    };

    const isValid = name.trim() && code.trim() && customerId && ownerId;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {plant ? 'Edit Plant' : 'Add Plant'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <FormControl fullWidth size="small" required>
                        <InputLabel>Customer</InputLabel>
                        <Select
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            label="Customer"
                        >
                            {customers.filter(c => c.status === 'active' || c.id === customerId).map((customer) => (
                                <MenuItem key={customer.id} value={customer.id}>
                                    {customer.name} ({customer.code}) {customer.status === 'inactive' && '(Inactive)'}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Plant Name"
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
                        helperText="Short code for the plant (e.g., HOU-REF)"
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
                    {plant ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
