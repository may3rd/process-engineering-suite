"use client";

import { useState, useEffect } from "react";
import { Equipment, EquipmentType, EquipmentDetails } from "@/data/types";
import { usePsvStore } from "@/store/usePsvStore";
import { useShallow } from "zustand/react/shallow";
import { OwnerSelector, UnitSelector } from "../shared";
import { useAuthStore } from "@/store/useAuthStore";
import {
    VesselDetailsForm,
    TankDetailsForm,
    PumpDetailsForm,
    HeatExchangerDetailsForm,
    CompressorDetailsForm,
    PipingDetailsForm,
    OtherDetailsForm,
    ColumnDetailsForm,
    ReactorDetailsForm
} from "../equipment-details";
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
    FormHelperText,
    Grid,
} from "@mui/material";

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
    const { customers, plants, units, areas } = usePsvStore(useShallow((state) => ({
        customers: state.customers,
        plants: state.plants,
        units: state.units,
        areas: state.areas,
    })));
    const [type, setType] = useState<EquipmentType>('vessel');
    const [tag, setTag] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [customerId, setCustomerId] = useState<string>('');
    const [plantId, setPlantId] = useState<string>('');
    const [unitId, setUnitId] = useState<string>('');
    const [areaId, setAreaId] = useState<string>('');
    const [designPressure, setDesignPressure] = useState<number | null>(null);
    const [designPressureUnit, setDesignPressureUnit] = useState('barg');
    const [mawp, setMawp] = useState<number | null>(null);
    const [mawpUnit, setMawpUnit] = useState('barg');
    const [designTemperature, setDesignTemperature] = useState<number | null>(null);
    const [designTempUnit, setDesignTempUnit] = useState('C');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [ownerId, setOwnerId] = useState<string | null>(null);
    const [details, setDetails] = useState<EquipmentDetails | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    const currentUser = useAuthStore((state) => state.currentUser);
    const canEdit = useAuthStore((state) => state.canEdit());
    const canDeactivate = useAuthStore((state) => ['lead', 'approver', 'admin'].includes(state.currentUser?.role || ''));

    useEffect(() => {
        if (equipment) {
            setType(equipment.type);
            setTag(equipment.tag);
            setName(equipment.name);
            setDescription(equipment.description || '');
            setAreaId(equipment.areaId);
            setDesignPressure(equipment.designPressure ?? null);
            setDesignPressureUnit(equipment.designPressureUnit || 'barg');
            setMawp(equipment.mawp ?? null);
            setMawpUnit(equipment.mawpUnit || 'barg');
            setDesignTemperature(equipment.designTemperature ?? null);
            setDesignTempUnit(equipment.designTempUnit || 'C');
            setStatus(equipment.status);
            setOwnerId(equipment.ownerId);
            setDetails(equipment.details || null);

            // Find and set hierarchy
            const area = areas.find(a => a.id === equipment.areaId);
            if (area) {
                setUnitId(area.unitId || '');
                const unit = units.find(u => u.id === area.unitId);
                if (unit) {
                    setPlantId(unit.plantId || '');
                    const plant = plants.find(p => p.id === unit.plantId);
                    if (plant) {
                        setCustomerId(plant.customerId || '');
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
            setDesignPressure(null);
            setDesignPressureUnit('barg');
            setMawp(null);
            setMawpUnit('barg');
            setDesignTemperature(null);
            setDesignTempUnit('C');
            setStatus('active');
            setOwnerId(currentUser?.id || null);
            setDetails(null);
        }
        setErrors({});
    }, [equipment, open, currentUser]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!tag.trim()) newErrors.tag = 'Tag is required';
        if (!name.trim()) newErrors.name = 'Name is required';
        if (!areaId) newErrors.areaId = 'Area is required';
        if (!ownerId) newErrors.ownerId = 'Owner is required';

        if (designPressure !== null && designPressure <= 0) {
            newErrors.designPressure = 'Design Pressure must be > 0';
        }

        if (mawp !== null && designPressure !== null && designPressureUnit === mawpUnit) {
            if (mawp < designPressure) {
                newErrors.mawp = 'MAWP must be ≥ Design Pressure';
            }
        }

        if (designTemperature !== null && designTemperature < -273.15) {
            newErrors.designTemperature = 'Temperature cannot be below absolute zero';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        if (!ownerId) return; // Should be caught by validate, but needed for TS narrowing

        setIsSaving(true);
        try {
            await onSave({
                type,
                tag: tag.trim().toUpperCase(),
                name: name.trim(),
                description: description.trim() || undefined,
                areaId,
                designPressure,
                designPressureUnit,
                mawp,
                mawpUnit,
                designTemperature,
                designTempUnit,
                status,
                ownerId,
                details: details || undefined,
            });
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredPlants = customerId ? plants.filter(p => (p.status === 'active' || p.id === plantId) && p.customerId === customerId) : [];
    const filteredUnits = plantId ? units.filter(u => (u.status === 'active' || u.id === unitId) && u.plantId === plantId) : [];
    const filteredAreas = unitId ? areas.filter(a => (a.status === 'active' || a.id === areaId) && a.unitId === unitId) : [];
    const statusEnabledForUser = (value: 'active' | 'inactive') =>
        value === 'inactive' ? canDeactivate : canEdit;
    const statusLocked = !statusEnabledForUser(status);

    const handleOwnerChange = (newOwnerId: string) => {
        setOwnerId(newOwnerId);
    };

    const renderDetailsForm = () => {
        switch (type) {
            case 'vessel':
                return <VesselDetailsForm details={details as any} onChange={setDetails} />;
            case 'tank':
                return <TankDetailsForm details={details as any} onChange={setDetails} />;
            case 'heat_exchanger':
                return <HeatExchangerDetailsForm details={details as any} onChange={setDetails} />;
            case 'column':
                return <ColumnDetailsForm details={details as any} onChange={setDetails} />;
            case 'reactor':
                return <ReactorDetailsForm details={details as any} onChange={setDetails} />;
            case 'pump':
                return <PumpDetailsForm details={details as any} onChange={setDetails} />;
            case 'compressor':
                return <CompressorDetailsForm details={details as any} onChange={setDetails} />;
            case 'piping':
                return <PipingDetailsForm details={details as any} onChange={setDetails} />;
            case 'other':
                return <OtherDetailsForm details={details as any} onChange={setDetails} />;
            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onClose={isSaving ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {equipment ? 'Edit Equipment' : 'Add Equipment'}
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    {/* General Information Section */}
                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                            <strong style={{ color: '#0284c7' }}>General Information</strong>
                        </Box>
                    </Grid>

                    {/* Hierarchy Selectors */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small" required error={!!errors.customerId}>
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
                                        {customer.name} {customer.status === 'inactive' && '(Inactive)'}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small" required disabled={!customerId} sx={{ mt: 2 }} error={!!errors.plantId}>
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
                                        {plant.name} {plant.status === 'inactive' && '(Inactive)'}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small" required disabled={!plantId} sx={{ mt: 2 }} error={!!errors.unitId}>
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
                                        {unit.name} {unit.status === 'inactive' && '(Inactive)'}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small" required disabled={!unitId} sx={{ mt: 2 }} error={!!errors.areaId}>
                            <InputLabel>Area</InputLabel>
                            <Select
                                value={areaId}
                                onChange={(e) => setAreaId(e.target.value)}
                                label="Area"
                            >
                                {filteredAreas.map((area) => (
                                    <MenuItem key={area.id} value={area.id}>
                                        {area.name} {area.status === 'inactive' && '(Inactive)'}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.areaId && <FormHelperText>{errors.areaId}</FormHelperText>}
                        </FormControl>
                    </Grid>

                    {/* Basic Info */}
                    <Grid size={{ xs: 12, sm: 6 }}>
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
                                size="small"
                                required
                                helperText={errors.tag || "e.g., V-101"}
                                error={!!errors.tag}
                                inputProps={{ style: { textTransform: 'uppercase' } }}
                            />
                        </Box>

                        <TextField
                            label="Equipment Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            fullWidth
                            size="small"
                            required
                            sx={{ mt: 2 }}
                            error={!!errors.name}
                            helperText={errors.name}
                        />

                        <TextField
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            fullWidth
                            multiline
                            rows={3}
                            sx={{ mt: 2 }}
                        />
                    </Grid>

                    {/* Design Parameters */}
                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                            <UnitSelector
                                label="Design Pressure"
                                value={designPressure}
                                unit={designPressureUnit}
                                availableUnits={['barg', 'psig', 'kPag', 'MPag', 'bara', 'psia']}
                                onChange={(val, unit) => {
                                    setDesignPressure(val);
                                    setDesignPressureUnit(unit);
                                }}
                                error={!!errors.designPressure}
                                helperText={errors.designPressure}
                            />

                            <UnitSelector
                                label="MAWP"
                                value={mawp}
                                unit={mawpUnit}
                                availableUnits={['barg', 'psig', 'kPag', 'MPag', 'bara', 'psia']}
                                onChange={(val, unit) => {
                                    setMawp(val);
                                    setMawpUnit(unit);
                                }}
                                error={!!errors.mawp}
                                helperText={errors.mawp}
                            />

                            <UnitSelector
                                label="Design Temp"
                                value={designTemperature}
                                unit={designTempUnit}
                                availableUnits={['C', 'F', 'K']}
                                onChange={(val, unit) => {
                                    setDesignTemperature(val);
                                    setDesignTempUnit(unit);
                                }}
                                error={!!errors.designTemperature}
                                helperText={errors.designTemperature}
                            />
                        </Box>
                    </Grid>

                    {/* Equipment Details Section */}
                    {type && (
                        <Grid size={{ xs: 12 }}>
                            <Box sx={{ mt: 2, mb: 1, borderBottom: 1, borderColor: 'divider' }}>
                                <strong style={{ color: '#0284c7' }}>Equipment Details</strong>
                            </Box>
                            {renderDetailsForm()}
                        </Grid>
                    )}

                    {/* Status and Owner */}
                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as typeof status)}
                                    label="Status"
                                    disabled={statusLocked}
                                >
                                    <MenuItem value="active" disabled={!statusEnabledForUser('active')}>
                                        Active
                                    </MenuItem>
                                    <MenuItem value="inactive" disabled={!statusEnabledForUser('inactive')}>
                                        Inactive
                                    </MenuItem>
                                </Select>
                                {statusLocked ? (
                                    <FormHelperText sx={{ color: 'text.secondary' }}>
                                        You don&apos;t have permission to set this status.
                                    </FormHelperText>
                                ) : !statusEnabledForUser('inactive') ? (
                                    <FormHelperText sx={{ color: 'text.secondary' }}>
                                        Only leads or approvers can deactivate equipment.
                                    </FormHelperText>
                                ) : null}
                            </FormControl>

                            <OwnerSelector
                                value={ownerId}
                                onChange={setOwnerId}
                                required
                                label="Owner"
                                error={!!errors.ownerId}
                                helperText={errors.ownerId}
                            />
                        </Box>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : (equipment ? 'Update' : 'Create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
