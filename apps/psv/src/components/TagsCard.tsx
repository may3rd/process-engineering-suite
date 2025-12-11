"use client";

import { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Chip,
    TextField,
    InputAdornment,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { ProtectiveSystem } from "@/data/types";
import { usePsvStore } from "../store/usePsvStore";
import { glassCardStyles } from "./styles";
import { useAuthStore } from "@/store/useAuthStore";

interface TagsCardProps {
    psv: ProtectiveSystem;
}

export function TagsCard({ psv }: TagsCardProps) {
    const { addPsvTag, removePsvTag } = usePsvStore();
    const canEdit = useAuthStore((state) => state.canEdit());
    const [isAdding, setIsAdding] = useState(false);
    const [newTag, setNewTag] = useState("");

    const handleAdd = () => {
        if (newTag.trim()) {
            addPsvTag(psv.id, newTag.trim());
            setNewTag("");
            setIsAdding(false);
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
                    Tags
                </Typography>
                {canEdit && !isAdding && (
                    <IconButton size="small" onClick={() => setIsAdding(true)}>
                        <Add fontSize="small" />
                    </IconButton>
                )}
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {psv.tags.map((tag) => (
                    <Chip
                        key={tag}
                        label={tag}
                        onDelete={canEdit ? () => removePsvTag(psv.id, tag) : undefined}
                        size="small"
                        color={tag.toLowerCase().includes('critical') ? 'error' : 'default'}
                        variant="outlined"
                        sx={{ borderRadius: 1.5 }}
                    />
                ))}

                {isAdding && (
                    <TextField
                        size="small"
                        autoFocus
                        placeholder="New tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onBlur={() => {
                            if (!newTag.trim()) setIsAdding(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdd();
                            if (e.key === 'Escape') setIsAdding(false);
                        }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton size="small" edge="end" onClick={handleAdd}>
                                        <Add fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                            style: { fontSize: '0.8125rem' } // Match chip size
                        }}
                        sx={{ width: 150 }}
                    />
                )}

                {psv.tags.length === 0 && !isAdding && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No tags added.
                    </Typography>
                )}
            </Box>
        </Paper>
    );
}
