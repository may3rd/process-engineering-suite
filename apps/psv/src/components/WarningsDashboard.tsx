/**
 * Warnings Dashboard Component
 * 
 * Displays calculation warnings from sizing,  hydraulic, and validation checks
 * Organized by severity with collapse/expand functionality
 */

import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Alert,
    AlertTitle,
    Collapse,
    IconButton,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
} from '@mui/material';
import {
    ExpandMore,
    ExpandLess,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { Warning, WarningSeverity } from '@/data/types';

interface WarningsDashboardProps {
    warnings: Warning[];
    onWarningClick?: (warning: Warning) => void;
}

export function WarningsDashboard({ warnings, onWarningClick }: WarningsDashboardProps) {
    const [expanded, setExpanded] = useState(true);

    // Group warnings by severity
    const errors = warnings.filter(w => w.severity === 'error');
    const warningsFiltered = warnings.filter(w => w.severity === 'warning');
    const infos = warnings.filter(w => w.severity === 'info');

    const getSeverityIcon = (severity: WarningSeverity) => {
        switch (severity) {
            case 'error':
                return <ErrorIcon color="error" />;
            case 'warning':
                return <WarningIcon color="warning" />;
            case 'info':
                return <InfoIcon color="info" />;
        }
    };

    const getSeverityColor = (severity: WarningSeverity): "error" | "warning" | "info" | "success" => {
        switch (severity) {
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
        }
    };

    const getSourceLabel = (source: string) => {
        switch (source) {
            case 'hydraulic':
                return 'Hydraulic';
            case 'sizing':
                return 'Sizing';
            case 'scenario':
                return 'Scenario';
            case 'validation':
                return 'Validation';
            default:
                return source;
        }
    };

    if (warnings.length === 0) {
        return (
            <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2 }}>
                <AlertTitle>All Clear</AlertTitle>
                No warnings or errors detected in calculations.
            </Alert>
        );
    }

    return (
        <Card
            sx={{
                mb: 2,
                border: 1,
                borderColor: errors.length > 0 ? 'error.main' : warningsFiltered.length > 0 ? 'warning.main' : 'info.main',
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" fontWeight={600}>
                            Calculation Warnings
                        </Typography>
                        <Chip
                            size="small"
                            label={warnings.length}
                            color={errors.length > 0 ? 'error' : warningsFiltered.length > 0 ? 'warning' : 'info'}
                        />
                        {errors.length > 0 && (
                            <Chip
                                size="small"
                                icon={<ErrorIcon />}
                                label={`${errors.length} Error${errors.length > 1 ? 's' : ''}`}
                                color="error"
                                variant="outlined"
                            />
                        )}
                        {warningsFiltered.length > 0 && (
                            <Chip
                                size="small"
                                icon={<WarningIcon />}
                                label={`${warningsFiltered.length} Warning${warningsFiltered.length > 1 ? 's' : ''}`}
                                color="warning"
                                variant="outlined"
                            />
                        )}
                    </Box>
                    <IconButton onClick={() => setExpanded(!expanded)} size="small">
                        {expanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Box>

                <Collapse in={expanded}>
                    <List disablePadding sx={{ mt: 2 }}>
                        {warnings.map((warning) => (
                            <ListItem
                                key={warning.id}
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    mb: 1,
                                    cursor: onWarningClick ? 'pointer' : 'default',
                                    '&:hover': onWarningClick ? { bgcolor: 'action.hover' } : {},
                                }}
                                onClick={() => onWarningClick?.(warning)}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    {getSeverityIcon(warning.severity)}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" fontWeight={500}>
                                                {warning.message}
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={getSourceLabel(warning.source)}
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                            {warning.location && (
                                                <Typography variant="caption" color="text.secondary">
                                                    • {warning.location}
                                                </Typography>
                                            )}
                                        </Box>
                                    }
                                    secondary={
                                        warning.details || warning.value ? (
                                            <Box sx={{ mt: 0.5 }}>
                                                {warning.details && (
                                                    <Typography variant="caption" display="block">
                                                        {warning.details}
                                                    </Typography>
                                                )}
                                                {warning.value && warning.threshold && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Value: {warning.value} | Limit: {warning.threshold}
                                                    </Typography>
                                                )}
                                            </Box>
                                        ) : null
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                </Collapse>
            </CardContent>
        </Card>
    );
}
