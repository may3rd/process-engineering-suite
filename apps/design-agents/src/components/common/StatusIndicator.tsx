import { 
  Box, 
  Tooltip, 
  CircularProgress,
  Typography,
  useTheme
} from '@mui/material';
import { 
  CheckCircle, 
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import { checkHealth } from '../../lib/api';
import { useLogStore } from '../../store/useLogStore';

export const StatusIndicator = () => {
  const theme = useTheme();
  const { isActive } = useLogStore();
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [provider, setProvider] = useState<string>('');

  const check = useCallback(async () => {
    if (isActive) return;
    setStatus('checking');
    try {
      const res = await checkHealth();
      if (res.status === 'design-agents-active') {
        setStatus('online');
        setProvider(res.provider || 'AI Ready');
      } else {
        setStatus('offline');
      }
    } catch (e) {
      setStatus('offline');
    }
  }, [isActive]);

  // Only check once on mount
  useEffect(() => {
    check();
  }, []); 

  let icon;
  let color;
  let text;

  if (status === 'checking') {
    icon = <CircularProgress size={16} color="inherit" />;
    color = theme.palette.text.secondary;
    text = "Checking API...";
  } else if (status === 'online') {
    icon = <CheckCircle sx={{ fontSize: 18 }} />;
    color = theme.palette.success.main;
    text = `System Online (${provider}). Click to re-verify.`;
  } else {
    icon = <ErrorIcon sx={{ fontSize: 18 }} />;
    color = theme.palette.error.main;
    text = "API Offline. Click to retry connection.";
  }

  return (
    <Tooltip title={text}>
      <Box 
        onClick={check}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          bgcolor: 'rgba(0,0,0,0.05)', 
          pl: 1.5, 
          pr: 1,
          py: 0.5, 
          borderRadius: 4,
          color: color,
          border: `1px solid ${color}`,
          opacity: 0.8,
          transition: 'all 0.2s',
          cursor: isActive ? 'default' : 'pointer',
          '&:hover': { 
            opacity: 1, 
            bgcolor: isActive ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.1)' 
          }
        }}
      >
        {icon}
        <Typography variant="caption" fontWeight="bold" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {status === 'online' ? 'Online' : status === 'checking' ? 'Checking' : 'Offline'}
        </Typography>
        <RefreshIcon sx={{ fontSize: 14, ml: 0.5, opacity: 0.5 }} />
      </Box>
    </Tooltip>
  );
};