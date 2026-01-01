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
    useTheme,
    FormHelperText,
} from "@mui/material";
import { Project, UnitSystem } from "@/data/types";
import { usePsvStore } from "@/store/usePsvStore";
import { useShallow } from "zustand/react/shallow";
import { OwnerSelector } from "../shared";
import { useAuthStore } from "@/store/useAuthStore";
import { WORKFLOW_STATUS_SEQUENCE, getWorkflowStatusLabel } from "@/lib/statusColors";

const PROJECT_STATUS_OPTIONS: { value: Project['status']; label: string }[] = WORKFLOW_STATUS_SEQUENCE.map(
    (status) => ({
        value: status,
        label: getWorkflowStatusLabel(status),
    })
);

const UNIT_SYSTEM_OPTIONS: { value: UnitSystem; label: string; helper: string }[] = [
    { value: 'metric', label: 'Metric (SI)', helper: 'barg, °C, kg/h, m, mm' },
    { value: 'fieldSI', label: 'Field SI', helper: 'bar(g), °C, kg/h, m, mm' },
    { value: 'metric_kgcm2', label: 'Metric (kg/cm²)', helper: 'kg/cm²(g), °C, kg/h, m, mm' },
    { value: 'imperial', label: 'Imperial (US)', helper: 'psig, °F, lb/h, ft, in' },
];

interface ProjectDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (project: Omit<Project, 'id' | 'createdAt'>) => void;
    project?: Project | null;
    initialAreaId?: string;
}

