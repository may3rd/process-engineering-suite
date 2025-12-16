/**
 * Equipment Editor Dialog
 * 
 * For creating new equipment or editing vessel dimensions
 */

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Equipment, VesselDetails } from '@/data/types';

interface EquipmentEditorDialogProps {
    open: boolean;
    onClose: () => void;
    equipment?: Equipment; // undefined for new equipment
    areaId: string;
    onSave: (equipment: Equipment) => void;
}

export function EquipmentEditorDialog({
    open,
    onClose,
    equipment,
    areaId,
    onSave,
}: EquipmentEditorDialogProps) {
    const [formData, setFormData] = useState({
        tag: '',
        name: '',
        type: 'vessel' as 'vessel' | 'tank' | 'column',
        innerDiameter: 3000, // mm
        tangentToTangentLength: 8000, // mm
        orientation: 'horizontal' as 'horizontal' | 'vertical',
        headType: 'torispherical' as 'torispherical' | 'elliptical' | 'hemispherical' | 'flat',
        insulated: false,
    });

    useEffect(() => {
        if (equipment) {
            const details = equipment.details as VesselDetails;
            setFormData({
                tag: equipment.tag,
                name: equipment.name,
                type: equipment.type as any,
                innerDiameter: details?.innerDiameter || 3000,
                tangentToTangentLength: details?.tangentToTangentLength || 8000,
                orientation: details?.orientation || 'horizontal',
                headType: (details?.headType === 'ellipsoidal' ? 'elliptical' : details?.headType) || 'torispherical',
                insulated: details?.insulated || false,
            });
        } else {
            // Reset for new equipment
            setFormData({
                tag: '',
                name: '',
                type: 'vessel',
                innerDiameter: 3000,
                tangentToTangentLength: 8000,
                orientation: 'horizontal',
                headType: 'torispherical',
                insulated: false,
            });
        }
    }, [equipment, open]);

    const handleSave = () => {
        const newEquipment: Equipment = {
            id: equipment?.id || `temp-${Date.now()}`,
            areaId,
            type: formData.type,
            tag: formData.tag,
            name: formData.name,
            description: formData.name,
            designPressure: equipment?.designPressure || 10,
            mawp: equipment?.mawp || 12,
            designTemperature: equipment?.designTemperature || 150,
            ownerId: equipment?.ownerId || '',
            status: 'active',
            details: {
                innerDiameter: formData.innerDiameter,
                tangentToTangentLength: formData.tangentToTangentLength,
                orientation: formData.orientation,
                headType: formData.headType,
                insulated: formData.insulated,
            },
            createdAt: equipment?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        onSave(newEquipment);
        onClose();
    };

    const canSave = formData.tag && formData.name && formData.innerDiameter > 0 && formData.tangentToTangentLength > 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {equipment ? 'Edit Equipment Dimensions' : 'Add New Equipment'}
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={3}>
                    {/* Basic Info */}
                    <Box>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Basic Information
                        </Typography>
                        <Stack spacing={2}>
                            <TextField
                                required
                                label="Equipment Tag"
                                value={formData.tag}
                                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                                size="small"
                                disabled={!!equipment} // Can't change tag on edit
                            />
                            <TextField
                                required
                                label="Equipment Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                size="small"
                            />
                            <FormControl fullWidth size="small" disabled={!!equipment}>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    label="Type"
                                >
                                    <MenuItem value="vessel">Vessel</MenuItem>
                                    <MenuItem value="tank">Tank</MenuItem>
                                    <MenuItem value="column">Column</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                    </Box>

                    {/* Dimensions */}
                    <Box>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Vessel Dimensions
                        </Typography>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Inner Diameter
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <TextField
                                        required
                                        type="number"
                                        value={formData.innerDiameter}
                                        onChange={(e) =>
                                            setFormData({ ...formData, innerDiameter: parseFloat(e.target.value) })
                                        }
                                        sx={{ flex: 1 }}
                                        size="small"
                                    />
                                    <Typography variant="body2" sx={{ minWidth: 40 }}>mm</Typography>
                                </Stack>
                            </Box>

                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Tangent-to-Tangent Length
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <TextField
                                        required
                                        type="number"
                                        value={formData.tangentToTangentLength}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                tangentToTangentLength: parseFloat(e.target.value),
                                            })
                                        }
                                        sx={{ flex: 1 }}
                                        size="small"
                                    />
                                    <Typography variant="body2" sx={{ minWidth: 40 }}>mm</Typography>
                                </Stack>
                            </Box>

                            <FormControl fullWidth size="small">
                                <InputLabel>Orientation</InputLabel>
                                <Select
                                    value={formData.orientation}
                                    onChange={(e) =>
                                        setFormData({ ...formData, orientation: e.target.value as any })
                                    }
                                    label="Orientation"
                                >
                                    <MenuItem value="horizontal">Horizontal</MenuItem>
                                    <MenuItem value="vertical">Vertical</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <InputLabel>Head Type</InputLabel>
                                <Select
                                    value={formData.headType}
                                    onChange={(e) => setFormData({ ...formData, headType: e.target.value as any })}
                                    label="Head Type"
                                >
                                    <MenuItem value="torispherical">Torispherical</MenuItem>
                                    <MenuItem value="elliptical">Elliptical (2:1)</MenuItem>
                                    <MenuItem value="hemispherical">Hemispherical</MenuItem>
                                    <MenuItem value="flat">Flat</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={formData.insulated}
                                        onChange={(e) => setFormData({ ...formData, insulated: e.target.checked })}
                                    />
                                }
                                label="Insulated"
                            />
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSave} disabled={!canSave}>
                    {equipment ? 'Save Changes' : 'Add Equipment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
