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
import { Project } from "@/data/types";
import { areas, units, plants, customers, users } from "@/data/mockData";
import { OwnerSelector } from "../shared";

interface ProjectDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (project: Omit<Project, 'id' | 'createdAt'>) => void;
    project?: Project | null;
}

export function ProjectDialog({
    open,
    onClose,
    onSave,
    project,
}: ProjectDialogProps) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [customerId, setCustomerId] = useState<string>('');
    const [plantId, setPlantId] = useState<string>('');
    const [unitId, setUnitId] = useState<string>('');
    const [areaId, setAreaId] = useState<string>('');
    const [phase, setPhase] = useState<'design' | 'construction' | 'commissioning' | 'operation'>('design');
    const [status, setStatus] = useState<'draft' | 'in_review' | 'checked' | 'approved' | 'issued'>('draft');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [leadId, setLeadId] = useState<string | null>(null);

    useEffect(() => {
        if (project) {
            setName(project.name);
            setCode(project.code);
            setAreaId(project.areaId);
            setPhase(project.phase);
            setStatus(project.status);
            setStartDate(project.startDate);
            setEndDate(project.endDate || '');
            setLeadId(project.leadId);

            // Find and set unit, plant, customer based on area
            const area = areas.find(a => a.id === project.areaId);
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
            setName('');
            setCode('');
            setCustomerId('');
            setPlantId('');
            setUnitId('');
            setAreaId('');
            setPhase('design');
            setStatus('draft');
            setStartDate('');
            setEndDate('');
            setLeadId(null);
        }
    }, [project, open]);

    const handleSubmit = () => {
        if (!name.trim() || !code.trim() || !areaId || !leadId || !startDate) return;

        onSave({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            areaId,
            phase,
            status,
            startDate,
            endDate: endDate || undefined,
            leadId,
        });
    };

    const filteredPlants = customerId
        ? plants.filter(p => p.customerId === customerId)
        : [];

    const filteredUnits = plantId
        ? units.filter(u => u.plantId === plantId)
        : [];

    const filteredAreas = unitId
        ? areas.filter(a => a.unitId === unitId)
        : [];

    const isValid = name.trim() && code.trim() && areaId && leadId && startDate;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {project ? 'Edit Project' : 'Add Project'}
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
                                setPlantId('');
                                setUnitId('');
                                setAreaId('');
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
                                setUnitId('');
                                setAreaId('');
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
                            onChange={(e) => {
                                setUnitId(e.target.value);
                                setAreaId('');
                            }}
                            label="Unit"
                        >
                            {filteredUnits.map((unit) => (
                                <MenuItem key={unit.id} value={unit.id}>
                                    {unit.name} ({unit.code})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Area Selector */}
                    <FormControl fullWidth size="small" required disabled={!unitId}>
                        <InputLabel>Area</InputLabel>
                        <Select
                            value={areaId}
                            onChange={(e) => setAreaId(e.target.value)}
                            label="Area"
                        >
                            {filteredAreas.map((area) => (
                                <MenuItem key={area.id} value={area.id}>
                                    {area.name} ({area.code})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Project Name"
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
                        helperText="Short code for the project (e.g., PROJ-001)"
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                    />

                    {/* Phase Selector */}
                    <FormControl fullWidth size="small">
                        <InputLabel>Phase</InputLabel>
                        <Select
                            value={phase}
                            onChange={(e) => setPhase(e.target.value as typeof phase)}
                            label="Phase"
                        >
                            <MenuItem value="design">Design</MenuItem>
                            <MenuItem value="construction">Construction</MenuItem>
                            <MenuItem value="commissioning">Commissioning</MenuItem>
                            <MenuItem value="operation">Operation</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Status Selector */}
                    <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as typeof status)}
                            label="Status"
                        >
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="in_review">In Review</MenuItem>
                            <MenuItem value="checked">Checked</MenuItem>
                            <MenuItem value="approved">Approved</MenuItem>
                            <MenuItem value="issued">Issued</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="Start Date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="Optional"
                    />

                    <OwnerSelector
                        value={leadId}
                        onChange={setLeadId}
                        required
                        label="Project Lead"
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={!isValid}
                >
                    {project ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
