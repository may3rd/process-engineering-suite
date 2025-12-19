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
    History,
    ClearAll,
    Close,
    ViewCompact,
    ViewAgenda,
} from "@mui/icons-material";
import { useState, useMemo, useEffect } from "react";
import { AuditLog, AuditAction, AuditEntityType } from "@/data/types";
import {
    getActionColor,
    getActionDescription,
    formatFieldName,
    formatFieldValue,
    clearAuditLogs,
} from "@/lib/auditLogService";
import { usePsvStore } from "@/store/usePsvStore";

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

export function GlobalActivityPage() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { setCurrentPage } = usePsvStore();

    const [searchText, setSearchText] = useState('');
    const [filterAction, setFilterAction] = useState<AuditAction | 'all'>('all');
    const [filterEntityType, setFilterEntityType] = useState<AuditEntityType | 'all'>('all');
    const [filterUser, setFilterUser] = useState<string | 'all'>('all');

    const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
    const [entityMenuAnchor, setEntityMenuAnchor] = useState<null | HTMLElement>(null);
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

    const PAGE_SIZE = 50;
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [totalLogs, setTotalLogs] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isCompactView, setIsCompactView] = useState(false);

    // Load initial logs (async - supports both localStorage and API)
    useEffect(() => {
        let isMounted = true;

        const fetchLogs = async () => {
            setIsLoading(true);
            try {
                const { getAuditLogsPagedAsync } = await import('@/lib/auditLogService');
                const { items, total } = await getAuditLogsPagedAsync({ limit: PAGE_SIZE, offset: 0 });
                if (isMounted) {
                    setLogs(items);
                    setTotalLogs(total);
                    setHasMore(items.length < total);
                }
            } catch (error) {
                console.error('Failed to fetch audit logs:', error);
                if (isMounted) {
                    setLogs([]);
                    setTotalLogs(0);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchLogs();

        return () => {
            isMounted = false;
        };
    }, []);

    const loadMore = async () => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        try {
            const { getAuditLogsPagedAsync } = await import('@/lib/auditLogService');
            const { items, total } = await getAuditLogsPagedAsync({
                limit: PAGE_SIZE,
                offset: logs.length
            });
            setLogs(prev => [...prev, ...items]);
            setTotalLogs(total);
            setHasMore(logs.length + items.length < total);
        } catch (error) {
            console.error('Failed to load more audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshLogs = async () => {
        setIsLoading(true);
        try {
            const { getAuditLogsPagedAsync } = await import('@/lib/auditLogService');
            const { items, total } = await getAuditLogsPagedAsync({ limit: PAGE_SIZE, offset: 0 });
            setLogs(items);
            setTotalLogs(total);
            setHasMore(items.length < total);
        } catch (error) {
            console.error('Failed to refresh audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearLogs = async () => {
        if (window.confirm("Are you sure you want to clear ALL audit logs? This cannot be undone.")) {
            clearAuditLogs();
            setLogs([]);
            setTotalLogs(0);
            setHasMore(false);
        }
    };


    // Extract unique users and entities for filters
    const users = useMemo(() => {
        const uniqueUsers = new Set<string>();
        logs.forEach(log => uniqueUsers.add(log.userName));
        return Array.from(uniqueUsers).sort();
    }, [logs]);

    const entityTypes: AuditEntityType[] = [
        'protective_system',
        'scenario',
        'sizing_case',
        'project',
        'revision',
        'comment',
        'attachment',
        'note',
        'todo'
    ];

    // Filter and search logs
    const filteredLogs = useMemo(() => {
        let result = logs;

        if (filterAction !== 'all') {
            result = result.filter(log => log.action === filterAction);
        }

        if (filterEntityType !== 'all') {
            result = result.filter(log => log.entityType === filterEntityType);
        }

        if (filterUser !== 'all') {
            result = result.filter(log => log.userName === filterUser);
        }

        if (searchText.trim()) {
            const query = searchText.toLowerCase();
            result = result.filter(log =>
                log.entityName.toLowerCase().includes(query) ||
                log.userName.toLowerCase().includes(query) ||
                log.description?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [logs, filterAction, filterEntityType, filterUser, searchText]);

    // Group by date
    const groupedLogs = useMemo(() => {
        return groupLogsByDate(filteredLogs);
    }, [filteredLogs]);

    return (
        <Box sx={{ pb: 4 }}>
            {/* Breadcrumbs */}

            {/* Header Area */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <History sx={{ fontSize: 32, color: 'primary.main' }} />
                        System Activity Log
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        Tracking all changes, updates, and collaborations across the system.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Tooltip title={isCompactView ? 'Switch to detailed view' : 'Switch to compact view'}>
                        <IconButton onClick={() => setIsCompactView(!isCompactView)}>
                            {isCompactView ? <ViewAgenda /> : <ViewCompact />}
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={refreshLogs}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<ClearAll />}
                        onClick={handleClearLogs}
                    >
                        Clear History
                    </Button>
                    <IconButton onClick={() => setCurrentPage(null)}>
                        <Close />
                    </IconButton>
                </Stack>

            </Box>

            {/* Filters Bar */}
            <Paper
                variant="outlined"
                sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                }}
            >
                <Box sx={{ flex: 1, minWidth: 200 }}>
                    <TextField
                        fullWidth
                        placeholder="Search logs by user, entity, or description..."
                        size="small"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search fontSize="small" />
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />
                </Box>

                <Stack direction="row" spacing={1}>
                    {/* Action Filter */}
                    <Button
                        size="small"
                        variant={filterAction === 'all' ? "outlined" : "contained"}
                        startIcon={<FilterList />}
                        endIcon={<ExpandMore />}
                        onClick={(e) => setActionMenuAnchor(e.currentTarget)}
                        sx={{ textTransform: 'none' }}
                    >
                        {filterAction === 'all' ? 'Any Action' : filterAction.replace('_', ' ')}
                    </Button>
                    <Menu
                        anchorEl={actionMenuAnchor}
                        open={Boolean(actionMenuAnchor)}
                        onClose={() => setActionMenuAnchor(null)}
                    >
                        <MenuItem onClick={() => { setFilterAction('all'); setActionMenuAnchor(null); }}>Any Action</MenuItem>
                        <MenuItem onClick={() => { setFilterAction('create'); setActionMenuAnchor(null); }}>Created</MenuItem>
                        <MenuItem onClick={() => { setFilterAction('update'); setActionMenuAnchor(null); }}>Updated</MenuItem>
                        <MenuItem onClick={() => { setFilterAction('delete'); setActionMenuAnchor(null); }}>Deleted</MenuItem>
                        <MenuItem onClick={() => { setFilterAction('status_change'); setActionMenuAnchor(null); }}>Status Changed</MenuItem>
                        <MenuItem onClick={() => { setFilterAction('calculate'); setActionMenuAnchor(null); }}>Calculated</MenuItem>
                    </Menu>

                    {/* Entity Filter */}
                    <Button
                        size="small"
                        variant={filterEntityType === 'all' ? "outlined" : "contained"}
                        startIcon={<FilterList />}
                        endIcon={<ExpandMore />}
                        onClick={(e) => setEntityMenuAnchor(e.currentTarget)}
                        sx={{ textTransform: 'none' }}
                    >
                        {filterEntityType === 'all' ? 'Any Entity' : filterEntityType.replace('_', ' ')}
                    </Button>
                    <Menu
                        anchorEl={entityMenuAnchor}
                        open={Boolean(entityMenuAnchor)}
                        onClose={() => setEntityMenuAnchor(null)}
                    >
                        <MenuItem onClick={() => { setFilterEntityType('all'); setEntityMenuAnchor(null); }}>Any Entity</MenuItem>
                        {entityTypes.map(type => (
                            <MenuItem key={type} onClick={() => { setFilterEntityType(type); setEntityMenuAnchor(null); }}>
                                {type.replace('_', ' ')}
                            </MenuItem>
                        ))}
                    </Menu>

                    {/* User Filter */}
                    <Button
                        size="small"
                        variant={filterUser === 'all' ? "outlined" : "contained"}
                        startIcon={<PersonOutline />}
                        endIcon={<ExpandMore />}
                        onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                        sx={{ textTransform: 'none' }}
                    >
                        {filterUser === 'all' ? 'Any User' : filterUser}
                    </Button>
                    <Menu
                        anchorEl={userMenuAnchor}
                        open={Boolean(userMenuAnchor)}
                        onClose={() => setUserMenuAnchor(null)}
                    >
                        <MenuItem onClick={() => { setFilterUser('all'); setUserMenuAnchor(null); }}>Any User</MenuItem>
                        {users.map(user => (
                            <MenuItem key={user} onClick={() => { setFilterUser(user); setUserMenuAnchor(null); }}>
                                {user}
                            </MenuItem>
                        ))}
                    </Menu>

                    {(filterAction !== 'all' || filterEntityType !== 'all' || filterUser !== 'all' || searchText) && (
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => {
                                setFilterAction('all');
                                setFilterEntityType('all');
                                setFilterUser('all');
                                setSearchText('');
                            }}
                        >
                            Reset
                        </Button>
                    )}
                </Stack>
            </Paper>

            {/* Results */}
            <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                {filteredLogs.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Typography variant="h6" color="text.secondary">
                            No logs found matching your criteria
                        </Typography>
                    </Box>
                ) : (
                    <List disablePadding>
                        {Array.from(groupedLogs.entries()).map(([dateGroup, groupLogs]) => (
                            <Box key={dateGroup}>
                                <Box sx={{
                                    px: 3,
                                    py: 1.5,
                                    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                    borderBottom: `1px solid ${theme.palette.divider}`
                                }}>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
                                        {dateGroup}
                                    </Typography>
                                </Box>
                                {groupLogs.map((log, index) => (
                                    <Box key={log.id}>
                                        {isCompactView ? (
                                            // Compact View: No icon, two-line layout
                                            <ListItem sx={{ px: 3, py: 1 }}>
                                                <ListItemText
                                                    primaryTypographyProps={{ component: 'div' }}
                                                    secondaryTypographyProps={{ component: 'div' }}
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="caption" component="span" color="text.secondary" sx={{ minWidth: 80 }}>
                                                                {formatRelativeTime(log.createdAt)}
                                                            </Typography>
                                                            <Typography variant="body2" component="span" color="primary.main" fontWeight={500}>
                                                                {log.entityName}
                                                            </Typography>
                                                            <Chip
                                                                label={log.action.replace('_', ' ')}
                                                                size="small"
                                                                color={getActionColor(log.action) as 'success' | 'info' | 'error' | 'warning' | 'default'}
                                                                sx={{ height: 18, fontSize: '0.65rem' }}
                                                            />
                                                            <Typography variant="body2" component="span" color="text.secondary">
                                                                by {log.userName}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    secondary={
                                                        (log.changes && log.changes.length > 0) ? (
                                                            <Typography variant="caption" component="span" color="text.secondary">
                                                                {log.changes.map(c => `${c.field}: ${formatFieldValue(c.oldValue)} → ${formatFieldValue(c.newValue)}`).join(', ')}
                                                            </Typography>
                                                        ) : log.description ? (
                                                            <Typography variant="caption" component="span" color="text.secondary">
                                                                {log.description}
                                                            </Typography>
                                                        ) : null
                                                    }
                                                />
                                            </ListItem>
                                        ) : (
                                            // Detailed View: With icon and full layout
                                            <ListItem alignItems="flex-start" sx={{ px: 3, py: 2 }}>
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: `${getActionColor(log.action)}.main` }}>
                                                        {getActionIcon(log.action)}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primaryTypographyProps={{ component: 'div' }}
                                                    secondaryTypographyProps={{ component: 'div' }}
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                            <Typography variant="body1" component="span" fontWeight={600}>
                                                                {log.userName}
                                                            </Typography>
                                                            <Typography variant="body1" component="span" color="text.secondary">
                                                                {getActionDescription(log.action, log.entityType)}
                                                            </Typography>
                                                            <Box sx={{ flex: 1 }} />
                                                            <Typography variant="caption" component="span" color="text.secondary">
                                                                {formatRelativeTime(log.createdAt)}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Box>
                                                            <Typography variant="body2" component="span" color="primary.main" fontWeight={500} sx={{ mb: 1, display: 'block' }}>
                                                                {log.entityName}
                                                            </Typography>

                                                            {log.changes && log.changes.length > 0 && (
                                                                <Box sx={{
                                                                    mt: 1,
                                                                    pl: 2,
                                                                    borderLeft: `3px solid ${theme.palette.divider}`,
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: 0.5
                                                                }}>
                                                                    {log.changes.map((change, i) => (
                                                                        <Typography key={i} variant="caption" component="div" color="text.secondary">
                                                                            <Box component="span" fontWeight={600}>{change.field.toUpperCase()}:</Box> {formatFieldValue(change.oldValue)} → {formatFieldValue(change.newValue)}
                                                                        </Typography>
                                                                    ))}
                                                                </Box>
                                                            )}

                                                            {log.description && !log.changes?.length && (
                                                                <Typography variant="body2" component="div" color="text.secondary">
                                                                    {log.description}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                        )}
                                        {index < groupLogs.length - 1 && <Divider component="li" variant={isCompactView ? "fullWidth" : "inset"} />}
                                    </Box>
                                ))}

                            </Box>
                        ))}
                    </List>
                )}

                {hasMore && (
                    <Box sx={{ p: 4, textAlign: 'center', borderTop: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Showing {logs.length} of {totalLogs} logs
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={loadMore}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : 'Load More Activity'}
                        </Button>
                    </Box>
                )}
            </Paper>
        </Box>
    );
}

