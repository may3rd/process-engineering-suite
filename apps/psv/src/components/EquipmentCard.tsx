"use client";

import { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    Checkbox,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    InputAdornment,
    ListItemButton,
    ListItemIcon,
} from "@mui/material";
import { Add, Link as LinkIcon, Delete } from "@mui/icons-material";
import { ProtectiveSystem } from "@/data/types";
import { usePsvStore } from "../store/usePsvStore";
import { glassCardStyles } from "./styles";
import { useAuthStore } from "@/store/useAuthStore";

interface EquipmentCardProps {
    psv: ProtectiveSystem;
}

export function EquipmentCard({ psv }: EquipmentCardProps) {
    const { equipmentLinkList, linkEquipment, unlinkEquipment, equipment: allEquipment, areas } = usePsvStore();
    const canEdit = useAuthStore((state) => state.canEdit());
    const [open, setOpen] = useState(false);
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);

    // Determine currently linked equipment IDs to exclude/disable them in list
    const linksForPsv = equipmentLinkList.filter(link => link.psvId === psv.id);
    const linkedEquipmentIds = linksForPsv.map(l => l.equipmentId);

    // Get PSV's unit through its area
    const psvArea = areas.find(a => a.id === psv.areaId);
    const psvUnitId = psvArea?.unitId;

    // Get all areas in the same unit
    const areasInSameUnit = psvUnitId
        ? areas.filter(a => a.unitId === psvUnitId).map(a => a.id)
        : [];

    // Filter equipment to only show items from areas in the same unit
    const equipmentInSameUnit = allEquipment.filter(eq => areasInSameUnit.includes(eq.areaId));
    const availableEquipment = equipmentInSameUnit.filter(eq => !linkedEquipmentIds.includes(eq.id));

    const handleLink = async () => {
        try {
            await Promise.all(
                selectedEquipmentIds.map(eqId =>
                    linkEquipment({ psvId: psv.id, equipmentId: eqId })
                )
            );
            setSelectedEquipmentIds([]);
            setOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const toggleSelection = (id: string) => {
        if (selectedEquipmentIds.includes(id)) {
            setSelectedEquipmentIds(selectedEquipmentIds.filter(sid => sid !== id));
        } else {
            setSelectedEquipmentIds([...selectedEquipmentIds, id]);
        }
    };

    return (
        <Paper
            sx={{
                ...glassCardStyles,
                p: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 6,
                },
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="primary">
                    Protected Equipment
                </Typography>
                {canEdit && (
                    <Button
                        startIcon={<LinkIcon />}
                        size="small"
                        onClick={() => setOpen(true)}
                        variant="outlined"
                        sx={{ borderColor: 'rgba(255,255,255,0.2)' }}
                    >
                        Link Equipment
                    </Button>
                )}
            </Box>

            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Tag</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Design Pressure</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {linksForPsv.map((link) => {
                            const eq = allEquipment.find(e => e.id === link.equipmentId);
                            if (!eq) return null;
                            return (
                                <TableRow key={link.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                    <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                                        {eq.tag}
                                    </TableCell>
                                    <TableCell>{eq.description}</TableCell>
                                    <TableCell>{eq.type}</TableCell>
                                    <TableCell>{eq.designPressure} barg</TableCell>
                                    <TableCell align="right">
                                        {canEdit && (
                                            <Tooltip title="Unlink">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={async () => {
                                                            try {
                                                                await unlinkEquipment(link.id);
                                                            } catch (error) {
                                                                console.error(error);
                                                            }
                                                        }}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {linksForPsv.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                                    No equipment linked.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Link Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Link Equipment</DialogTitle>
                <DialogContent dividers>
                    <List dense>
                        {availableEquipment.map((eq) => (
                            <ListItem
                                key={eq.id}
                                disablePadding
                            >
                                <ListItemButton onClick={() => toggleSelection(eq.id)}>
                                    <ListItemIcon>
                                        <Checkbox
                                            edge="start"
                                            checked={selectedEquipmentIds.indexOf(eq.id) !== -1}
                                            tabIndex={-1}
                                            disableRipple
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={`${eq.tag} - ${eq.description}`}
                                        secondary={`${eq.type} | Design P: ${eq.designPressure} barg`}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        {availableEquipment.length === 0 && (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                                No available equipment found to link.
                            </Typography>
                        )}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleLink}
                        variant="contained"
                        disabled={selectedEquipmentIds.length === 0}
                    >
                        Link Selected
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
