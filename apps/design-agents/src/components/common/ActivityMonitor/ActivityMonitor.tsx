import { 
  Box, 
  Typography, 
  Fade, 
  useTheme 
} from '@mui/material';
import { 
  Terminal, 
  CheckCircle, 
  SmartToy,
  ArrowForward 
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
}

export const ActivityMonitor = ({ logs, isActive }: ActivityMonitorProps) => {
  const theme = useTheme();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <Box 
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      sx={{
        width: '100%',
        maxWidth: 600,
        mx: 'auto',
        mt: 2,
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(16px)',
        boxShadow: theme.shadows[4],
      }}
    >
      {/* Header */}
      <Box sx={{ 
        px: 2, 
        py: 1.5, 
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5 
      }}>
        <Box sx={{ position: 'relative', display: 'flex' }}>
          <SmartToy sx={{ fontSize: 20, color: 'primary.main' }} />
          {isActive && (
            <Box
              component={motion.div}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              sx={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'success.main',
                boxShadow: `0 0 8px ${theme.palette.success.main}`
              }}
            />
          )}
        </Box>
        <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.secondary', letterSpacing: 1 }}>
          AGENT ACTIVITY STREAM
        </Typography>
      </Box>

      {/* Log Stream */}
      <Box sx={{ 
        height: 200, 
        overflowY: 'auto', 
        p: 2,
        fontFamily: 'monospace',
        position: 'relative'
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
                gap: 1.5, 
                mb: 1.5, 
                alignItems: 'flex-start',
                opacity: log.type === 'process' ? 0.7 : 1
              }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.disabled', 
                    minWidth: 60,
                    pt: 0.2
                  }}
                >
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                </Typography>
                
                {log.type === 'success' ? (
                  <CheckCircle sx={{ fontSize: 14, color: 'success.main', mt: 0.2 }} />
                ) : (
                  <ArrowForward sx={{ fontSize: 14, color: 'primary.main', mt: 0.2, transform: 'rotate(0deg)' }} />
                )}

                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: log.type === 'success' ? 'success.main' : 'text.primary',
                    fontWeight: log.type === 'success' ? 'bold' : 'normal',
                    lineHeight: 1.4
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
          <Box sx={{ display: 'flex', gap: 1, ml: 10, mt: 1, alignItems: 'center' }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.primary.main
                }}
              />
            ))}
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>
    </Box>
  );
};
