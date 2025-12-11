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
import { Customer } from "@/data/types";
import { OwnerSelector } from "../shared";

interface CustomerDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
    customer?: Customer | null;
}

export function CustomerDialog({
    open,
    onClose,
    onSave,
    customer,
}: CustomerDialogProps) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [ownerId, setOwnerId] = useState<string | null>(null);

    useEffect(() => {
        if (customer) {
            setName(customer.name);
            setCode(customer.code);
            setStatus(customer.status);
            setOwnerId(customer.ownerId);
        } else {
            setName('');
            setCode('');
            setStatus('active');
            setOwnerId(null);
        }
    }, [customer, open]);

    const handleSubmit = () => {
        if (!name.trim() || !code.trim() || !ownerId) return;

        onSave({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            status,
            ownerId,
        });
    };

    const isValid = name.trim() && code.trim() && ownerId;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {customer ? 'Edit Customer' : 'Add Customer'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Customer Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
                        autoFocus
                    />
                    <TextField
                        label="Code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        fullWidth
                        required
                        helperText="Short code for the customer (e.g., ACME)"
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
                    {customer ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
