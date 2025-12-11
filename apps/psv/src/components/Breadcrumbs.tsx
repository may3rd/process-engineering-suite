"use client";

import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, useTheme } from "@mui/material";
import { NavigateNext, Home } from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";

export function Breadcrumbs() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const {
        selectedCustomer,
        selectedPlant,
        selectedUnit,
        selectedArea,
        selectedProject,
        selectedPsv,
        selectCustomer,
        selectPlant,
        selectUnit,
        selectArea,
        selectProject,
        setCurrentPage,
        clearSelection,
    } = usePsvStore();

    const linkStyle = {
        cursor: 'pointer',
        color: 'primary.main',
        textDecoration: 'none',
        '&:hover': {
            textDecoration: 'underline',
        },
    };

    return (
        <MuiBreadcrumbs
            separator={<NavigateNext fontSize="small" sx={{ color: 'text.secondary' }} />}
            sx={{
                py: 1.5,
                px: 2,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                borderRadius: "14px",
                backdropFilter: 'blur(8px)',
            }}
        >
            <Link
                onClick={() => {
                    clearSelection();
                    setCurrentPage(null);
                }}
                sx={linkStyle}
                underline="hover"
            >
                <Home sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                Home
            </Link>

            {selectedCustomer && (
                selectedPlant ? (
                    <Link
                        onClick={() => selectCustomer(selectedCustomer.id)}
                        sx={linkStyle}
                        underline="hover"
                    >
                        {selectedCustomer.name}
                    </Link>
                ) : (
                    <Typography color="text.primary" fontWeight={500}>
                        {selectedCustomer.name}
                    </Typography>
                )
            )}

            {selectedPlant && (
                selectedUnit ? (
                    <Link
                        onClick={() => selectPlant(selectedPlant.id)}
                        sx={linkStyle}
                        underline="hover"
                    >
                        {selectedPlant.name}
                    </Link>
                ) : (
                    <Typography color="text.primary" fontWeight={500}>
                        {selectedPlant.name}
                    </Typography>
                )
            )}

            {selectedUnit && (
                selectedArea ? (
                    <Link
                        onClick={() => selectUnit(selectedUnit.id)}
                        sx={linkStyle}
                        underline="hover"
                    >
                        {selectedUnit.name}
                    </Link>
                ) : (
                    <Typography color="text.primary" fontWeight={500}>
                        {selectedUnit.name}
                    </Typography>
                )
            )}

            {selectedArea && (
                selectedProject ? (
                    <Link
                        onClick={() => selectArea(selectedArea.id)}
                        sx={linkStyle}
                        underline="hover"
                    >
                        {selectedArea.name}
                    </Link>
                ) : (
                    <Typography color="text.primary" fontWeight={500}>
                        {selectedArea.name}
                    </Typography>
                )
            )}

            {selectedProject && (
                selectedPsv ? (
                    <Link
                        onClick={() => selectProject(selectedProject.id)}
                        sx={linkStyle}
                        underline="hover"
                    >
                        {selectedProject.name}
                    </Link>
                ) : (
                    <Typography color="text.primary" fontWeight={500}>
                        {selectedProject.name}
                    </Typography>
                )
            )}

            {selectedPsv && (
                <Typography color="text.primary" fontWeight={500}>
                    {selectedPsv.tag}
                </Typography>
            )}
        </MuiBreadcrumbs>
    );
}
