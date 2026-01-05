"use client";

import { Box, TextField, Tabs, Tab, Paper, useTheme } from "@mui/material";
import { useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    minHeight?: number | string;
}

export function MarkdownEditor({ value, onChange, minHeight = 400 }: MarkdownEditorProps) {
    const theme = useTheme();
    const [mode, setMode] = useState<'edit' | 'preview'>('edit');

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                <Tabs value={mode} onChange={(_, v) => setMode(v)}>
                    <Tab label="Edit" value="edit" sx={{ minWidth: 80 }} />
                    <Tab label="Preview" value="preview" sx={{ minWidth: 80 }} />
                </Tabs>
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
