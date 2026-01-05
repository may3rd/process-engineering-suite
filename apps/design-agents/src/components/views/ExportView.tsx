"use client";

import {
    Box,
    Typography,
    Button,
    Paper,
    useTheme,
    Grid,
    Card,
    CardContent,
    CardActions
} from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';

export function ExportView() {
    const theme = useTheme();
    const { project } = useDesignStore();

    const handleExport = (format: string) => {
        // Real implementation would call backend export helpers
        console.log(`Exporting as ${format}`);
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Export & Reporting
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Generate professional reports and engineering data sheets.
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card
                        elevation={0}
                        sx={{
                            height: '100%',
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(0, 0, 0, 0.2)'
                                : 'rgba(255, 255, 255, 0.5)',
                            backdropFilter: 'blur(4px)',
                            border: `1px solid ${theme.palette.divider}`,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <CardContent sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'error.main' }}>
                                <PictureAsPdfIcon sx={{ mr: 1, fontSize: 32 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>PDF Dossier</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Generate a full design package including requirements, research, sizing results, and safety reports.
                            </Typography>
                        </CardContent>
                        <CardActions sx={{ p: 2 }}>
                            <Button fullWidth variant="outlined" onClick={() => handleExport('pdf')}>Generate PDF</Button>
                        </CardActions>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card
                        elevation={0}
                        sx={{
                            height: '100%',
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(0, 0, 0, 0.2)'
                                : 'rgba(255, 255, 255, 0.5)',
                            backdropFilter: 'blur(4px)',
                            border: `1px solid ${theme.palette.divider}`,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <CardContent sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'primary.main' }}>
                                <DescriptionIcon sx={{ mr: 1, fontSize: 32 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Word Document</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Export to an editable .docx file using the enterprise design template.
                            </Typography>
                        </CardContent>
                        <CardActions sx={{ p: 2 }}>
                            <Button fullWidth variant="outlined" onClick={() => handleExport('docx')}>Generate Word</Button>
                        </CardActions>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card
                        elevation={0}
                        sx={{
                            height: '100%',
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(0, 0, 0, 0.2)'
                                : 'rgba(255, 255, 255, 0.5)',
                            backdropFilter: 'blur(4px)',
                            border: `1px solid ${theme.palette.divider}`,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <CardContent sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'success.main' }}>
                                <TableChartIcon sx={{ mr: 1, fontSize: 32 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Excel Data Kit</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Export consolidated equipment and stream lists as a native .xlsx file for third-party tools.
                            </Typography>
                        </CardContent>
                        <CardActions sx={{ p: 2 }}>
                            <Button fullWidth variant="outlined" onClick={() => handleExport('xlsx')}>Generate Excel</Button>
                        </CardActions>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
