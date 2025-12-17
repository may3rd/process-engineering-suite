"use client";

import { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Stack,
    MenuItem,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { ProtectiveSystem, ProtectiveSystemType, DesignCode } from "@/data/types";
import { usePsvStore } from "../store/usePsvStore";
import { glassCardStyles } from "./styles";
import { useAuthStore } from "@/store/useAuthStore";
import { getUserById } from "@/data/mockData";

interface BasicInfoCardProps {
    psv: ProtectiveSystem;
}

const TYPE_OPTIONS: { value: ProtectiveSystemType; label: string }[] = [
    { value: 'psv', label: 'Analysis (PSV)' },
    { value: 'control_valve', label: 'Control Valve' },
    { value: 'rupture_disc', label: 'Rupture Disc' },
    { value: 'breather_valve', label: 'Breather Valve' },
    { value: 'flame_arrestor', label: 'Flame Arrestor' },
    { value: 'tank_vent', label: 'Tank Vent' },
];

const DESIGN_CODE_OPTIONS: { value: DesignCode; label: string }[] = [
    { value: 'API-520', label: 'API-520' },
    { value: 'API-521', label: 'API-521' },
    { value: 'API-2000', label: 'API-2000' },
    { value: 'ASME-VIII', label: 'ASME-VIII' },
];

export function BasicInfoCard({ psv }: BasicInfoCardProps) {
    const { updatePsv } = usePsvStore();
    const canEdit = useAuthStore((state) => state.canEdit());
    const [open, setOpen] = useState(false);

    // Get actual owner from ownerId
    const owner = getUserById(psv.ownerId);

    const [formData, setFormData] = useState({
        tag: psv.tag,
        name: psv.name,
        type: psv.type,
        designCode: psv.designCode || 'API-520',
    });

    const handleEdit = () => {
        setFormData({
            tag: psv.tag,
            name: psv.name,
            type: psv.type,
            designCode: psv.designCode || 'API-520',
        });
        setOpen(true);
    };

    const handleSave = () => {
        updatePsv({
            ...psv,
            tag: formData.tag,
            name: formData.name,
            type: formData.type,
            designCode: formData.designCode as DesignCode,
        });
        setOpen(false);
    };

    return (
        <Paper
            sx={{
                ...glassCardStyles,
                p: 3,
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    // transform: 'translateY(-2px)',
                    boxShadow: 6,
                    '& .edit-button': { opacity: 1 },
                },
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="primary">
                    Basic Information
                </Typography>
                {canEdit && (
                    <IconButton
                        className="edit-button"
                        size="small"
                        onClick={handleEdit}
                        sx={{ opacity: 0.5, transition: 'opacity 0.2s' }}
                    >
                        <Edit fontSize="small" />
                    </IconButton>
                )}
            </Box>

            <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Tag</Typography>
                    <Typography variant="body2" fontWeight={500}>{psv.tag}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Name</Typography>
                    <Typography variant="body2" fontWeight={500} align="right">{psv.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Type</Typography>
                    <Typography variant="body2" fontWeight={500} align="right" sx={{ textTransform: 'uppercase' }}>{psv.type}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Design Code</Typography>
                    <Typography variant="body2" fontWeight={500} align="right">{psv.designCode || 'API-520'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Owner</Typography>
                    <Typography variant="body2" fontWeight={500}>{owner?.name || 'Unknown'}</Typography>
                </Box>
            </Stack>

            {/* Edit Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Basic Information</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Tag"
                            value={formData.tag}
                            onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Description / Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <TextField
                            select
                            label="Type"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as ProtectiveSystemType })}
                            fullWidth
                        >
                            {TYPE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Design Code"
                            value={formData.designCode}
                            onChange={(e) => setFormData({ ...formData, designCode: e.target.value as DesignCode })}
                            fullWidth
                        >
                            {DESIGN_CODE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
