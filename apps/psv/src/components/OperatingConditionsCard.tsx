"use client";

import { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    MenuItem,
    InputAdornment,
    LinearProgress,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { ProtectiveSystem, FluidPhase } from "@/data/types";
import { usePsvStore } from "../store/usePsvStore";
import { glassCardStyles } from "./styles";

interface OperatingConditionsCardProps {
    psv: ProtectiveSystem;
}

const PHASE_OPTIONS: { value: FluidPhase; label: string }[] = [
    { value: 'gas', label: 'Gas / Vapor' },
    { value: 'liquid', label: 'Liquid' },
    { value: 'steam', label: 'Steam' },
    { value: 'two_phase', label: 'Two-Phase' },
];

export function OperatingConditionsCard({ psv }: OperatingConditionsCardProps) {
    const { updatePsv } = usePsvStore();
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        serviceFluid: psv.serviceFluid || '',
        fluidPhase: psv.fluidPhase || 'gas',
        setPressure: psv.setPressure || 0,
        mawp: psv.mawp || 0,
    });

    const handleEdit = () => {
        setFormData({
            serviceFluid: psv.serviceFluid || '',
            fluidPhase: psv.fluidPhase || 'gas',
            setPressure: psv.setPressure || 0,
            mawp: psv.mawp || 0,
        });
        setOpen(true);
    };

    const handleSave = () => {
        updatePsv({
            ...psv,
            serviceFluid: formData.serviceFluid,
            fluidPhase: formData.fluidPhase,
            setPressure: formData.setPressure,
            mawp: formData.mawp,
        });
        setOpen(false);
    };

    // Calculate ratio for visual
    const ratio = psv.mawp && psv.setPressure ? (psv.setPressure / psv.mawp) * 100 : 0;
    const ratioColor = ratio > 95 ? 'error' : ratio > 85 ? 'warning' : 'success';

    return (
        <Paper
            sx={{
                ...glassCardStyles,
                p: 3,
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 6,
                    '& .edit-button': { opacity: 1 },
                },
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="primary">
                    Operating Conditions
                </Typography>
                <IconButton
                    className="edit-button"
                    size="small"
                    onClick={handleEdit}
                    sx={{ opacity: 0.5, transition: 'opacity 0.2s' }}
                >
                    <Edit fontSize="small" />
                </IconButton>
            </Box>

            <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Service Fluid</Typography>
                    <Typography variant="body2" fontWeight={500}>{psv.serviceFluid || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Fluid Phase</Typography>
                    <Chip size="small" label={psv.fluidPhase} color="info" variant="outlined" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Set Pressure</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">{psv.setPressure} barg</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">MAWP</Typography>
                    <Typography variant="body2" fontWeight={700}>{psv.mawp} barg</Typography>
                </Box>
                <Box sx={{ pt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Set / MAWP Ratio</Typography>
                        <Typography variant="caption" fontWeight={600} color={`${ratioColor}.main`}>{ratio.toFixed(0)}%</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(ratio, 100)}
                        color={ratioColor}
                        sx={{ height: 6, borderRadius: 3 }}
                    />
                </Box>
            </Stack>

            {/* Edit Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Operating Conditions</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Service Fluid"
                            value={formData.serviceFluid}
                            onChange={(e) => setFormData({ ...formData, serviceFluid: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            select
                            label="Fluid Phase"
                            value={formData.fluidPhase}
                            onChange={(e) => setFormData({ ...formData, fluidPhase: e.target.value as FluidPhase })}
                            fullWidth
                        >
                            {PHASE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Set Pressure"
                            type="number"
                            value={formData.setPressure}
                            onChange={(e) => setFormData({ ...formData, setPressure: parseFloat(e.target.value) })}
                            InputProps={{ endAdornment: <InputAdornment position="end">barg</InputAdornment> }}
                            fullWidth
                        />
                        <TextField
                            label="MAWP"
                            type="number"
                            value={formData.mawp}
                            onChange={(e) => setFormData({ ...formData, mawp: parseFloat(e.target.value) })}
                            InputProps={{ endAdornment: <InputAdornment position="end">barg</InputAdornment> }}
                            fullWidth
                        />
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
