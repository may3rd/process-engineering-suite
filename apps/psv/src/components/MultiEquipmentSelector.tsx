/**
 * Multi-Equipment Selector Component
 * 
 * Allows selecting multiple vessels/tanks for fire exposure calculation
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Checkbox,
    Chip,
    Typography,
    Alert,
    IconButton,
    Autocomplete,
} from '@mui/material';
import {
    LocalFireDepartment,
    Storage,
    Science,
    Delete as DeleteIcon,
    Add as AddIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import { Equipment, VesselDetails, TankDetails, ColumnDetails } from '@/data/types';
import { usePsvStore } from '@/store/usePsvStore';
import { EquipmentEditorDialog } from './EquipmentEditorDialog';

// Special option for adding new equipment
const ADD_NEW_EQUIPMENT_OPTION: Equipment = {
    id: '__ADD_NEW__',
    areaId: '',
    type: 'vessel',
    tag: '+ Add New Equipment',
    name: 'Create new vessel, tank, or column',
    description: '',
    designPressure: 0,
    mawp: 0,
    designTemperature: 0,
    ownerId: '',
    status: 'active',
    createdAt: '',
    updatedAt: '',
};

interface MultiEquipmentSelectorProps {
    areaId: string;
    selectedEquipment: Equipment[];
    onChange: (equipment: Equipment[]) => void;
}

export function MultiEquipmentSelector({
    areaId,
    selectedEquipment,
    onChange,
}: MultiEquipmentSelectorProps) {
    const { getEquipmentByArea, addEquipment, updateEquipment } = usePsvStore();
    const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
    const [searchValue, setSearchValue] = useState<Equipment | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<Equipment | undefined>();

    useEffect(() => {
        // Load equipment from area
        const equipment = getEquipmentByArea(areaId);
        // Filter to only vessel, tank, column types
        const fireEquipment = equipment.filter((eq) =>
            ['vessel', 'tank', 'column'].includes(eq.type)
        );
        setAvailableEquipment(fireEquipment);
    }, [areaId, getEquipmentByArea]);

    const handleAdd = (equipment: Equipment) => {
        // Check if this is the special "Add New" option
        if (equipment.id === '__ADD_NEW__') {
            setEditingEquipment(undefined);
            setEditorOpen(true);
            setSearchValue(null);
            return;
        }

        if (!selectedEquipment.find((eq) => eq.id === equipment.id)) {
            onChange([...selectedEquipment, equipment]);
        }
        setSearchValue(null);
    };

    const handleEquipmentSave = (equipment: Equipment) => {
        if (equipment.id.startsWith('temp-')) {
            // New equipment - pass data without id/timestamps
            const { id, createdAt, updatedAt, ...equipmentData } = equipment;
            addEquipment(equipmentData);
            // Reload equipment list
            const updated = getEquipmentByArea(areaId).filter((eq) =>
                ['vessel', 'tank', 'column'].includes(eq.type)
            );
            setAvailableEquipment(updated);
            // Don't auto-select, let user select manually
        } else {
            // Update existing
            const { id: equipId, createdAt, updatedAt, ...updates } = equipment;
            updateEquipment(equipId, updates);
            // Update local state
            setAvailableEquipment(
                availableEquipment.map((eq) => (eq.id === equipment.id ? equipment : eq))
            );
            onChange(
                selectedEquipment.map((eq) => (eq.id === equipment.id ? equipment : eq))
            );
        }
    };

    const handleEdit = (equipment: Equipment) => {
        setEditingEquipment(equipment);
        setEditorOpen(true);
    };

    const handleRemove = (equipmentId: string) => {
        onChange(selectedEquipment.filter((eq) => eq.id !== equipmentId));
    };

    const getEquipmentIcon = (type: string) => {
        switch (type) {
            case 'vessel':
                return <LocalFireDepartment />;
            case 'tank':
                return <Storage />;
            case 'column':
                return <Science />;
            default:
                return <LocalFireDepartment />;
        }
    };

    const getEquipmentSummary = (eq: Equipment): string => {
        const details = eq.details as VesselDetails | TankDetails | ColumnDetails;
        if (!details) return 'No details available';

        if ('innerDiameter' in details && 'tangentToTangentLength' in details) {
            return `Ø${(details.innerDiameter / 1000).toFixed(2)}m × ${(details.tangentToTangentLength / 1000).toFixed(2)}m`;
        }
        if ('innerDiameter' in details && 'height' in details) {
            return `Ø${(details.innerDiameter / 1000).toFixed(2)}m × ${(details.height / 1000).toFixed(2)}m`;
        }
        return 'See equipment details';
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Protected Equipment
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select one or more vessels, tanks, or columns exposed to fire.
                Wetted areas will be aggregated for total relief calculation.
            </Typography>

            {/* Equipment search/add */}
            <Autocomplete
                value={searchValue}
                onChange={(_, newValue) => {
                    if (newValue) {
                        handleAdd(newValue);
                    }
                }}
                options={[
                    ADD_NEW_EQUIPMENT_OPTION,
                    ...availableEquipment.filter(
                        (eq) => !selectedEquipment.find((sel) => sel.id === eq.id)
                    ),
                ]}
                getOptionLabel={(option) => {
                    if (option.id === '__ADD_NEW__') return option.tag;
                    return `${option.tag} - ${option.name}`;
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Search equipment by tag or name"
                        placeholder="Type to search..."
                        sx={{ mb: 3 }}
                    />
                )}
                renderOption={(props, option) => {
                    const { key, ...otherProps } = props;

                    // Special rendering for "Add New" option
                    if (option.id === '__ADD_NEW__') {
                        return (
                            <Box
                                component="li"
                                key={key}
                                {...otherProps}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    p: 1.5,
                                    borderRadius: 1,
                                    borderBottom: '2px solid',
                                    borderColor: 'divider',
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <AddIcon color="primary" />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body1" fontWeight={600} color="primary">
                                        {option.tag}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {option.name}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    }

                    return (
                        <Box
                            component="li"
                            key={key}
                            {...otherProps}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                p: 1.5,
                                borderRadius: 1,
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            {getEquipmentIcon(option.type)}
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body1" fontWeight={500}>
                                    {option.tag}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {option.name} · {getEquipmentSummary(option)}
                                </Typography>
                            </Box>
                            <Chip label={option.type} size="small" variant="outlined" />
                        </Box>
                    );
                }}
            />

            {/* Selected equipment list */}
            {selectedEquipment.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                    No equipment selected. Add equipment to begin fire exposure calculation.
                </Alert>
            ) : (
                <List sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    {selectedEquipment.map((eq, index) => {
                        const details = eq.details as VesselDetails | TankDetails | ColumnDetails;
                        const hasInsulation = details && 'insulated' in details && details.insulated;

                        return (
                            <ListItem
                                key={eq.id}
                                divider={index < selectedEquipment.length - 1}
                                secondaryAction={
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleEdit(eq)}
                                            size="small"
                                            sx={{ mr: 0.5 }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton edge="end" onClick={() => handleRemove(eq.id)} size="small">
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                }
                            >
                                <ListItemIcon>
                                    {getEquipmentIcon(eq.type)}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body1" fontWeight={500}>
                                                {eq.tag}
                                            </Typography>
                                            {hasInsulation && (
                                                <Chip label="Insulated" size="small" color="warning" />
                                            )}
                                        </Box>
                                    }
                                    secondary={
                                        <>
                                            <Typography variant="body2" component="span" color="text.secondary">
                                                {eq.name}
                                            </Typography>
                                            <Typography variant="caption" component="span" display="block" color="text.secondary">
                                                {getEquipmentSummary(eq)}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        );
                    })}
                </List>
            )}

            {selectedEquipment.length > 1 && (
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                    <Typography variant="body2">
                        <strong>{selectedEquipment.length} equipment selected.</strong> Total wetted area
                        will be calculated as the sum of all selected equipment.
                    </Typography>
                </Alert>
            )}

            {/* Equipment Editor Dialog */}
            <EquipmentEditorDialog
                open={editorOpen}
                onClose={() => setEditorOpen(false)}
                equipment={editingEquipment}
                areaId={areaId}
                onSave={handleEquipmentSave}
            />
        </Box>
    );
}
