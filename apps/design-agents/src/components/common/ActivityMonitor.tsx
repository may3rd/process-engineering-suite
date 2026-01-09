"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography, Paper, IconButton, Collapse, useTheme } from "@mui/material";
import { useDesignStore } from "@/store/useDesignStore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TerminalIcon from "@mui/icons-material/Terminal";

export function ActivityMonitor() {
  const theme = useTheme();
  const { activityLogs, clearActivityLogs, isStreaming } = useDesignStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-expand when streaming starts
  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logsEndRef.current && isExpanded) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activityLogs, isExpanded]);

  if (activityLogs.length === 0 && !isStreaming) {
    return null;
  }

  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: isExpanded ? 400 : "auto",
        maxHeight: 500,
        zIndex: 1200,
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: theme.palette.mode === "dark" 
          ? "rgba(15, 23, 42, 0.9)" 
          : "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${theme.palette.divider}`,
        transition: "all 0.3s ease",
      }}
    >
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: isExpanded ? `1px solid ${theme.palette.divider}` : "none",
          backgroundColor: theme.palette.mode === "dark" 
            ? "rgba(30, 41, 59, 0.5)" 
            : "rgba(241, 245, 249, 0.5)",
          cursor: "pointer",
          gap: 2,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TerminalIcon 
            fontSize="small" 
            color={isStreaming ? "primary" : "action"} 
            sx={{ 
                animation: isStreaming ? "pulse 1.5s infinite" : "none",
                "@keyframes pulse": {
                    "0%": { opacity: 1 },
                    "50%": { opacity: 0.5 },
                    "100%": { opacity: 1 },
                }
            }}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {isStreaming ? "Agent Active" : "Activity Log"}
            {activityLogs.length > 0 && ` (${activityLogs.length})`}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {isExpanded && (
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); clearActivityLogs(); }} title="Clear logs">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small">
            {isExpanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={isExpanded}>
        <Box
          sx={{
            p: 2,
            maxHeight: 400,
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "0.8rem",
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
          }}
        >
          {activityLogs.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
              Waiting for agent activity...
            </Typography>
          ) : (
            activityLogs.map((log) => (
              <Box key={log.id} sx={{ display: "flex", gap: 1, opacity: 0.9 }}>
                <Typography 
                  component="span" 
                  variant="caption" 
                  sx={{ 
                    color: "text.secondary", 
                    minWidth: 55,
                    userSelect: "none",
                    fontSize: "0.75rem",
                    pt: 0.1
                  }}
                >
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                </Typography>
                <Typography 
                  component="span" 
                  sx={{ 
                    color: log.type === 'error' 
                      ? theme.palette.error.main 
                      : log.type === 'success' 
                        ? theme.palette.success.main 
                        : theme.palette.text.primary,
                    fontSize: "0.8rem",
                    wordBreak: "break-word",
                    lineHeight: 1.4
                  }}
                >
                  {log.message}
                </Typography>
              </Box>
            ))
          )}
          <div ref={logsEndRef} />
        </Box>
      </Collapse>
    </Paper>
  );
}
