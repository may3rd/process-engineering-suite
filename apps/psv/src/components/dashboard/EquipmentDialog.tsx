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
import { Equipment, EquipmentType } from "@/data/types";
import { areas, units, plants, customers } from "@/data/mockData";
import { OwnerSelector } from "../shared";

interface EquipmentDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>) => void;
    equipment?: Equipment | null;
}

export function EquipmentDialog({
    open,
    onClose,
    onSave,
    equipment,
}: EquipmentDialogProps) {
    const [type, setType] = useState<EquipmentType>('vessel');
    const [tag, setTag] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [customerId, setCustomerId] = useState<string>('');
    const [plantId, setPlantId] = useState<string>('');
    const [unitId, setUnitId] = useState<string>('');
    const [areaId, setAreaId] = useState<string>('');
    const [designPressure, setDesignPressure] = useState<number>(0);
    const [mawp, setMawp] = useState<number>(0);
    const [designTemperature, setDesignTemperature] = useState<number>(0);
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [ownerId, setOwnerId] = useState<string | null>(null);

    useEffect(() => {
        if (equipment) {
            setType(equipment.type);
            setTag(equipment.tag);
            setName(equipment.name);
            setDescription(equipment.description || '');
            setAreaId(equipment.areaId);
            setDesignPressure(equipment.designPressure);
            setMawp(equipment.mawp);
            setDesignTemperature(equipment.designTemperature);
            setStatus(equipment.status);
            setOwnerId(equipment.ownerId);

            // Find and set hierarchy
            const area = areas.find(a => a.id === equipment.areaId);
            if (area) {
                setUnitId(area.unitId);
                const unit = units.find(u => u.id === area.unitId);
                if (unit) {
                    setPlantId(unit.plantId);
                    const plant = plants.find(p => p.id === unit.plantId);
                    if (plant) {
                        setCustomerId(plant.customerId);
                    }
                }
            }
        } else {
            setType('vessel');
            setTag('');
            setName('');
            setDescription('');
            setCustomerId('');
            setPlantId('');
            setUnitId('');
            setAreaId('');
            setDesignPressure(0);
            setMawp(0);
            setDesignTemperature(0);
            setStatus('active');
            setOwnerId(null);
        }
    }, [equipment, open]);

    const handleSubmit = () => {
        if (!tag.trim() || !name.trim() || !areaId || !ownerId) return;

        onSave({
            type,
            tag: tag.trim().toUpperCase(),
            name: name.trim(),
            description: description.trim() || undefined,
            areaId,
            designPressure,
            mawp,
            designTemperature,
            status,
            ownerId,
        });
    };

    const filteredPlants = customerId ? plants.filter(p => p.customerId === customerId) : [];
    const filteredUnits = plantId ? units.filter(u => u.plantId === plantId) : [];
    const filteredAreas = unitId ? areas.filter(a => a.unitId === unitId) : [];

    const isValid = tag.trim() && name.trim() && areaId && ownerId && designPressure > 0 && mawp > 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {equipment ? 'Edit Equipment' : 'Add Equipment'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {/* Hierarchy Selectors */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <FormControl fullWidth size="small" required>
                            <InputLabel>Customer</InputLabel>
                            <Select
                                value={customerId}
                                onChange={(e) => {
                                    setCustomerId(e.target.value);
                                    setPlantId('');
                                    setUnitId('');
                                    setAreaId('');
                                }}
                                label="Customer"
                            >
                                {customers.map((customer) => (
                                    <MenuItem key={customer.id} value={customer.id}>
                                        {customer.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small" required disabled={!customerId}>
                            <InputLabel>Plant</InputLabel>
                            <Select
                                value={plantId}
                                onChange={(e) => {
                                    setPlantId(e.target.value);
                                    setUnitId('');
                                    setAreaId('');
                                }}
                                label="Plant"
                            >
                                {filteredPlants.map((plant) => (
                                    <MenuItem key={plant.id} value={plant.id}>
                                        {plant.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small" required disabled={!plantId}>
                            <InputLabel>Unit</InputLabel>
                            <Select
                                value={unitId}
                                onChange={(e) => {
                                    setUnitId(e.target.value);
                                    setAreaId('');
                                }}
                                label="Unit"
                            >
                                {filteredUnits.map((unit) => (
                                    <MenuItem key={unit.id} value={unit.id}>
                                        {unit.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small" required disabled={!unitId}>
                            <InputLabel>Area</InputLabel>
                            <Select
                                value={areaId}
                                onChange={(e) => setAreaId(e.target.value)}
                                label="Area"
                            >
                                {filteredAreas.map((area) => (
                                    <MenuItem key={area.id} value={area.id}>
                                        {area.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Basic Info */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Equipment Type</InputLabel>
                            <Select
                                value={type}
                                onChange={(e) => setType(e.target.value as EquipmentType)}
                                label="Equipment Type"
                            >
                                <MenuItem value="vessel">Vessel</MenuItem>
                                <MenuItem value="tank">Tank</MenuItem>
                                <MenuItem value="heat_exchanger">Heat Exchanger</MenuItem>
                                <MenuItem value="column">Column</MenuItem>
                                <MenuItem value="reactor">Reactor</MenuItem>
                                <MenuItem value="pump">Pump</MenuItem>
                                <MenuItem value="compressor">Compressor</MenuItem>
                                <MenuItem value="piping">Piping</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Equipment Tag"
                            value={tag}
                            onChange={(e) => setTag(e.target.value.toUpperCase())}
                            fullWidth
                            required
                            helperText="e.g., V-101"
                            inputProps={{ style: { textTransform: 'uppercase' } }}
                        />
                    </Box>

                    <TextField
                        label="Equipment Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
                    />

                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                    />

                    {/* Design Parameters */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                        <TextField
                            label="Design Pressure (barg)"
                            type="number"
                            value={designPressure}
                            onChange={(e) => setDesignPressure(parseFloat(e.target.value) || 0)}
                            fullWidth
                            required
                        />

                        <TextField
                            label="MAWP (barg)"
                            type="number"
                            value={mawp}
                            onChange={(e) => setMawp(parseFloat(e.target.value) || 0)}
                            fullWidth
                            required
                        />

                        <TextField
                            label="Design Temp (°C)"
                            type="number"
                            value={designTemperature}
                            onChange={(e) => setDesignTemperature(parseFloat(e.target.value) || 0)}
                            fullWidth
                            required
                        />
                    </Box>

                    {/* Status and Owner */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as typeof status)}
                                label="Status"
                            >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                            </Select>
                        </FormControl>

                        <OwnerSelector
                            value={ownerId}
                            onChange={setOwnerId}
                            required
                            label="Owner"
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={!isValid}
                >
                    {equipment ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
