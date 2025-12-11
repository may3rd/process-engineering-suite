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
    Chip,
    Autocomplete,
} from "@mui/material";
import { ProtectiveSystem, ProtectiveSystemType, DesignCode, FluidPhase } from "@/data/types";
import { areas, units, plants, customers, projects } from "@/data/mockData";
import { OwnerSelector } from "../shared";

interface PSVDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (psv: Omit<ProtectiveSystem, 'id' | 'createdAt' | 'updatedAt'>) => void;
    psv?: ProtectiveSystem | null;
}

export function PSVDialog({
    open,
    onClose,
    onSave,
    psv,
}: PSVDialogProps) {
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [customerId, setCustomerId] = useState<string>('');
    const [plantId, setPlantId] = useState<string>('');
    const [unitId, setUnitId] = useState<string>('');
    const [areaId, setAreaId] = useState<string>('');
    const [type, setType] = useState<ProtectiveSystemType>('psv');
    const [designCode, setDesignCode] = useState<DesignCode>('API-520');
    const [serviceFluid, setServiceFluid] = useState('');
    const [fluidPhase, setFluidPhase] = useState<FluidPhase>('gas');
    const [setPressure, setSetPressure] = useState<number>(0);
    const [mawp, setMawp] = useState<number>(0);
    const [status, setStatus] = useState<'draft' | 'in_review' | 'checked' | 'approved' | 'issued'>('draft');
    const [ownerId, setOwnerId] = useState<string | null>(null);
    const [projectIds, setProjectIds] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
        if (psv) {
            setName(psv.name);
            setTag(psv.tag);
            setAreaId(psv.areaId);
            setType(psv.type);
            setDesignCode(psv.designCode);
            setServiceFluid(psv.serviceFluid);
            setFluidPhase(psv.fluidPhase);
            setSetPressure(psv.setPressure);
            setMawp(psv.mawp);
            setStatus(psv.status);
            setOwnerId(psv.ownerId);
            setProjectIds(psv.projectIds || []);
            setTags(psv.tags);

            // Find and set area's hierarchy
            const area = areas.find(a => a.id === psv.areaId);
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
            setTag('');
            setCustomerId('');
            setPlantId('');
            setUnitId('');
            setAreaId('');
            setType('psv');
            setDesignCode('API-520');
            setServiceFluid('');
            setFluidPhase('gas');
            setSetPressure(0);
            setMawp(0);
            setStatus('draft');
            setOwnerId(null);
            setProjectIds([]);
            setTags([]);
        }
    }, [psv, open]);

    const handleSubmit = () => {
        if (!name.trim() || !tag.trim() || !areaId || !ownerId || !serviceFluid.trim()) return;

        onSave({
            name: name.trim(),
            tag: tag.trim().toUpperCase(),
            areaId,
            type,
            designCode,
            serviceFluid: serviceFluid.trim(),
            fluidPhase,
            setPressure,
            mawp,
            status,
            ownerId,
            projectIds: projectIds.length > 0 ? projectIds : undefined,
            tags,
        });
    };

    const filteredPlants = customerId ? plants.filter(p => p.customerId === customerId) : [];
    const filteredUnits = plantId ? units.filter(u => u.plantId === plantId) : [];
    const filteredAreas = unitId ? areas.filter(a => a.unitId === unitId) : [];
    const availableProjects = areaId ? projects.filter(p => p.areaId === areaId) : [];

    const isValid = name.trim() && tag.trim() && areaId && ownerId && serviceFluid.trim() && setPressure > 0 && mawp > 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {psv ? 'Edit PSV' : 'Add PSV'}
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
                        <TextField
                            label="PSV Tag"
                            value={tag}
                            onChange={(e) => setTag(e.target.value.toUpperCase())}
                            fullWidth
                            required
                            helperText="e.g., PSV-101"
                            inputProps={{ style: { textTransform: 'uppercase' } }}
                        />

                        <TextField
                            label="PSV Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            fullWidth
                            required
                        />
                    </Box>

                    {/* Type and Design Code */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={type}
                                onChange={(e) => setType(e.target.value as ProtectiveSystemType)}
                                label="Type"
                            >
                                <MenuItem value="psv">PSV</MenuItem>
                                <MenuItem value="rupture_disc">Rupture Disc</MenuItem>
                                <MenuItem value="prv">PRV</MenuItem>
                                <MenuItem value="breather_valve">Breather Valve</MenuItem>
                                <MenuItem value="flame_arrestor">Flame Arrestor</MenuItem>
                                <MenuItem value="tank_vent">Tank Vent</MenuItem>
                                <MenuItem value="control_valve">Control Valve</MenuItem>
                                <MenuItem value="vent_system">Vent System</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel>Design Code</InputLabel>
                            <Select
                                value={designCode}
                                onChange={(e) => setDesignCode(e.target.value as DesignCode)}
                                label="Design Code"
                            >
                                <MenuItem value="API-520">API-520</MenuItem>
                                <MenuItem value="API-521">API-521</MenuItem>
                                <MenuItem value="API-2000">API-2000</MenuItem>
                                <MenuItem value="ASME-VIII">ASME-VIII</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Fluid Properties */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                        <TextField
                            label="Service Fluid"
                            value={serviceFluid}
                            onChange={(e) => setServiceFluid(e.target.value)}
                            fullWidth
                            required
                        />

                        <FormControl fullWidth size="small">
                            <InputLabel>Phase</InputLabel>
                            <Select
                                value={fluidPhase}
                                onChange={(e) => setFluidPhase(e.target.value as FluidPhase)}
                                label="Phase"
                            >
                                <MenuItem value="gas">Gas</MenuItem>
                                <MenuItem value="liquid">Liquid</MenuItem>
                                <MenuItem value="steam">Steam</MenuItem>
                                <MenuItem value="two_phase">Two Phase</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Pressure Values */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            label="Set Pressure (barg)"
                            type="number"
                            value={setPressure}
                            onChange={(e) => setSetPressure(parseFloat(e.target.value) || 0)}
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
                                <MenuItem value="draft">Draft</MenuItem>
                                <MenuItem value="in_review">In Review</MenuItem>
                                <MenuItem value="checked">Checked</MenuItem>
                                <MenuItem value="approved">Approved</MenuItem>
                                <MenuItem value="issued">Issued</MenuItem>
                            </Select>
                        </FormControl>

                        <OwnerSelector
                            value={ownerId}
                            onChange={setOwnerId}
                            required
                            label="Owner"
                        />
                    </Box>

                    {/* Project Tags */}
                    {availableProjects.length > 0 && (
                        <Autocomplete
                            multiple
                            options={availableProjects}
                            getOptionLabel={(option) => `${option.code} - ${option.name}`}
                            value={availableProjects.filter(p => projectIds.includes(p.id))}
                            onChange={(_e, newValue) => setProjectIds(newValue.map(p => p.id))}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Project Tags (Optional)"
                                    helperText="Link this PSV to specific projects"
                                />
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        label={option.code}
                                        {...getTagProps({ index })}
                                        key={option.id}
                                        size="small"
                                    />
                                ))
                            }
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={!isValid}
                >
                    {psv ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