export function ProjectDialog({
    open,
    onClose,
    onSave,
    project,
    initialAreaId,
}: ProjectDialogProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const { customers, plants, units, areas } = usePsvStore(useShallow((state) => ({
        customers: state.customers,
        plants: state.plants,
        units: state.units,
        areas: state.areas,
    })));
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const currentRole = useAuthStore((state) => state.currentUser?.role);
    const canCheck = ['lead', 'approver', 'admin'].includes(currentRole || '');
    const canIssue = canCheck || canApprove;

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [customerId, setCustomerId] = useState<string>('');
    const [plantId, setPlantId] = useState<string>('');
    const [unitId, setUnitId] = useState<string>('');
    const [areaId, setAreaId] = useState<string>('');
    const [phase, setPhase] = useState<'design' | 'construction' | 'commissioning' | 'operation'>('design');
    const [status, setStatus] = useState<'draft' | 'in_review' | 'checked' | 'approved' | 'issued'>('draft');
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
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
            setUnitSystem(project.unitSystem || 'metric');
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
        } else if (initialAreaId) {
            // Pre-fill hierarchy from initialAreaId
            setAreaId(initialAreaId);
            const area = areas.find(a => a.id === initialAreaId);
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
            // Reset other fields
            setName('');
            setCode('');
            setPhase('design');
            setStatus('draft');
            setUnitSystem('metric');
            setStartDate('');
            setEndDate('');
            setLeadId(null);
        } else {
            setName('');
            setCode('');
            setCustomerId('');
            setPlantId('');
            setUnitId('');
            setAreaId('');
            setPhase('design');
            setStatus('draft');
            setUnitSystem('metric');
            setStartDate('');
            setEndDate('');
            setLeadId(null);
        }
    }, [project, initialAreaId, open, areas, units, plants]);

    const handleSubmit = () => {
        if (!name.trim() || !code.trim() || !areaId || !leadId || !startDate) return;

        onSave({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            areaId,
            phase,
            status,
            unitSystem,
            startDate,
            endDate: endDate || undefined,
            leadId,
            isActive: project?.isActive ?? true,
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

    const statusEnabledForUser = (value: Project['status']) => {
        switch (value) {
            case 'checked':
                return canCheck;
            case 'approved':
                return canApprove;
            case 'issued':
                return canIssue;
            default:
                return canEdit;
        }
    };
    const statusIndex = WORKFLOW_STATUS_SEQUENCE.indexOf(status);
    const statusEnabledSequentially = (value: Project['status']) => {
        const targetIndex = WORKFLOW_STATUS_SEQUENCE.indexOf(value);
        if (targetIndex === -1 || statusIndex === -1) return true;
        if (targetIndex <= statusIndex) return true;
        return targetIndex === statusIndex + 1;
    };
    const statusLocked = !statusEnabledForUser(status);
    const restrictedLabels = PROJECT_STATUS_OPTIONS
        .filter(option => !statusEnabledForUser(option.value))
        .map(option => option.label);
    const sequentialLabels = PROJECT_STATUS_OPTIONS
        .filter(option => statusEnabledForUser(option.value) && !statusEnabledSequentially(option.value) && WORKFLOW_STATUS_SEQUENCE.indexOf(option.value) > statusIndex)
        .map(option => option.label);

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
                            {customers.filter(c => c.status === 'active' || c.id === customerId).map((customer) => (
                                <MenuItem key={customer.id} value={customer.id}>
                                    {customer.name} ({customer.code}) {customer.status === 'inactive' && '(Inactive)'}
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
                            {filteredPlants.filter(p => p.status === 'active' || p.id === plantId).map((plant) => (
                                <MenuItem key={plant.id} value={plant.id}>
                                    {plant.name} ({plant.code}) {plant.status === 'inactive' && '(Inactive)'}
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
                            {filteredUnits.filter(u => u.status === 'active' || u.id === unitId).map((unit) => (
                                <MenuItem key={unit.id} value={unit.id}>
                                    {unit.name} ({unit.code}) {unit.status === 'inactive' && '(Inactive)'}
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
                            {filteredAreas.filter(a => a.status === 'active' || a.id === areaId).map((area) => (
                                <MenuItem key={area.id} value={area.id}>
                                    {area.name} ({area.code}) {area.status === 'inactive' && '(Inactive)'}
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

                    {/* Unit System (display) */}
                    <FormControl fullWidth size="small">
                        <InputLabel>Unit System</InputLabel>
                        <Select
                            value={unitSystem}
                            onChange={(e) => setUnitSystem(e.target.value as UnitSystem)}
                            label="Unit System"
                        >
                            {UNIT_SYSTEM_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <FormHelperText sx={{ color: 'text.secondary' }}>
                            Display preference for PSV details & reports: {UNIT_SYSTEM_OPTIONS.find(o => o.value === unitSystem)?.helper}
                        </FormHelperText>
                    </FormControl>

                    {/* Status Selector */}
                    <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as typeof status)}
                            label="Status"
                            disabled={statusLocked}
                        >
                            {PROJECT_STATUS_OPTIONS.map(option => (
                                <MenuItem
                                    key={option.value}
                                    value={option.value}
                                    disabled={
                                        !statusEnabledForUser(option.value) ||
                                        !statusEnabledSequentially(option.value)
                                    }
                                >
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                        {statusLocked ? (
                            <FormHelperText sx={{ color: 'text.secondary' }}>
                                You don&apos;t have permission to apply this status.
                            </FormHelperText>
                        ) : sequentialLabels.length > 0 ? (
                            <FormHelperText sx={{ color: 'text.secondary' }}>
                                Progress sequentially: Draft → In Review → Checked → Approved → Issued.
                            </FormHelperText>
                        ) : restrictedLabels.length > 0 ? (
                            <FormHelperText sx={{ color: 'text.secondary' }}>
                                Only elevated roles can mark projects as {restrictedLabels.join(', ')}.
                            </FormHelperText>
                        ) : null}
                    </FormControl>

                    <TextField
                        label="Start Date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        fullWidth
                        required
                        InputLabelProps={{ shrink: true }}
                        sx={{
                            '& input::-webkit-calendar-picker-indicator': {
                                filter: isDark ? 'invert(0.85)' : 'invert(0.15)',
                                opacity: 0.9,
                            },
                        }}
                    />

                    <TextField
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="Optional"
                        sx={{
                            '& input::-webkit-calendar-picker-indicator': {
                                filter: isDark ? 'invert(0.85)' : 'invert(0.15)',
                                opacity: 0.9,
                            },
                        }}
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
