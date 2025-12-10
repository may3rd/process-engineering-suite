"use client";

import {
    Box,
    Tabs,
    Tab,
    Typography,
    Chip,
    Paper,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    useTheme,
    Card,
    CardContent,
    Button,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Checkbox,
    TextField,
} from "@mui/material";
import {
    Info,
    Warning as WarningIcon,
    LocalFireDepartment,
    Block,
    BrokenImage,
    FlashOff,
    WaterDrop,
    Air,
    AttachFile,
    Description,
    Note,
    CheckCircle,
    Edit,
    Add,
    AddCircle,
    Star,
    Verified,
} from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";
import { ScenarioCause, OverpressureScenario, SizingCase, Comment, TodoItem } from "@/data/types";
import { getAttachmentsByPsv, getCommentsByPsv, getTodosByPsv, getEquipmentLinksByPsv, equipment, getUserById, users } from "@/data/mockData";
import { SizingWorkspace } from "./SizingWorkspace";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`psv-tabpanel-${index}`}
            aria-labelledby={`psv-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

// Overview Tab Content
function OverviewTab() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { selectedPsv } = usePsvStore();

    if (!selectedPsv) return null;

    const equipmentLinks = getEquipmentLinksByPsv(selectedPsv.id);
    const linkedEquipment = equipmentLinks.map(link => {
        const equip = equipment.find(e => e.id === link.equipmentId);
        return { ...link, equipment: equip };
    });

    const owner = getUserById(selectedPsv.ownerId);

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {/* Basic Info Card */}
            <Card>
                <CardContent>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                        Basic Information
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Tag</Typography>
                            <Typography fontWeight={500}>{selectedPsv.tag}</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Name</Typography>
                            <Typography fontWeight={500}>{selectedPsv.name}</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Type</Typography>
                            <Chip label={selectedPsv.type.replace('_', ' ')} size="small" sx={{ textTransform: 'capitalize' }} />
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Design Code</Typography>
                            <Chip label={selectedPsv.designCode} size="small" color="primary" variant="outlined" />
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Owner</Typography>
                            <Typography fontWeight={500}>{owner?.name || 'Unknown'}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Operating Conditions Card */}
            <Card>
                <CardContent>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                        Operating Conditions
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Service Fluid</Typography>
                            <Typography fontWeight={500}>{selectedPsv.serviceFluid}</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Fluid Phase</Typography>
                            <Chip
                                label={selectedPsv.fluidPhase}
                                size="small"
                                color={selectedPsv.fluidPhase === 'gas' ? 'info' : selectedPsv.fluidPhase === 'liquid' ? 'primary' : 'warning'}
                                sx={{ textTransform: 'capitalize' }}
                            />
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Set Pressure</Typography>
                            <Typography fontWeight={600} color="primary.main">{selectedPsv.setPressure} barg</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">MAWP</Typography>
                            <Typography fontWeight={600}>{selectedPsv.mawp} barg</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary">Set/MAWP Ratio</Typography>
                            <Typography fontWeight={500}>{((selectedPsv.setPressure / selectedPsv.mawp) * 100).toFixed(0)}%</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Protected Equipment */}
            <Card sx={{ gridColumn: { md: 'span 2' } }}>
                <CardContent>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                        Protected Equipment
                    </Typography>
                    {linkedEquipment.length > 0 ? (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tag</TableCell>
                                        <TableCell>Description</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Design Pressure</TableCell>
                                        <TableCell>Relationship</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {linkedEquipment.map((link) => (
                                        <TableRow key={link.id}>
                                            <TableCell>
                                                <Typography fontWeight={500}>{link.equipment?.tag}</Typography>
                                            </TableCell>
                                            <TableCell>{link.equipment?.description}</TableCell>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>{link.equipment?.type.replace('_', ' ')}</TableCell>
                                            <TableCell>{link.equipment?.designPressure} barg</TableCell>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>{link.relationship.replace('_', ' ')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography color="text.secondary">No equipment linked</Typography>
                    )}
                </CardContent>
            </Card>

            {/* Tags */}
            <Card sx={{ gridColumn: { md: 'span 2' } }}>
                <CardContent>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                        Tags
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selectedPsv.tags.map((tag) => (
                            <Chip key={tag} label={tag} variant="outlined" />
                        ))}
                        {selectedPsv.tags.length === 0 && (
                            <Typography color="text.secondary">No tags</Typography>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}

// Scenarios Tab Content
function ScenariosTab() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { scenarioList, selectedPsv } = usePsvStore();

    const getCauseIcon = (cause: ScenarioCause) => {
        switch (cause) {
            case 'blocked_outlet':
                return <Block />;
            case 'fire_case':
            case 'external_fire':
                return <LocalFireDepartment />;
            case 'tube_rupture':
                return <BrokenImage />;
            case 'utility_failure':
            case 'power_failure':
                return <FlashOff />;
            case 'thermal_expansion':
                return <WaterDrop />;
            default:
                return <WarningIcon />;
        }
    };

    const getCauseLabel = (cause: ScenarioCause) => {
        return cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    if (!selectedPsv) return null;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                    Overpressure Scenarios
                </Typography>
                <Button variant="contained" startIcon={<Add />} size="small">
                    Add Scenario
                </Button>
            </Box>

            {scenarioList.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {scenarioList.map((scenario) => (
                        <Card key={scenario.id}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                backgroundColor: scenario.cause.includes('fire')
                                                    ? 'rgba(239, 68, 68, 0.15)'
                                                    : isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: scenario.cause.includes('fire') ? 'error.main' : 'secondary.main',
                                            }}
                                        >
                                            {getCauseIcon(scenario.cause)}
                                        </Box>
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="h6" fontWeight={600}>
                                                    {getCauseLabel(scenario.cause)}
                                                </Typography>
                                                {scenario.isGoverning && (
                                                    <Chip
                                                        label="Governing"
                                                        size="small"
                                                        color="warning"
                                                        icon={<Star sx={{ fontSize: 14 }} />}
                                                    />
                                                )}
                                            </Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {scenario.description}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Tooltip title="Edit">
                                        <IconButton size="small">
                                            <Edit fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                        gap: 2,
                                        p: 2,
                                        borderRadius: 2,
                                        backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                                        mb: 2,
                                    }}
                                >
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Relieving Rate</Typography>
                                        <Typography variant="body1" fontWeight={600}>{scenario.relievingRate.toLocaleString()} kg/h</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Relieving Pressure</Typography>
                                        <Typography variant="body1" fontWeight={600}>{scenario.relievingPressure} barg</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Relieving Temp</Typography>
                                        <Typography variant="body1" fontWeight={600}>{scenario.relievingTemp} °C</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Accumulation</Typography>
                                        <Typography variant="body1" fontWeight={600}>{scenario.accumulationPct}%</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Phase</Typography>
                                        <Chip label={scenario.phase} size="small" sx={{ textTransform: 'capitalize' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Required Capacity</Typography>
                                        <Typography variant="body1" fontWeight={600} color="primary.main">
                                            {scenario.requiredCapacity.toLocaleString()} kg/h
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Assumptions</Typography>
                                    <List dense disablePadding>
                                        {scenario.assumptions.map((assumption, idx) => (
                                            <ListItem key={idx} disablePadding sx={{ py: 0.25 }}>
                                                <ListItemIcon sx={{ minWidth: 28 }}>
                                                    <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                                                </ListItemIcon>
                                                <ListItemText primary={assumption} primaryTypographyProps={{ variant: 'body2' }} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>

                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {scenario.codeRefs.map((ref, idx) => (
                                        <Chip key={idx} label={ref} size="small" variant="outlined" />
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : (
                <Paper sx={{ py: 6, textAlign: 'center' }}>
                    <WarningIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        No scenarios defined
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Add overpressure scenarios to size this device
                    </Typography>
                    <Button variant="contained" startIcon={<Add />}>
                        Add First Scenario
                    </Button>
                </Paper>
            )}
        </Box>
    );
}

// Sizing Tab Content
function SizingTab({ onEdit, onCreate }: { onEdit?: (id: string) => void; onCreate?: (id: string) => void }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { sizingCaseList, scenarioList, selectedPsv, addSizingCase, updateSizingCase } = usePsvStore();
    const [dialogOpen, setDialogOpen] = useState(false);

    const getScenarioName = (scenarioId: string) => {
        const scenario = scenarioList.find(s => s.id === scenarioId);
        if (!scenario) return 'Unknown';
        return scenario.cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        switch (status) {
            case 'approved':
                return 'success';
            case 'verified':
                return 'info';
            case 'calculated':
                return 'warning';
            case 'draft':
                return 'default';
            default:
                return 'default';
        }
    };

    const handleCreateSizingCase = (scenario: OverpressureScenario) => {
        if (!selectedPsv) return;

        // Map fluid phase to sizing method
        const methodMap: Record<string, 'gas' | 'liquid' | 'steam' | 'two_phase'> = {
            'gas': 'gas',
            'liquid': 'liquid',
            'steam': 'steam',
            'two_phase': 'two_phase',
        };

        const newCase: SizingCase = {
            id: uuidv4(),
            protectiveSystemId: selectedPsv.id,
            scenarioId: scenario.id,
            standard: 'API-520',
            method: methodMap[scenario.phase] || 'gas',
            inputs: {
                massFlowRate: scenario.relievingRate,
                molecularWeight: 28, // Default for gases
                temperature: scenario.relievingTemp,
                pressure: scenario.relievingPressure,
                compressibilityZ: 1.0,
                specificHeatRatio: 1.4,
                backpressure: 0,
                backpressureType: 'superimposed',
            },
            outputs: {
                requiredArea: 0,
                selectedOrifice: 'D',
                orificeArea: 71,
                percentUsed: 0,
                ratedCapacity: 0,
                dischargeCoefficient: scenario.phase === 'liquid' ? 0.65 : 0.975,
                backpressureCorrectionFactor: 1.0,
                isCriticalFlow: false,
                numberOfValves: 1,
                messages: [],
                requiredAreaIn2: 0,
            },
            unitPreferences: {
                pressure: 'barg',
                temperature: '°C',
                flow: 'kg/h',
                length: 'm',
                area: 'mm²',
                density: 'kg/m³',
                viscosity: 'cP',
            },
            revisionNo: 1,
            status: 'draft',
            createdBy: 'user-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        addSizingCase(newCase);
        setDialogOpen(false);

        // Open the new case for editing
        if (onCreate) {
            onCreate(newCase.id);
        }
    };

    if (!selectedPsv) return null;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                    Sizing Cases
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    size="small"
                    onClick={() => setDialogOpen(true)}
                    disabled={scenarioList.length === 0}
                >
                    New Sizing Case
                </Button>
            </Box>

            {/* Scenario Picker Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Select Overpressure Scenario</DialogTitle>
                <DialogContent dividers>
                    {scenarioList.length > 0 ? (
                        <List disablePadding>
                            {scenarioList.map((scenario) => (
                                <ListItemButton
                                    key={scenario.id}
                                    onClick={() => handleCreateSizingCase(scenario)}
                                    sx={{ borderRadius: 1, mb: 1 }}
                                >
                                    <ListItemIcon>
                                        {scenario.isGoverning ? <Star color="warning" /> : <WarningIcon color="action" />}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography fontWeight={600}>
                                                    {scenario.cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                </Typography>
                                                {scenario.isGoverning && (
                                                    <Chip label="Governing" size="small" color="warning" />
                                                )}
                                            </Box>
                                        }
                                        secondary={`${scenario.relievingRate.toLocaleString()} kg/h @ ${scenario.relievingPressure} barg, ${scenario.relievingTemp}°C`}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    ) : (
                        <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                            No scenarios available. Create a scenario first.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {sizingCaseList.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sizingCaseList.map((sizing) => (
                        <Card key={sizing.id}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="h6" fontWeight={600}>
                                                {getScenarioName(sizing.scenarioId)}
                                            </Typography>
                                            <Chip
                                                label={sizing.status}
                                                size="small"
                                                color={getStatusColor(sizing.status)}
                                                sx={{ textTransform: 'capitalize' }}
                                            />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {sizing.standard} • {sizing.method.toUpperCase()} method • Rev {sizing.revisionNo}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {sizing.status === 'calculated' && (
                                            <Tooltip title="Verify">
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => updateSizingCase({
                                                        ...sizing,
                                                        status: 'verified',
                                                        approvedBy: 'user-1'
                                                    })}
                                                >
                                                    <Verified fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => onEdit?.(sizing.id)}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                        gap: 3,
                                    }}
                                >
                                    {/* Inputs */}
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Inputs</Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Mass Flow</Typography>
                                                <Typography variant="body2" fontWeight={500}>{sizing.inputs.massFlowRate.toLocaleString()} kg/h</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">MW</Typography>
                                                <Typography variant="body2" fontWeight={500}>{sizing.inputs.molecularWeight}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Temperature</Typography>
                                                <Typography variant="body2" fontWeight={500}>{sizing.inputs.temperature} °C</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Pressure</Typography>
                                                <Typography variant="body2" fontWeight={500}>{sizing.inputs.pressure} barg</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Z Factor</Typography>
                                                <Typography variant="body2" fontWeight={500}>{sizing.inputs.compressibilityZ}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">k (Cp/Cv)</Typography>
                                                <Typography variant="body2" fontWeight={500}>{sizing.inputs.specificHeatRatio}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Backpressure</Typography>
                                                <Typography variant="body2" fontWeight={500}>{sizing.inputs.backpressure} barg</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">BP Type</Typography>
                                                <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                                                    {sizing.inputs.backpressureType.replace('_', ' ')}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>

                                    {/* Outputs */}
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.05)',
                                            border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.15)'}`,
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Results</Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Required Area</Typography>
                                                <Typography variant="body2" fontWeight={600} color="primary.main">
                                                    {sizing.outputs.requiredArea.toLocaleString()} mm²
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Selected Orifice</Typography>
                                                <Typography variant="h5" fontWeight={700} color="primary.main">
                                                    {sizing.outputs.selectedOrifice}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    {(sizing.outputs.numberOfValves || 1) > 1 ? 'Total Orifice Area' : 'Orifice Area'}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {(sizing.outputs.orificeArea * (sizing.outputs.numberOfValves || 1)).toLocaleString()} mm²
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">% Used</Typography>
                                                <Typography variant="body2" fontWeight={600} color={
                                                    (sizing.outputs.requiredArea / (sizing.outputs.orificeArea * (sizing.outputs.numberOfValves || 1)) * 100) > 90 ? 'warning.main' : 'text.primary'
                                                }>
                                                    {(sizing.outputs.requiredArea / (sizing.outputs.orificeArea * (sizing.outputs.numberOfValves || 1)) * 100).toFixed(1)}%
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Number of Valves</Typography>
                                                <Typography variant="body2" fontWeight={600} color={sizing.outputs.numberOfValves > 1 ? 'info.main' : 'text.primary'}>
                                                    {sizing.outputs.numberOfValves || 1}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Rated Capacity</Typography>
                                                <Typography variant="body2" fontWeight={500}>{sizing.outputs.ratedCapacity.toLocaleString()} kg/h</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Flow Type</Typography>
                                                <Chip
                                                    label={sizing.outputs.isCriticalFlow ? 'Critical' : 'Subcritical'}
                                                    size="small"
                                                    color={sizing.outputs.isCriticalFlow ? 'success' : 'info'}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Messages */}
                                {sizing.outputs.messages.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <List dense disablePadding>
                                            {sizing.outputs.messages.map((msg, idx) => (
                                                <ListItem key={idx} disablePadding sx={{ py: 0.25 }}>
                                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                                        <Info sx={{ fontSize: 16, color: 'info.main' }} />
                                                    </ListItemIcon>
                                                    <ListItemText primary={msg} primaryTypographyProps={{ variant: 'body2' }} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : (
                <Paper sx={{ py: 6, textAlign: 'center' }}>
                    <Air sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        No sizing cases
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Create a sizing case from an overpressure scenario
                    </Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
                        New Sizing Case
                    </Button>
                </Paper>
            )}
        </Box>
    );
}

// Attachments Tab Content
function AttachmentsTab() {
    const { selectedPsv } = usePsvStore();

    if (!selectedPsv) return null;

    const attachments = getAttachmentsByPsv(selectedPsv.id);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Box>
            {/* Attachments Section */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Attachments
                    </Typography>
                    <Button variant="outlined" startIcon={<AttachFile />} size="small">
                        Upload File
                    </Button>
                </Box>

                {attachments.length > 0 ? (
                    <List disablePadding>
                        {attachments.map((att) => (
                            <ListItem
                                key={att.id}
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    mb: 1,
                                }}
                            >
                                <ListItemIcon>
                                    <Description color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={att.fileName}
                                    secondary={`${formatFileSize(att.size)} • Uploaded ${formatDate(att.createdAt)}`}
                                />
                                <Button size="small">Download</Button>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Paper variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
                        <AttachFile sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No attachments</Typography>
                    </Paper>
                )}
            </Box>
        </Box>
    );
}

// Notes Tab Content (Comments & Todos)
function NotesTab() {
    const { selectedPsv } = usePsvStore();
    const [localTodos, setLocalTodos] = useState<TodoItem[]>([]);
    const [localComments, setLocalComments] = useState<Comment[]>([]);
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [addCommentOpen, setAddCommentOpen] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState('user-1');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newCommentText, setNewCommentText] = useState('');

    // Initialize from mock data
    useEffect(() => {
        if (selectedPsv) {
            setLocalTodos(getTodosByPsv(selectedPsv.id));
            setLocalComments(getCommentsByPsv(selectedPsv.id));
        }
    }, [selectedPsv]);

    if (!selectedPsv) return null;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleToggleTodo = (todoId: string) => {
        setLocalTodos(prev => prev.map(t =>
            t.id === todoId ? { ...t, completed: !t.completed } : t
        ));
    };

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        // Default due date: 1 week from now
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + 7);
        const dueDate = newTaskDueDate || defaultDueDate.toISOString().split('T')[0];

        const newTodo: TodoItem = {
            id: `todo-${Date.now()}`,
            protectiveSystemId: selectedPsv.id,
            text: newTaskText.trim(),
            completed: false,
            assignedTo: newTaskAssignee,
            dueDate: dueDate,
            createdBy: 'user-1',
            createdAt: new Date().toISOString(),
        };
        setLocalTodos(prev => [...prev, newTodo]);
        setNewTaskText('');
        setNewTaskAssignee('user-1');
        setNewTaskDueDate('');
        setAddTaskOpen(false);
    };

    const handleAddComment = () => {
        if (!newCommentText.trim()) return;
        const newComment: Comment = {
            id: `comment-${Date.now()}`,
            protectiveSystemId: selectedPsv.id,
            body: newCommentText.trim(),
            createdBy: 'user-1',
            createdAt: new Date().toISOString(),
        };
        setLocalComments(prev => [...prev, newComment]);
        setNewCommentText('');
        setAddCommentOpen(false);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Todos Section */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Tasks
                    </Typography>
                    <Button variant="contained" startIcon={<AddCircle />} size="small" onClick={() => setAddTaskOpen(true)}>
                        Add Task
                    </Button>
                </Box>

                {localTodos.length > 0 ? (
                    <Paper variant="outlined">
                        <List disablePadding>
                            {localTodos.map((todo, index) => {
                                const assignee = todo.assignedTo ? getUserById(todo.assignedTo) : null;
                                return (
                                    <ListItem
                                        key={todo.id}
                                        divider={index < localTodos.length - 1}
                                        secondaryAction={
                                            todo.dueDate && (
                                                <Chip
                                                    label={formatDate(todo.dueDate)}
                                                    size="small"
                                                    color={new Date(todo.dueDate) < new Date() && !todo.completed ? 'error' : 'default'}
                                                    variant="outlined"
                                                />
                                            )
                                        }
                                    >
                                        <ListItemIcon>
                                            <Checkbox
                                                checked={todo.completed}
                                                onChange={() => handleToggleTodo(todo.id)}
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography sx={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                                                    {todo.text}
                                                </Typography>
                                            }
                                            secondary={assignee ? `Assigned to ${assignee.name}` : undefined}
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Paper>
                ) : (
                    <Paper variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
                        <CheckCircle sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No tasks</Typography>
                    </Paper>
                )}
            </Box>

            {/* Comments Section */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Comments
                    </Typography>
                    <Button variant="contained" startIcon={<AddCircle />} size="small" onClick={() => setAddCommentOpen(true)}>
                        Add Comment
                    </Button>
                </Box>

                {localComments.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {localComments.map((comment) => {
                            const author = getUserById(comment.createdBy);
                            return (
                                <Card key={comment.id} variant="outlined">
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                {author?.name || 'Unknown'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDate(comment.createdAt)}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2">{comment.body}</Typography>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                ) : (
                    <Paper variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
                        <Note sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No comments</Typography>
                    </Paper>
                )}
            </Box>

            {/* Add Task Dialog */}
            <Dialog open={addTaskOpen} onClose={() => setAddTaskOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Task</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Task description"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        sx={{ mt: 2, mb: 2 }}
                    />
                    <TextField
                        select
                        fullWidth
                        label="Assign to"
                        value={newTaskAssignee}
                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                        sx={{ mb: 2 }}
                        SelectProps={{ native: true }}
                    >
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        type="date"
                        label="Due date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        helperText="Default: 1 week from today"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddTaskOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddTask} disabled={!newTaskText.trim()}>
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Comment Dialog */}
            <Dialog open={addCommentOpen} onClose={() => setAddCommentOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Comment</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={3}
                        label="Comment"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddCommentOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddComment} disabled={!newCommentText.trim()}>
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// Main Component
export function ProtectiveSystemDetail() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { selectedPsv, activeTab, setActiveTab, selectPsv, updateSizingCase, sizingCaseList, updatePsv, deleteSizingCase } = usePsvStore();
    const [editingCaseId, setEditingCaseId] = useState<string | null>(null);

    // If editing a case, show the workspace
    if (editingCaseId) {
        const caseToEdit = sizingCaseList.find(c => c.id === editingCaseId);
        if (caseToEdit) {
            return (
                <SizingWorkspace
                    sizingCase={caseToEdit}
                    inletNetwork={selectedPsv?.inletNetwork}
                    outletNetwork={selectedPsv?.outletNetwork}
                    onClose={() => setEditingCaseId(null)}
                    onSave={(updated) => {
                        updateSizingCase(updated);
                        setEditingCaseId(null);
                    }}
                    onSaveNetworks={(updatedInlet, updatedOutlet) => {
                        if (selectedPsv) {
                            updatePsv({
                                ...selectedPsv,
                                inletNetwork: updatedInlet,
                                outletNetwork: updatedOutlet,
                            });
                        }
                    }}
                    psvTag={selectedPsv?.tag}
                    onDelete={() => {
                        deleteSizingCase(caseToEdit.id);
                        setEditingCaseId(null);
                    }}
                />
            );
        }
    }

    if (!selectedPsv) {
        return null;
    }

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    return (
        <Box>
            {/* Header */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Typography variant="h4" fontWeight={700}>
                                {selectedPsv.tag}
                            </Typography>
                            <Chip
                                label={selectedPsv.status.replace('_', ' ')}
                                color={selectedPsv.status === 'approved' || selectedPsv.status === 'issued' ? 'success' : selectedPsv.status === 'in_review' ? 'warning' : 'default'}
                                sx={{ textTransform: 'capitalize' }}
                            />
                        </Box>
                        <Typography variant="body1" color="text.secondary">
                            {selectedPsv.name}
                        </Typography>
                    </Box>
                    <Button variant="outlined" onClick={() => selectPsv(null)}>
                        Close
                    </Button>
                </Box>
            </Paper>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                            minHeight: 56,
                        },
                    }}
                >
                    <Tab label="Overview" />
                    <Tab label="Scenarios" />
                    <Tab label="Sizing" />
                    <Tab label="Notes" />
                    <Tab label="Attachments" />
                </Tabs>
            </Paper>

            {/* Tab Panels */}
            <TabPanel value={activeTab} index={0}>
                <OverviewTab />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
                <ScenariosTab />
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
                <SizingTab onEdit={(id) => setEditingCaseId(id)} onCreate={(id) => setEditingCaseId(id)} />
            </TabPanel>
            <TabPanel value={activeTab} index={3}>
                <NotesTab />
            </TabPanel>
            <TabPanel value={activeTab} index={4}>
                <AttachmentsTab />
            </TabPanel>
        </Box>
    );
}
