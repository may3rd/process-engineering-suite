"use client";

import {
    Box,
    Typography,
    Paper,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme,
} from "@mui/material";
import {
    Print,
    Business,
    AttachFile,
    Star,
} from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";
import { getEquipmentLinksByPsv, equipment, getUserById } from "@/data/mockData";

export function SummaryTab() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const {
        selectedPsv,
        scenarioList,
        sizingCaseList,
        attachmentList,
        commentList,
    } = usePsvStore();

    if (!selectedPsv) return null;

    const linkedEquipment = getEquipmentLinksByPsv(selectedPsv.id);
    const owner = getUserById(selectedPsv.ownerId);
    const psvScenarios = scenarioList.filter(s => s.protectiveSystemId === selectedPsv.id);
    const psvSizingCases = sizingCaseList.filter(c => c.protectiveSystemId === selectedPsv.id);
    const psvAttachments = attachmentList.filter(a => a.protectiveSystemId === selectedPsv.id);
    const psvComments = commentList.filter(c => c.protectiveSystemId === selectedPsv.id);

    const handlePrint = () => {
        window.print();
    };

    const sectionStyles = {
        mb: 2,
        p: 1.5,
        bgcolor: isDark ? 'background.paper' : 'white',
        borderRadius: 1,
        border: 0,
        '@media print': {
            breakInside: 'avoid',
            boxShadow: 'none',
            p: 1,
            mb: 1,
        },
    };

    const headerStyles = {
        fontWeight: 600,
        fontSize: '0.875rem',
        mb: 1,
        pb: 0.5,
        borderBottom: 1,
        borderColor: 'divider',
    };

    return (
        <Box
            sx={{
                '@media print': {
                    bgcolor: 'white',
                    color: 'black',
                    '& .no-print': { display: 'none' },
                },
            }}
        >
            {/* Print Button */}
            <Box className="no-print" sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                    variant="outlined"
                    startIcon={<Print />}
                    onClick={handlePrint}
                >
                    Print Summary
                </Button>
            </Box>

            {/* Company Header Placeholder */}
            <Paper sx={{ ...sectionStyles, mb: 2, textAlign: 'center', py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
                    <Business sx={{ fontSize: 28, color: 'text.secondary' }} />
                    <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                            [Company Logo Placeholder]
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            Company Name • Project Name • Document Reference
                        </Typography>
                    </Box>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h5" fontWeight={700}>
                    PSV Data Sheet
                </Typography>
                <Typography variant="h6" color="primary.main" sx={{ mt: 0.5 }}>
                    {selectedPsv.tag}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {selectedPsv.name}
                </Typography>
            </Paper>

            {/* Basic Information & Service Conditions - 2 Column Layout */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1.5,
                mb: 2,
                '@media print': {
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px',
                }
            }}>
                {/* Basic Information */}
                <Paper sx={sectionStyles}>
                    <Typography variant="h6" sx={headerStyles}>
                        Basic Information
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Tag Number</Typography>
                            <Typography variant="body2" fontWeight={500}>{selectedPsv.tag}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Status</Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                                {selectedPsv.status.replace('_', ' ')}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Type</Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                                {selectedPsv.type.replace('_', ' ')}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Design Code</Typography>
                            <Typography variant="body2" fontWeight={500}>{selectedPsv.designCode}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Set Pressure</Typography>
                            <Typography variant="body2" fontWeight={500}>{selectedPsv.setPressure} barg</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">MAWP</Typography>
                            <Typography variant="body2" fontWeight={500}>{selectedPsv.mawp} barg</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Owner</Typography>
                            <Typography variant="body2" fontWeight={500}>{owner?.name || 'N/A'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Updated</Typography>
                            <Typography variant="body2" fontWeight={500}>
                                {new Date(selectedPsv.updatedAt).toLocaleDateString()}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>

                {/* Service Conditions */}
                <Paper sx={sectionStyles}>
                    <Typography variant="h6" sx={headerStyles}>
                        Service Conditions
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Service Fluid</Typography>
                            <Typography variant="body2" fontWeight={500}>{selectedPsv.serviceFluid}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Fluid Phase</Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                                {selectedPsv.fluidPhase.replace('_', ' ')}
                            </Typography>
                        </Box>
                        <Box sx={{ gridColumn: '1 / -1' }}>
                            <Typography variant="caption" color="text.secondary">Tags</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {selectedPsv.tags.length > 0 ? (
                                    selectedPsv.tags.map((tag, idx) => (
                                        <Chip key={idx} label={tag} size="small" sx={{ fontSize: '0.7rem' }} />
                                    ))
                                ) : (
                                    <Typography variant="caption" color="text.secondary">None</Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Paper>
            </Box>

            {/* Protected Equipment */}
            <Paper sx={sectionStyles}>
                <Typography variant="h6" sx={headerStyles}>
                    Protected Equipment
                </Typography>
                {linkedEquipment.length > 0 ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Tag</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Relationship</TableCell>
                                    <TableCell>Design Pressure</TableCell>
                                    <TableCell>Design Temp</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {linkedEquipment.map((link) => {
                                    const eq = equipment.find(e => e.id === link.equipmentId);
                                    return eq ? (
                                        <TableRow key={link.id}>
                                            <TableCell>{eq.tag}</TableCell>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>{eq.type.replace('_', ' ')}</TableCell>
                                            <TableCell>{link.isPrimary ? 'Primary' : 'Secondary'}</TableCell>
                                            <TableCell>{eq.designPressure} barg</TableCell>
                                            <TableCell>{eq.designTemperature} °C</TableCell>
                                        </TableRow>
                                    ) : null;
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body2" color="text.secondary">No equipment linked.</Typography>
                )}
            </Paper>

            {/* Relief Scenarios */}
            <Paper sx={sectionStyles}>
                <Typography variant="h6" sx={headerStyles}>
                    Relief Scenarios
                </Typography>
                {psvScenarios.length > 0 ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Cause</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Phase</TableCell>
                                    <TableCell align="right">Relieving Rate (kg/h)</TableCell>
                                    <TableCell align="right">Pressure (barg)</TableCell>
                                    <TableCell align="center">Governing</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {psvScenarios.map((scenario) => (
                                    <TableRow key={scenario.id}>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>
                                            {scenario.cause.replace('_', ' ')}
                                        </TableCell>
                                        <TableCell>{scenario.description}</TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>
                                            {scenario.phase.replace('_', ' ')}
                                        </TableCell>
                                        <TableCell align="right">{scenario.relievingRate.toLocaleString()}</TableCell>
                                        <TableCell align="right">{scenario.relievingPressure}</TableCell>
                                        <TableCell align="center">
                                            {scenario.isGoverning ? (
                                                <Star sx={{ color: 'warning.main', fontSize: 18 }} />
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body2" color="text.secondary">No scenarios defined.</Typography>
                )}
            </Paper>

            {/* Sizing Cases */}
            <Paper sx={sectionStyles}>
                <Typography variant="h6" sx={headerStyles}>
                    Sizing Cases
                </Typography>
                {psvSizingCases.length > 0 ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Scenario</TableCell>
                                    <TableCell>Method</TableCell>
                                    <TableCell align="right">Required Area (mm²)</TableCell>
                                    <TableCell>Selected Orifice</TableCell>
                                    <TableCell align="right">% Used</TableCell>
                                    <TableCell align="right">Inlet ΔP (kPa)</TableCell>
                                    <TableCell align="right">Backpressure (barg)</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {psvSizingCases.map((sizingCase) => {
                                    const scenario = psvScenarios.find(s => s.id === sizingCase.scenarioId);
                                    return (
                                        <TableRow key={sizingCase.id}>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>
                                                {scenario?.cause.replace('_', ' ') || 'N/A'}
                                            </TableCell>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>
                                                {sizingCase.method.replace('_', ' ')}
                                            </TableCell>
                                            <TableCell align="right">
                                                {sizingCase.outputs.requiredArea.toFixed(1)}
                                            </TableCell>
                                            <TableCell>
                                                {sizingCase.outputs.selectedOrifice} ({sizingCase.outputs.orificeArea} mm²)
                                            </TableCell>
                                            <TableCell align="right">
                                                {sizingCase.outputs.percentUsed.toFixed(1)}%
                                            </TableCell>
                                            <TableCell align="right">
                                                {sizingCase.outputs.inletPressureDrop?.toFixed(1) ?? '-'}
                                            </TableCell>
                                            <TableCell align="right">
                                                {sizingCase.inputs.backpressure?.toFixed(2) ?? '-'}
                                            </TableCell>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>
                                                <Chip
                                                    label={sizingCase.status}
                                                    size="small"
                                                    color={sizingCase.status === 'approved' ? 'success' : sizingCase.status === 'verified' ? 'info' : 'default'}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body2" color="text.secondary">No sizing cases calculated.</Typography>
                )}
            </Paper>

            {/* Notes */}
            <Paper sx={sectionStyles}>
                <Typography variant="h6" sx={headerStyles}>
                    Notes ({psvComments.length})
                </Typography>
                {psvComments.length > 0 ? (
                    <List dense disablePadding>
                        {psvComments.map((comment) => (
                            <ListItem key={comment.id} disablePadding sx={{ py: 0.5, alignItems: 'flex-start' }}>
                                <ListItemText
                                    primary={comment.body}
                                    secondary={`— ${getUserById(comment.createdBy)?.name || 'Unknown'}, ${new Date(comment.createdAt).toLocaleDateString()}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body2" color="text.secondary">No notes.</Typography>
                )}
            </Paper>

            {/* Attachments */}
            <Paper sx={sectionStyles}>
                <Typography variant="h6" sx={headerStyles}>
                    Attachments ({psvAttachments.length})
                </Typography>
                {psvAttachments.length > 0 ? (
                    <List dense disablePadding>
                        {psvAttachments.map((attachment) => (
                            <ListItem key={attachment.id} disablePadding sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 28 }}>
                                    <AttachFile fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={attachment.fileName}
                                    secondary={`${(attachment.size / 1024).toFixed(1)} KB • Uploaded ${new Date(attachment.createdAt).toLocaleDateString()}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body2" color="text.secondary">No attachments.</Typography>
                )}
            </Paper>

            {/* Footer */}
            <Box sx={{ textAlign: 'center', mt: 4, py: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                    Generated on: {new Date().toLocaleString()} • PSV Summary Document
                </Typography>
            </Box>
        </Box>
    );
}
