import { 
  Box, 
  Typography, 
  IconButton,
  Button,
  useTheme,
  Backdrop
} from '@mui/material';
import { 
  CheckCircle, 
  SmartToy,
  ArrowForward,
  Close,
  Stop
} from '@mui/icons-material';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ActivityLog {
  id: string;
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'process';
}

interface ActivityMonitorProps {
  logs: ActivityLog[];
  isActive: boolean;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ActivityMonitor = ({ logs, isActive, onCancel, onClose }: ActivityMonitorProps) => {
  const theme = useTheme();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <Backdrop
      open={true}
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 100, bgcolor: 'rgba(0, 0, 0, 0.2)' }}
    >
      <Box 
        component={motion.div}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", duration: 0.5 }}
        sx={{
          width: '90%',
          maxWidth: 600,
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(24px)',
          boxShadow: theme.shadows[20],
        }}
      >
        {/* Header */}
        <Box sx={{ 
          px: 2.5, 
          py: 2, 
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ position: 'relative', display: 'flex' }}>
              <SmartToy sx={{ fontSize: 24, color: 'primary.main' }} />
              {isActive && (
                <Box
                  component={motion.div}
                  animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  sx={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    boxShadow: `0 0 10px ${theme.palette.success.main}`
                  }}
                />
              )}
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Agent Active
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isActive ? "Processing request..." : "Task completed"}
              </Typography>
            </Box>
          </Box>
          
          <Box>
            {isActive ? (
              <Button 
                size="small" 
                color="error" 
                startIcon={<Stop />} 
                onClick={onCancel}
                sx={{ borderRadius: 4, textTransform: 'none' }}
              >
                Stop
              </Button>
            ) : (
              <IconButton size="small" onClick={onClose}>
                <Close />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Log Stream */}
        <Box sx={{ 
          height: 300, 
          overflowY: 'auto', 
          p: 3,
          fontFamily: 'monospace',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
        }}>
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  mb: 2, 
                  alignItems: 'flex-start',
                  opacity: log.type === 'process' ? 0.7 : 1
                }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'text.disabled', 
                      minWidth: 55,
                      pt: 0.3,
                      fontSize: '0.7rem'
                    }}
                  >
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </Typography>
                  
                  {log.type === 'success' ? (
                    <CheckCircle sx={{ fontSize: 16, color: 'success.main', mt: 0.2 }} />
                  ) : (
                    <ArrowForward sx={{ fontSize: 16, color: 'primary.main', mt: 0.2 }} />
                  )}

                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: log.type === 'success' ? 'success.main' : 'text.primary',
                      fontWeight: log.type === 'success' ? 'bold' : 'normal',
                      lineHeight: 1.5
                    }}
                  >
                    {log.message}
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Typing Indicator */}
          {isActive && (
            <Box sx={{ display: 'flex', gap: 1, ml: 10, mt: 2, alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.primary.main,
                    opacity: 0.6
                  }}
                />
              ))}
            </Box>
          )}
          <div ref={bottomRef} />
        </Box>
        
        {!isActive && (
           <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${theme.palette.divider}` }}>
              <Button variant="contained" onClick={onClose} disableElevation>
                 Close Monitor
              </Button>
           </Box>
        )}
      </Box>
    </Backdrop>
  );
};
