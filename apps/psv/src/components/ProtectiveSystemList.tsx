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
    Button,
    Paper,
    Stack,
    TextField,
    InputAdornment,
    MenuItem,
} from "@mui/material";
import {
    Security,
    Adjust,
    Air,
    Edit,
    Visibility,
    Add,
    Search,
    ArrowUpward,
    ArrowDownward,
} from "@mui/icons-material";
import { useMemo, useState } from "react";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ProtectiveSystemType, ProtectiveSystem } from "@/data/types";
import { getWorkflowStatusColor, getWorkflowStatusLabel } from "@/lib/statusColors";
import { glassCardStyles } from "./styles";
import { SortConfig, sortByGetter } from "@/lib/sortUtils";
import { useProjectUnitSystem } from "@/lib/useProjectUnitSystem";
import { formatPressureGauge } from "@/lib/projectUnits";

export function ProtectiveSystemList() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { unitSystem } = useProjectUnitSystem();
    const { psvList, selectPsv, selectedProject, selectedArea, addProtectiveSystem } = usePsvStore();
    const currentUser = useAuthStore((state) => state.currentUser);
    const canEdit = useAuthStore((state) => state.canEdit());
    const [searchText, setSearchText] = useState('');

    type SortKey = 'tag' | 'name' | 'status' | 'setPressure' | 'mawp' | 'designCode' | 'fluidPhase' | 'type';
    const [sortConfig, setSortConfig] = useState<SortConfig<SortKey>>({
        key: 'tag',
        direction: 'asc',
    });

    const handleAddPsv = () => {
        if (!selectedArea || !selectedProject || !currentUser) return;

        const newPsvData = {
            areaId: selectedArea.id,
            projectIds: [selectedProject.id],
            name: 'New Protective System',
            tag: `PSV-${psvList.length + 1}`,
            type: 'psv' as const,
            designCode: 'API-520' as const,
            serviceFluid: '',
            fluidPhase: 'gas' as const,
            setPressure: 0,
            mawp: 0,
            ownerId: currentUser.id,
            status: 'draft' as const,
            tags: [],
        };

        addProtectiveSystem(newPsvData);
        // Note: selectPsv would need the new ID, but addProtectiveSystem generates it internally
        // The PSV list will update and show the new item
    };

    const filteredPsvs = useMemo(() => {
        const query = searchText.trim().toLowerCase();
        if (!query) return psvList;

        return psvList.filter((psv) => {
            const haystack = [
                psv.tag,
                psv.name,
                psv.type,
                psv.designCode,
                psv.fluidPhase,
                psv.status,
                psv.serviceFluid,
                ...(psv.tags ?? []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [psvList, searchText]);

    const getSortValue = (psv: ProtectiveSystem, key: SortKey): string | number => {
        switch (key) {
            case 'tag':
                return psv.tag;
            case 'name':
                return psv.name;
            case 'status':
                return psv.status;
            case 'type':
                return psv.type;
            case 'designCode':
                return psv.designCode;
            case 'fluidPhase':
                return psv.fluidPhase;
            case 'setPressure':
                return psv.setPressure;
            case 'mawp':
                return psv.mawp;
            default:
                return '';
        }
    };

    const sortedPsvs = useMemo(
        () => sortByGetter(filteredPsvs, sortConfig, getSortValue),
        [filteredPsvs, sortConfig]
    );

    const filteredCountLabel =
        sortedPsvs.length === psvList.length ? `${psvList.length}` : `${sortedPsvs.length} of ${psvList.length}`;

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
                        {filteredCountLabel} device{sortedPsvs.length !== 1 ? 's' : ''} in {selectedProject.name}
                    </Typography>
                </Box>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        size="small"
                        onClick={handleAddPsv}
                    >
                        Add New Device
                    </Button>
                )}
            </Box>

            <Paper sx={{ ...glassCardStyles, p: 2, mb: 3 }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                >
                    <TextField
                        placeholder="Search by tag, name, type, fluid, or status..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        size="small"
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', md: 360 } }}>
                        <TextField
                            select
                            label="Sort"
                            size="small"
                            value={sortConfig.key}
                            onChange={(e) =>
                                setSortConfig({ key: e.target.value as SortKey, direction: 'asc' })
                            }
                            fullWidth
                        >
                            <MenuItem value="tag">Tag</MenuItem>
                            <MenuItem value="name">Name</MenuItem>
                            <MenuItem value="status">Status</MenuItem>
                            <MenuItem value="type">Type</MenuItem>
                            <MenuItem value="fluidPhase">Phase</MenuItem>
                            <MenuItem value="designCode">Design code</MenuItem>
                            <MenuItem value="setPressure">Set pressure</MenuItem>
                            <MenuItem value="mawp">MAWP</MenuItem>
                        </TextField>
                        <Tooltip title={sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}>
                            <IconButton
                                size="small"
                                onClick={() =>
                                    setSortConfig((prev) => ({
                                        ...prev,
                                        direction: prev.direction === 'asc' ? 'desc' : 'asc',
                                    }))
                                }
                                sx={{ flexShrink: 0 }}
                            >
                                {sortConfig.direction === 'asc' ? (
                                    <ArrowUpward fontSize="small" />
                                ) : (
                                    <ArrowDownward fontSize="small" />
                                )}
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Paper>

            <Grid container spacing={2}>
                {sortedPsvs.map((psv) => (
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
                                        label={getWorkflowStatusLabel(psv.status)}
                                        size="small"
                                        color={getWorkflowStatusColor(psv.status)}
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
                                            {formatPressureGauge(psv.setPressure, unitSystem, 2)}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            MAWP
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {formatPressureGauge(psv.mawp, unitSystem, 2)}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 0.5 }}>
                                    {canEdit ? (
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); selectPsv(psv.id); }}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip title="View Details">
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); selectPsv(psv.id); }}>
                                                <Visibility fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}

                {sortedPsvs.length === 0 && (
                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <Security sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                {searchText.trim() ? 'No devices match your search' : 'No protective systems found'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {searchText.trim()
                                    ? 'Try a different search term'
                                    : 'Add a PSV or rupture disc to get started'}
                            </Typography>
                        </Box>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
