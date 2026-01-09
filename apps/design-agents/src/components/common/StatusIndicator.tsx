import { 
  Box, 
  Tooltip, 
  CircularProgress,
  Typography,
  useTheme
} from '@mui/material';
import { 
  CheckCircle, 
  Error as ErrorIcon 
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { checkHealth } from '../../lib/api';

export const StatusIndicator = () => {
  const theme = useTheme();
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [provider, setProvider] = useState<string>('');

  useEffect(() => {
    const check = async () => {
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
    };
    
    check();
    const interval = setInterval(check, 30000); // Check every 30s
    return () => clearInterval(interval);
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
    text = `System Online (${provider})`;
  } else {
    icon = <ErrorIcon sx={{ fontSize: 18 }} />;
    color = theme.palette.error.main;
    text = "API Offline";
  }

  return (
    <Tooltip title={text}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          bgcolor: 'rgba(0,0,0,0.05)', 
          px: 1.5, 
          py: 0.5, 
          borderRadius: 4,
          color: color,
          border: `1px solid ${color}`,
          opacity: 0.8,
          transition: 'all 0.2s',
          '&:hover': { opacity: 1, bgcolor: 'rgba(0,0,0,0.1)' }
        }}
      >
        {icon}
        <Typography variant="caption" fontWeight="bold" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {status === 'online' ? 'Online' : 'Offline'}
        </Typography>
      </Box>
    </Tooltip>
  );
};
