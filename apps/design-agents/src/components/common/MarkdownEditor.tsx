"use client";

import { Box, TextField, Tabs, Tab, Paper, useTheme, Button } from "@mui/material";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import UndoIcon from '@mui/icons-material/Undo';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    onCancel?: () => void;
    minHeight?: number | string;
    showRevert?: boolean;
}

export function MarkdownEditor({ value, onChange, onCancel, minHeight = 400, showRevert = true }: MarkdownEditorProps) {
    const theme = useTheme();
    const [mode, setMode] = useState<'edit' | 'preview'>('edit');
    const originalValueRef = useRef<string>(value);
    const [hasChanged, setHasChanged] = useState(false);

    // Track if value has changed from original
    useEffect(() => {
        setHasChanged(value !== originalValueRef.current);
    }, [value]);

    // Update original ref when value is set externally (e.g., after LLM run)
    const handleReset = () => {
        originalValueRef.current = value;
        setHasChanged(false);
    };

    const handleRevert = () => {
        onChange(originalValueRef.current);
        setHasChanged(false);
        if (onCancel) {
            onCancel();
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tabs value={mode} onChange={(_, v) => setMode(v)} aria-label="Markdown editor mode selection">
                    <Tab label="Edit" value="edit" sx={{ minWidth: 80 }} />
                    <Tab label="Preview" value="preview" sx={{ minWidth: 80 }} />
                </Tabs>
                {showRevert && hasChanged && (
                    <Button
                        size="small"
                        startIcon={<UndoIcon />}
                        onClick={handleRevert}
                        sx={{
                            color: theme.palette.text.secondary,
                            '&:hover': { color: theme.palette.warning.main }
                        }}
                    >
                        Revert Changes
                    </Button>
                )}
            </Box>

            {mode === 'edit' ? (
                <TextField
                    multiline
                    fullWidth
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    variant="outlined"
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            minHeight,
                            alignItems: 'flex-start',
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(0, 0, 0, 0.2)'
                                : 'rgba(255, 255, 255, 0.5)',
                        }
                    }}
                />
            ) : (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        minHeight,
                        backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(0, 0, 0, 0.2)'
                            : 'rgba(255, 255, 255, 0.5)',
                        border: `1px solid ${theme.palette.divider}`,
                        overflow: 'auto',
                        '& h1, & h2, & h3': { mt: 1.5, mb: 1 },
                        '& ul, & ol': { pl: 3 },
                        '& p': { mb: 1 }
                    }}
                >
                    {value ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                    ) : (
                        <Box sx={{ opacity: 0.5, fontStyle: 'italic' }}>Nothing to preview</Box>
                    )}
                </Paper>
            )}
        </Box>
    );
}
