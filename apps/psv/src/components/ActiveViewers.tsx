"use client";

/**
 * ActiveViewers Component
 * 
 * Displays avatars of users currently viewing/editing the same entity.
 * Shows a badge indicating if users are editing vs just viewing.
 */

import {
    Box,
    Avatar,
    AvatarGroup,
    Tooltip,
    Typography,
    Chip,
    Badge,
    useTheme,
} from "@mui/material";
import { Edit, Visibility } from "@mui/icons-material";
import { useEffect, useMemo } from "react";
import { usePresenceStore, PresenceEntry } from "@/store/usePresenceStore";
import { useAuthStore } from "@/store/useAuthStore";

interface ActiveViewersProps {
    entityType: PresenceEntry['entityType'];
    entityId: string;
    isEditing?: boolean;
    maxAvatars?: number;
}

// Get initials from name
function getInitials(name: string): string {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Get avatar color based on user id
function getAvatarColor(userId: string): string {
    const colors = [
        '#0284c7', // sky-600
        '#7c3aed', // violet-600
        '#db2777', // pink-600
        '#ea580c', // orange-600
        '#16a34a', // green-600
        '#dc2626', // red-600
        '#2563eb', // blue-600
        '#9333ea', // purple-600
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

export function ActiveViewers({
    entityType,
    entityId,
    isEditing = false,
    maxAvatars = 4,
}: ActiveViewersProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const currentUser = useAuthStore(s => s.currentUser);
    const { setMyPresence, clearMyPresence, refreshPresence, presenceList } = usePresenceStore();

    // Load presence data immediately on mount
    useEffect(() => {
        refreshPresence();
    }, [refreshPresence]);

    // Listen for localStorage changes from OTHER tabs/windows
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'psv_user_presence') {
                console.log('[ActiveViewers] Storage changed in another tab, refreshing...');
                refreshPresence();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [refreshPresence]);

    // Set my presence when component mounts
    useEffect(() => {
        if (currentUser) {
            setMyPresence(entityType, entityId, currentUser, isEditing);
        }

        // Clear presence on unmount
        return () => {
            clearMyPresence();
        };
    }, [entityType, entityId, currentUser, isEditing, setMyPresence, clearMyPresence]);

    // Update presence when editing state changes
    useEffect(() => {
        if (currentUser) {
            setMyPresence(entityType, entityId, currentUser, isEditing);
        }
    }, [isEditing, entityType, entityId, currentUser, setMyPresence]);

    // Poll for presence updates - every 3 seconds for faster detection
    useEffect(() => {
        const interval = setInterval(() => {
            refreshPresence();
            // Re-register my presence to keep it alive
            if (currentUser) {
                setMyPresence(entityType, entityId, currentUser, isEditing);
            }
        }, 3000); // Every 3 seconds for faster detection

        return () => clearInterval(interval);
    }, [refreshPresence, currentUser, entityType, entityId, isEditing, setMyPresence]);



    // Get other viewers (exclude self)
    const otherViewers = useMemo(() => {
        if (!currentUser) return [];
        return presenceList.filter(
            p => p.entityType === entityType &&
                p.entityId === entityId &&
                p.userId !== currentUser.id
        );
    }, [presenceList, entityType, entityId, currentUser]);

    // Don't render if no other viewers
    if (otherViewers.length === 0) return null;

    const editingCount = otherViewers.filter(v => v.isEditing).length;
    const viewingCount = otherViewers.length - editingCount;



    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AvatarGroup
                max={maxAvatars}
                sx={{
                    '& .MuiAvatar-root': {
                        width: 28,
                        height: 28,
                        fontSize: '0.75rem',
                        border: `2px solid ${isDark ? '#1e293b' : '#fff'}`,
                    },
                }}
            >
                {otherViewers.slice(0, maxAvatars).map((viewer) => (
                    <Tooltip
                        key={viewer.userId}
                        title={
                            <Box>
                                <Typography variant="body2" fontWeight={600}>
                                    {viewer.userName}
                                </Typography>
                                <Typography variant="caption" color="inherit">
                                    {viewer.isEditing ? 'Editing' : 'Viewing'}
                                </Typography>
                            </Box>
                        }
                        arrow
                    >
                        <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            badgeContent={
                                viewer.isEditing ? (
                                    <Edit sx={{
                                        fontSize: 10,
                                        color: '#fff',
                                        bgcolor: '#f59e0b',
                                        borderRadius: '50%',
                                        p: 0.25,
                                    }} />
                                ) : null
                            }
                        >
                            <Avatar
                                src={viewer.avatarUrl}
                                sx={{
                                    bgcolor: getAvatarColor(viewer.userId),
                                }}
                            >
                                {viewer.userInitials || getInitials(viewer.userName)}
                            </Avatar>
                        </Badge>
                    </Tooltip>
                ))}
            </AvatarGroup>

            {/* Summary chip */}
            {(editingCount > 0 || viewingCount > 0) && (
                <Chip
                    size="small"
                    icon={editingCount > 0 ? <Edit /> : <Visibility />}
                    label={
                        editingCount > 0
                            ? `${editingCount} editing`
                            : `${viewingCount} viewing`
                    }
                    color={editingCount > 0 ? 'warning' : 'default'}
                    variant="outlined"
                    sx={{
                        height: 24,
                        '& .MuiChip-label': { fontSize: '0.7rem' },
                        '& .MuiChip-icon': { fontSize: '0.85rem' },
                    }}
                />
            )}
        </Box>
    );
}
