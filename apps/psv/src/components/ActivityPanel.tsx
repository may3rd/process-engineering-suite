"use client";

import {
    Box,
    Typography,
    Chip,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    Button,
    useTheme,
    TextField,
    InputAdornment,
    MenuItem,
    Menu,
    Stack,
    IconButton,
    Tooltip,
} from "@mui/material";
import {
    Add,
    Edit,
    Delete,
    ChangeCircle,
    Calculate,
    Search,
    FilterList,
    Refresh,
    ExpandMore,
    PersonOutline,
} from "@mui/icons-material";
import { useState, useMemo, useEffect } from "react";
import { AuditLog, AuditAction, AuditEntityType } from "@/data/types";
import {
    getActionColor,
    getActionDescription,
    formatFieldName,
    formatFieldValue,
} from "@/lib/auditLogService";

interface ActivityPanelProps {
    // Optional: filter to a specific entity
    entityType?: AuditEntityType;
    entityId?: string;
    // Optional: filter to a specific project
    projectId?: string;
    // Optional: title override
    title?: string;
    // Max height (for embedded use)
    maxHeight?: number | string;
}

// Action icons
function getActionIcon(action: AuditAction) {
    switch (action) {
        case 'create': return <Add fontSize="small" />;
        case 'update': return <Edit fontSize="small" />;
        case 'delete': return <Delete fontSize="small" />;
        case 'status_change': return <ChangeCircle fontSize="small" />;
        case 'calculate': return <Calculate fontSize="small" />;
        default: return <Edit fontSize="small" />;
    }
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Group logs by date
function groupLogsByDate(logs: AuditLog[]): Map<string, AuditLog[]> {
    const groups = new Map<string, AuditLog[]>();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    for (const log of logs) {
        const logDate = new Date(log.createdAt).toDateString();
        let groupKey: string;

        if (logDate === today) {
            groupKey = 'Today';
        } else if (logDate === yesterday) {
            groupKey = 'Yesterday';
        } else {
            groupKey = new Date(log.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        }

        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(log);
    }

    return groups;
}

export function ActivityPanel({
    entityType,
    entityId,
    projectId,
    title = "Activity Log",
    maxHeight,
}: ActivityPanelProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const [searchText, setSearchText] = useState('');
    const [filterAction, setFilterAction] = useState<AuditAction | 'all'>('all');
    const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
    const [displayCount, setDisplayCount] = useState(20);
    const [logs, setLogs] = useState<AuditLog[]>([]);

    // Load logs (async - supports both localStorage and API)
    useEffect(() => {
        let isMounted = true;

        const fetchLogs = async () => {
            try {
                // Use the async version which respects USE_LOCAL_STORAGE
                const { getAuditLogsAsync } = await import('@/lib/auditLogService');
                let fetchedLogs = await getAuditLogsAsync({
                    entityType: entityType,
                    entityId: entityId,
                    limit: 100,  // Fetch up to 100 logs
                });

                // Apply project filter if specified (client-side filtering)
                if (projectId) {
                    fetchedLogs = fetchedLogs.filter(log => log.projectId === projectId);
                }

                if (isMounted) {
                    setLogs(fetchedLogs);
                }
            } catch (error) {
                console.error('Failed to fetch audit logs:', error);
                if (isMounted) {
                    setLogs([]);
                }
            }
        };

        fetchLogs();

        return () => {
            isMounted = false;
        };
    }, [entityType, entityId, projectId]);

    // Refresh logs
    const refreshLogs = async () => {
        try {
            const { getAuditLogsAsync } = await import('@/lib/auditLogService');
            let fetchedLogs = await getAuditLogsAsync({
                entityType: entityType,
                entityId: entityId,
                limit: 100,
            });

            if (projectId) {
                fetchedLogs = fetchedLogs.filter(log => log.projectId === projectId);
            }

            setLogs(fetchedLogs);
        } catch (error) {
            console.error('Failed to refresh audit logs:', error);
        }
    };

    // Filter and search logs
    const filteredLogs = useMemo(() => {
        let result = logs;

        // Filter by action
        if (filterAction !== 'all') {
            result = result.filter(log => log.action === filterAction);
        }

        // Search
        if (searchText.trim()) {
            const query = searchText.toLowerCase();
            result = result.filter(log =>
                log.entityName.toLowerCase().includes(query) ||
                log.userName.toLowerCase().includes(query) ||
                log.description?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [logs, filterAction, searchText]);

    // Group by date
    const groupedLogs = useMemo(() => {
        return groupLogsByDate(filteredLogs.slice(0, displayCount));
    }, [filteredLogs, displayCount]);

    const actionOptions: { value: AuditAction | 'all'; label: string }[] = [
        { value: 'all', label: 'All Actions' },
        { value: 'create', label: 'Created' },
        { value: 'update', label: 'Updated' },
        { value: 'delete', label: 'Deleted' },
        { value: 'status_change', label: 'Status Changed' },
        { value: 'calculate', label: 'Calculated' },
    ];

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
                flexWrap: 'wrap',
                gap: 1,
            }}>
                <Typography variant="h6" fontWeight={600}>
                    {title}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="Refresh">
                        <IconButton size="small" onClick={refreshLogs}>
                            <Refresh fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* Search and Filter */}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                    placeholder="Search activity..."
                    size="small"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    sx={{ flex: 1 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                        }
                    }}
                />
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FilterList />}
                    endIcon={<ExpandMore />}
                    onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                    sx={{ textTransform: 'none', minWidth: 100 }}
                >
                    {actionOptions.find(o => o.value === filterAction)?.label || 'Filter'}
                </Button>
                <Menu
                    anchorEl={filterMenuAnchor}
                    open={Boolean(filterMenuAnchor)}
                    onClose={() => setFilterMenuAnchor(null)}
                >
                    {actionOptions.map(opt => (
                        <MenuItem
                            key={opt.value}
                            selected={filterAction === opt.value}
                            onClick={() => {
                                setFilterAction(opt.value);
                                setFilterMenuAnchor(null);
                            }}
                        >
                            {opt.label}
                        </MenuItem>
                    ))}
                </Menu>
            </Stack>

            {/* Activity List */}
            <Paper
                variant="outlined"
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    maxHeight: maxHeight,
                    borderRadius: '8px',
                }}
            >
                {filteredLogs.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            No activity to show
                        </Typography>
                    </Box>
                ) : (
                    <List disablePadding>
                        {Array.from(groupedLogs.entries()).map(([dateGroup, groupLogs], groupIndex) => (
                            <Box key={dateGroup}>
                                {/* Date Group Header */}
                                <Box
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1,
                                    }}
                                >
                                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                                        {dateGroup}
                                    </Typography>
                                </Box>

                                {/* Logs in this group */}
                                {groupLogs.map((log, logIndex) => (
                                    <ListItem
                                        key={log.id}
                                        alignItems="flex-start"
                                        sx={{
                                            borderBottom: logIndex < groupLogs.length - 1
                                                ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                                                : undefined,
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    bgcolor: `${getActionColor(log.action)}.main`,
                                                    fontSize: '1rem',
                                                }}
                                            >
                                                {getActionIcon(log.action)}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primaryTypographyProps={{ component: 'div' }}
                                            secondaryTypographyProps={{ component: 'div' }}
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <Typography variant="body2" component="span" fontWeight={600}>
                                                        {log.userName}
                                                    </Typography>
                                                    <Typography variant="body2" component="span" color="text.secondary">
                                                        {getActionDescription(log.action, log.entityType)}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        component="span"
                                                        color="text.secondary"
                                                        sx={{ ml: 'auto', flexShrink: 0 }}
                                                    >
                                                        {formatRelativeTime(log.createdAt)}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                                                    <Typography variant="body2" component="span" color="primary.main" fontWeight={500}>
                                                        {log.entityName}
                                                    </Typography>
                                                    {log.changes && log.changes.length > 0 && (
                                                        <Box component="span" sx={{ display: 'block', mt: 0.5, pl: 1, borderLeft: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                                                            {log.changes.slice(0, 3).map((change, i) => (
                                                                <Typography key={i} variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                                                    {formatFieldName(change.field)}: {formatFieldValue(change.oldValue)} → {formatFieldValue(change.newValue)}
                                                                </Typography>
                                                            ))}
                                                            {log.changes.length > 3 && (
                                                                <Typography variant="caption" component="span" color="text.secondary">
                                                                    +{log.changes.length - 3} more changes
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    )}
                                                    {log.description && !log.changes?.length && (
                                                        <Typography variant="caption" component="span" color="text.secondary">
                                                            {log.description}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </Box>
                        ))}

                        {/* Load More */}
                        {filteredLogs.length > displayCount && (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => setDisplayCount(prev => prev + 20)}
                                >
                                    Load more ({filteredLogs.length - displayCount} remaining)
                                </Button>
                            </Box>
                        )}
                    </List>
                )}
            </Paper>
        </Box>
    );
}
