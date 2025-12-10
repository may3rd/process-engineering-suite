"use client";

import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Grid,
    useTheme,
    IconButton,
    Tooltip,
} from "@mui/material";
import {
    Security,
    Adjust,
    Air,
    Edit,
    Visibility,
} from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";
import { ProtectiveSystemType } from "@/data/types";

export function ProtectiveSystemList() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { psvList, selectPsv, selectedProject } = usePsvStore();

    const getTypeIcon = (type: ProtectiveSystemType) => {
        switch (type) {
            case 'psv':
                return <Security />;
            case 'rupture_disc':
                return <Adjust />;
            case 'vent_system':
            case 'tank_vent':
            case 'breather_valve':
                return <Air />;
            case 'flame_arrestor':
                return <Security />; // Placeholder
            case 'control_valve':
                return <Adjust />; // Placeholder
            default:
                return <Security />;
        }
    };

    const getTypeLabel = (type: ProtectiveSystemType) => {
        switch (type) {
            case 'psv':
                return 'PSV';
            case 'rupture_disc':
                return 'Rupture Disc';
            case 'vent_system':
                return 'Vent System';
            case 'tank_vent':
                return 'Tank Vent';
            case 'breather_valve':
                return 'Breather Valve';
            case 'flame_arrestor':
                return 'Flame Arrestor';
            case 'control_valve':
                return 'Control Valve';
            case 'prv':
                return 'PRV';
            default:
                return (type as string).replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        }
    };

    const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        switch (status) {
            case 'approved': return 'success';
            case 'issued': return 'info';
            case 'in_review': return 'warning';
            default: return 'default';
        }
    };

    const getPhaseColor = (phase: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        switch (phase) {
            case 'gas':
                return 'info';
            case 'liquid':
                return 'primary';
            case 'steam':
                return 'warning';
            case 'two_phase':
                return 'secondary';
            default:
                return 'default';
        }
    };

    if (!selectedProject) {
        return null;
    }

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h5" fontWeight={600}>
                        Protective Systems
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {psvList.length} device{psvList.length !== 1 ? 's' : ''} in {selectedProject.name}
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={2}>
                {psvList.map((psv) => (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={psv.id}>
                        <Card
                            sx={{
                                cursor: 'pointer',
                                height: '100%',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                },
                                transition: 'all 0.2s ease',
                            }}
                            onClick={() => selectPsv(psv.id)}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'primary.main',
                                            }}
                                        >
                                            {getTypeIcon(psv.type)}
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" fontWeight={600}>
                                                {psv.tag}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {getTypeLabel(psv.type)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Chip
                                        label={psv.status.replace('_', ' ')}
                                        size="small"
                                        color={getStatusColor(psv.status)}
                                        sx={{ textTransform: 'capitalize' }}
                                    />
                                </Box>

                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                                    {psv.name}
                                </Typography>

                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                                    <Chip
                                        label={psv.fluidPhase}
                                        size="small"
                                        variant="outlined"
                                        color={getPhaseColor(psv.fluidPhase)}
                                        sx={{ textTransform: 'capitalize' }}
                                    />
                                    <Chip
                                        label={psv.designCode}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 1,
                                        p: 1.5,
                                        borderRadius: "14px",
                                        backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                                    }}
                                >
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Set Pressure
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {psv.setPressure} barg
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            MAWP
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {psv.mawp} barg
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 0.5 }}>
                                    <Tooltip title="View Details">
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); selectPsv(psv.id); }}>
                                            <Visibility fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edit">
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); selectPsv(psv.id); }}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}

                {psvList.length === 0 && (
                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <Security sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                No protective systems found
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Add a PSV or rupture disc to get started
                            </Typography>
                        </Box>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
