"use client";

import { useState } from "react";
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Typography,
    Tooltip,
    TextField,
} from "@mui/material";
import { Add, Edit, Delete, Folder, Search } from "@mui/icons-material";
import { projects, areas, units, users } from "@/data/mockData";
import { Project } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog } from "./shared";
import { ProjectDialog } from "./dashboard/ProjectDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { getProtectiveSystemsByProject } from "@/data/mockData";

export function ProjectsTab() {
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addProject, updateProject, deleteProject } = usePsvStore();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [searchText, setSearchText] = useState('');

    const handleAdd = () => {
        setSelectedProject(null);
        setDialogOpen(true);
    };

    const handleEdit = (project: Project) => {
        setSelectedProject(project);
        setDialogOpen(true);
    };

    const handleDelete = (project: Project) => {
        setProjectToDelete(project);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (projectToDelete) {
            try {
                deleteProject(projectToDelete.id);
                setDeleteDialogOpen(false);
                setProjectToDelete(null);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleForceDelete = () => {
        if (projectToDelete) {
            console.log('Force delete project and all children:', projectToDelete.id);
            setDeleteDialogOpen(false);
            setProjectToDelete(null);
        }
    };

    const handleSave = (data: Omit<Project, 'id' | 'createdAt'>) => {
        if (selectedProject) {
            updateProject(selectedProject.id, data);
        } else {
            addProject(data);
        }
        setDialogOpen(false);
    };

    const getPsvCount = (projectId: string) => {
        return getProtectiveSystemsByProject(projectId).length;
    };

    // Filter projects based on search text
    const filteredProjects = projects.filter(project => {
        if (!searchText) return true;
        const search = searchText.toLowerCase();
        const area = areas.find(a => a.id === project.areaId);
        const lead = users.find(u => u.id === project.leadId);
        return (
            project.code.toLowerCase().includes(search) ||
            project.name.toLowerCase().includes(search) ||
            area?.name.toLowerCase().includes(search) ||
            lead?.name.toLowerCase().includes(search)
        );
    });

    const getPhaseColor = (phase: Project['phase']) => {
        switch (phase) {
            case 'design': return 'info';
            case 'construction': return 'warning';
            case 'commissioning': return 'secondary';
            case 'operation': return 'success';
            default: return 'default';
        }
    };

    const getStatusColor = (status: Project['status']) => {
        switch (status) {
            case 'draft': return 'default';
            case 'in_review': return 'info';
            case 'checked': return 'warning';
            case 'approved': return 'success';
            case 'issued': return 'primary';
            default: return 'default';
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Folder color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={600}>
                        Projects
                    </Typography>
                </Box>
                {canEdit && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAdd}
                    >
                        Add Project
                    </Button>
                )}
            </Box>

            {/* Search Bar */}
            <TextField
                placeholder="Search by code, name, area, or lead..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
                InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
            />

            {/* Table */}
            <Paper sx={{ ...glassCardStyles, p: 0 }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Code</TableCell>
                                <TableCell>Area</TableCell>
                                <TableCell>Phase</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>PSVs</TableCell>
                                <TableCell>Lead</TableCell>
                                <TableCell>Start Date</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredProjects.map((project) => {
                                const area = areas.find(a => a.id === project.areaId);
                                const unit = area ? units.find(u => u.id === area.unitId) : null;
                                const lead = users.find(u => u.id === project.leadId);
                                const psvCount = getPsvCount(project.id);

                                return (
                                    <TableRow
                                        key={project.id}
                                        hover
                                        sx={{
                                            '&:last-child td': {
                                                borderBottom: 0
                                            }
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {project.code}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {project.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {area?.name || 'N/A'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {unit?.code || ''}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={project.phase}
                                                size="small"
                                                color={getPhaseColor(project.phase)}
                                                sx={{ textTransform: 'capitalize' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={project.status.replace('_', ' ')}
                                                size="small"
                                                color={getStatusColor(project.status)}
                                                sx={{ textTransform: 'capitalize' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${psvCount} PSV${psvCount !== 1 ? 's' : ''}`}
                                                size="small"
                                                color={psvCount > 0 ? 'primary' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {lead?.name || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {new Date(project.startDate).toLocaleDateString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {canEdit && (
                                                <>
                                                    <Tooltip title="Edit">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEdit(project)}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDelete(project)}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredProjects.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {searchText ? 'No projects match your search.' : 'No projects found. Click "Add Project" to create one.'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Add/Edit Dialog */}
            {dialogOpen && (
                <ProjectDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSave={handleSave}
                    project={selectedProject}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {projectToDelete && (
                <DeleteConfirmDialog
                    open={deleteDialogOpen}
                    onClose={() => {
                        setDeleteDialogOpen(false);
                        setProjectToDelete(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    onForceDelete={handleForceDelete}
                    allowForceDelete={canApprove}
                    title="Delete Project"
                    itemName={projectToDelete.name}
                    children={[
                        { label: 'PSV', count: getPsvCount(projectToDelete.id) }
                    ]}
                />
            )}
        </Box>
    );
}
