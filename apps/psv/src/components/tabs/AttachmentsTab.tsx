"use client";

import React, { useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    IconButton,
} from "@mui/material";
import {
    AttachFile,
    Description,
    Delete,
} from "@mui/icons-material";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Attachment } from "@/data/types";

export function AttachmentsTab() {
    const { selectedPsv, attachmentList, deleteAttachment, addAttachment } = usePsvStore();
    const { currentUser } = useAuthStore();
    const canEdit = useAuthStore((state) => state.canEdit());
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!selectedPsv) return null;

    const attachments = attachmentList.filter(a => a.protectiveSystemId === selectedPsv.id);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}?`)) {
            deleteAttachment(id);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        const attachment: Attachment = {
            id: `att-${Date.now()}`,
            protectiveSystemId: selectedPsv.id,
            fileUri: `/uploads/${selectedPsv.id}/${file.name}`,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            uploadedBy: currentUser?.id || '',
            createdAt: new Date().toISOString(),
        };

        try {
            await addAttachment(attachment);
        } catch (error) {
            console.error('Failed to upload file:', error);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Box>
            <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
            />

            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Attachments
                    </Typography>
                    {canEdit && (
                        <Button
                            variant="contained"
                            startIcon={<AttachFile />}
                            size="small"
                            onClick={handleUploadClick}
                        >
                            Upload File
                        </Button>
                    )}
                </Box>

                {attachments.length > 0 ? (
                    <List disablePadding>
                        {attachments.map((att) => (
                            <ListItem
                                key={att.id}
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    mb: 1,
                                }}
                                secondaryAction={
                                    canEdit ? (
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(att.id, att.fileName)}>
                                            <Delete />
                                        </IconButton>
                                    ) : null
                                }
                            >
                                <ListItemIcon>
                                    <Description color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={att.fileName}
                                    secondary={`${formatFileSize(att.size)} • Uploaded ${formatDate(att.createdAt)}`}
                                />
                                <Button size="small" sx={{ mr: 2 }}>Download</Button>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Paper variant="outlined" sx={{ py: 4, textAlign: 'center' }}>
                        <AttachFile sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No attachments</Typography>
                    </Paper>
                )}
            </Box>
        </Box >
    );
}
