"use client";

import { useMemo, useState } from "react";
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
    Card,
    CardContent,
    CardActions,
    useTheme,
    useMediaQuery,
    Grid,
    Stack,
    InputAdornment,
} from "@mui/material";
import { Add, Edit, Delete, Folder, Search, Shield, CheckCircle } from "@mui/icons-material";
import { areas, units, users } from "@/data/mockData";
import { Project } from "@/data/types";
import { glassCardStyles } from "./styles";
import { DeleteConfirmDialog, TableSortButton } from "./shared";
import { ProjectDialog } from "./dashboard/ProjectDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { usePsvStore } from "@/store/usePsvStore";
import { SortConfig, sortByGetter, toggleSortConfig } from "@/lib/sortUtils";
import { getWorkflowStatusColor, getWorkflowStatusLabel } from "@/lib/statusColors";

export function ProjectsTab() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const canEdit = useAuthStore((state) => state.canEdit());
    const canApprove = useAuthStore((state) => state.canApprove());
    const { addProject, updateProject, deleteProject } = usePsvStore();
    const projects = usePsvStore((state) => state.projects);
    const protectiveSystems = usePsvStore((state) => state.protectiveSystems);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [searchText, setSearchText] = useState('');
    type SortKey = 'code' | 'area' | 'phase' | 'status' | 'psvs' | 'lead' | 'startDate';
    const [sortConfig, setSortConfig] = useState<SortConfig<SortKey> | null>(null);

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
        return protectiveSystems.filter(ps => ps.projectIds?.includes(projectId)).length;
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

    const handleSort = (key: SortKey) => {
        setSortConfig((prev) => toggleSortConfig(prev, key));
    };

    const getSortValue = (project: Project, key: SortKey): string | number => {
        switch (key) {
            case 'code':
                return project.code.toLowerCase();
            case 'area': {
                const area = areas.find(a => a.id === project.areaId);
                return (area?.name || '').toLowerCase();
            }
            case 'phase':
                return project.phase;
            case 'status':
                return project.status;
            case 'psvs':
                return getPsvCount(project.id);
            case 'lead': {
                const lead = users.find(u => u.id === project.leadId);
                return (lead?.name || '').toLowerCase();
            }
            case 'startDate':
                return new Date(project.startDate).getTime();
            default:
                return '';
        }
    };

    const sortedProjects = useMemo(
        () => sortByGetter(filteredProjects, sortConfig, getSortValue),
        [filteredProjects, sortConfig]
    );

    const renderHeader = (label: string, key: SortKey) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {label}
            <TableSortButton
                label={label}
                active={sortConfig?.key === key}
                direction={sortConfig?.direction ?? 'asc'}
                onClick={() => handleSort(key)}
            />
        </Box>
    );

    const getPhaseColor = (phase: Project['phase']) => {
        switch (phase) {
            case 'design': return 'info';
            case 'construction': return 'warning';
            case 'commissioning': return 'secondary';
            case 'operation': return 'success';
            default: return 'default';
        }
    };

    const summaryCards = useMemo(() => {
        const reviewCount = projects.filter(project =>
            ['in_review', 'checked'].includes(project.status)
        ).length;
        const linkedPsvs = protectiveSystems.filter(psv => (psv.projectIds || []).length > 0).length;
        return [
            {
                label: 'Total Projects',
                value: projects.length,
                helper: 'Across all phases',
                icon: <Folder color="primary" />,
            },
            {
                label: 'In Review',
                value: reviewCount,
                helper: 'Awaiting approval',
                icon: <CheckCircle color="warning" />,
            },
            {
                label: 'PSVs Linked',
                value: linkedPsvs,
                helper: 'Tagged protective systems',
                icon: <Shield color="secondary" />,
            },
        ];
    }, [projects, protectiveSystems]);

    return (
        <Box>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
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

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {summaryCards.map(card => (
                    <Grid size={{ xs: 12, md: 4 }} key={card.label}>
                        <Paper sx={{ ...glassCardStyles, p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                {card.icon}
                                <Typography variant="body2" color="text.secondary">
                                    {card.label}
                                </Typography>
                            </Stack>
                            <Typography variant="h4" fontWeight={700}>
                                {card.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {card.helper}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Search Bar */}
            <Paper sx={{ ...glassCardStyles, p: 2, mb: 3 }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                >
                    <TextField
                        placeholder="Search by code, name, area, or lead..."
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
                </Stack>
            </Paper>

            {/* Mobile Card View */}
            {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredProjects.map((project) => {
                        const area = areas.find(a => a.id === project.areaId);
                        const unit = area ? units.find(u => u.id === area.unitId) : null;
                        const lead = users.find(u => u.id === project.leadId);
                        const psvCount = getPsvCount(project.id);

                        return (
                            <Card key={project.id} sx={{ ...glassCardStyles }}>
                                <CardContent sx={{ pb: 1 }}>
                                    {/* Code and Phase/Status */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                                            <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.1rem' }}>
                                                {project.code}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {project.name}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                                            <Chip
                                                label={project.phase}
                                                size="small"
                                                color={getPhaseColor(project.phase)}
                                                sx={{ textTransform: 'capitalize' }}
                                            />
                                            <Chip
                                                label={getWorkflowStatusLabel(project.status)}
                                                size="small"
                                                color={getWorkflowStatusColor(project.status)}
                                                sx={{ textTransform: 'capitalize' }}
                                            />
                                        </Box>
                                    </Box>

                                    {/* Details Grid */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Area
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {area?.name || 'N/A'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {unit?.code || ''}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                PSVs
                                            </Typography>
                                            <Chip
                                                label={`${psvCount} PSV${psvCount !== 1 ? 's' : ''}`}
                                                size="small"
                                                color={psvCount > 0 ? 'primary' : 'default'}
                                                sx={{ mt: 0.5 }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Lead
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {lead?.name || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Start Date
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {new Date(project.startDate).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                                {canEdit && (
                                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0, px: 2, pb: 1.5 }}>
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="medium"
                                                onClick={() => handleEdit(project)}
                                                sx={{ color: 'primary.main' }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="medium"
                                                color="error"
                                                onClick={() => handleDelete(project)}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </CardActions>
                                )}
                            </Card>
                        );
                    })}
                    {filteredProjects.length === 0 && (
                        <Paper sx={{ ...glassCardStyles, p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                {searchText ? 'No projects match your search.' : 'No projects found. Click "Add Project" to create one.'}
                            </Typography>
                        </Paper>
                    )}
                </Box>
            ) : (
                /* Desktop Table View */
                <Paper sx={{ ...glassCardStyles, p: 0 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{renderHeader('Code', 'code')}</TableCell>
                                    <TableCell>{renderHeader('Area', 'area')}</TableCell>
                                    <TableCell>{renderHeader('Phase', 'phase')}</TableCell>
                                    <TableCell>{renderHeader('Status', 'status')}</TableCell>
                                    <TableCell>{renderHeader('PSVs', 'psvs')}</TableCell>
                                    <TableCell>{renderHeader('Lead', 'lead')}</TableCell>
                                    <TableCell>{renderHeader('Start Date', 'startDate')}</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedProjects.map((project) => {
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
                                                    label={getWorkflowStatusLabel(project.status)}
                                                    size="small"
                                                    color={getWorkflowStatusColor(project.status)}
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
                                {sortedProjects.length === 0 && (
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
            )}

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
