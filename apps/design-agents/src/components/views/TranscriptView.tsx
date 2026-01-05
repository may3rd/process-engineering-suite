"use client";

import { useState } from "react";
import {
    Box,
    Typography,
    Paper,
    useTheme,
    IconButton,
    Chip,
    Collapse,
    Button,
    Tooltip,
    Alert,
} from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SettingsIcon from "@mui/icons-material/Settings";
import { LLMMessage } from "@/data/types";

export function TranscriptView() {
    const theme = useTheme();
    const { messages, clearMessages } = useDesignStore();
    const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedMessages((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const copyToClipboard = async (content: string, id: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getRoleIcon = (role: LLMMessage["role"]) => {
        switch (role) {
            case "user":
                return <PersonIcon fontSize="small" />;
            case "assistant":
                return <SmartToyIcon fontSize="small" />;
            case "system":
                return <SettingsIcon fontSize="small" />;
        }
    };

    const getRoleColor = (role: LLMMessage["role"]) => {
        switch (role) {
            case "user":
                return "primary";
            case "assistant":
                return "success";
            case "system":
                return "warning";
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const truncateContent = (content: string, maxLength = 200) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + "...";
    };

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                        LLM Transcript
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Debug view of all LLM interactions during agent execution.
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Chip
                        label={`${messages.length} messages`}
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                    {messages.length > 0 && (
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<DeleteOutlineIcon />}
                            onClick={clearMessages}
                        >
                            Clear
                        </Button>
                    )}
                </Box>
            </Box>

            {messages.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                    No messages yet. Run an agent to see the LLM transcript here.
                </Alert>
            ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {messages.map((message) => {
                        const isExpanded = expandedMessages.has(message.id);
                        const isLong = message.content.length > 200;

                        return (
                            <Paper
                                key={message.id}
                                elevation={0}
                                sx={{
                                    p: 2,
                                    backgroundColor:
                                        message.role === "user"
                                            ? theme.palette.mode === "dark"
                                                ? "rgba(33, 150, 243, 0.1)"
                                                : "rgba(33, 150, 243, 0.05)"
                                            : message.role === "assistant"
                                                ? theme.palette.mode === "dark"
                                                    ? "rgba(76, 175, 80, 0.1)"
                                                    : "rgba(76, 175, 80, 0.05)"
                                                : theme.palette.mode === "dark"
                                                    ? "rgba(255, 152, 0, 0.1)"
                                                    : "rgba(255, 152, 0, 0.05)",
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: 2,
                                }}
                            >
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <Chip
                                            icon={getRoleIcon(message.role)}
                                            label={message.role}
                                            size="small"
                                            color={getRoleColor(message.role)}
                                            variant="outlined"
                                        />
                                        {message.agentStep && (
                                            <Chip
                                                label={message.agentStep.replace(/_/g, " ")}
                                                size="small"
                                                variant="outlined"
                                            />
                                        )}
                                        {message.model && (
                                            <Typography variant="caption" color="text.secondary">
                                                {message.model}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        {message.tokenCount && (
                                            <Typography variant="caption" color="text.secondary">
                                                {message.tokenCount} tokens
                                            </Typography>
                                        )}
                                        <Typography variant="caption" color="text.secondary">
                                            {formatTimestamp(message.timestamp)}
                                        </Typography>
                                        <Tooltip title={copiedId === message.id ? "Copied!" : "Copy"}>
                                            <IconButton
                                                size="small"
                                                onClick={() => copyToClipboard(message.content, message.id)}
                                            >
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        fontFamily: "monospace",
                                        fontSize: "0.85rem",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        color: theme.palette.text.primary,
                                    }}
                                >
                                    {isLong && !isExpanded
                                        ? truncateContent(message.content)
                                        : message.content}
                                </Box>

                                {isLong && (
                                    <Button
                                        size="small"
                                        onClick={() => toggleExpand(message.id)}
                                        startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        sx={{ mt: 1 }}
                                    >
                                        {isExpanded ? "Show less" : "Show more"}
                                    </Button>
                                )}
                            </Paper>
                        );
                    })}
                </Box>
            )}
        </Box>
    );
}
