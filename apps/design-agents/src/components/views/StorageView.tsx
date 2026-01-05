"use client";

import {
    Box,
    Typography,
    Button,
    Paper,
    useTheme,
    Grid,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton
} from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';

export function StorageView() {
    const theme = useTheme();
    const { project, resetProject } = useDesignStore();

    const handleSave = () => {
        // In a real app, this would call the API
        console.log('Project saved to local storage');
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Save & Load Projects
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Manage your design project files and snapshots.
            </Typography>

            <Grid container spacing={4}>
                <Grid item xs={12} md={7}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(0, 0, 0, 0.2)'
                                : 'rgba(255, 255, 255, 0.5)',
                            backdropFilter: 'blur(4px)',
                            borderRadius: 2,
                            border: `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            Recent Projects
                        </Typography>
                        <List>
                            <ListItem
                                secondaryAction={
                                    <IconButton edge="end" aria-label="delete">
                                        <DeleteIcon />
                                    </IconButton>
                                }
                            >
                                <ListItemIcon>
                                    <DescriptionIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={project?.name || 'Current Project'}
                                    secondary={`Last modified: ${project?.lastModified ? new Date(project.lastModified).toLocaleString() : 'Just now'}`}
                                />
                                <Button variant="outlined" size="small" sx={{ mr: 2 }}>Load</Button>
                            </ListItem>
                            {/* Mock other project */}
                            <ListItem
                                secondaryAction={
                                    <IconButton edge="end" aria-label="delete">
                                        <DeleteIcon />
                                    </IconButton>
                                }
                            >
                                <ListItemIcon>
                                    <DescriptionIcon sx={{ opacity: 0.5 }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Ammonia Synthesis Loop"
                                    secondary="Created: 2025-12-28"
                                />
                                <Button variant="outlined" size="small" sx={{ mr: 2 }}>Load</Button>
                            </ListItem>
                        </List>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            fullWidth
                        >
                            Save Current Progress
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<FolderOpenIcon />}
                            fullWidth
                        >
                            Export as JSON File
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            size="large"
                            onClick={resetProject}
                            fullWidth
                        >
                            Start New Project
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}
