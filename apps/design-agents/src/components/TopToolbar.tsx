import { 
  Box, 
  IconButton, 
  useTheme, 
  Tooltip, 
  Typography 
} from '@mui/material';
import { 
  Brightness4, 
  Brightness7, 
  AutoFixHigh as AgentIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { StatusIndicator } from './common/StatusIndicator';

interface TopToolbarProps {
  onToggleTheme: () => void;
  isDarkMode: boolean;
  onMenuClick?: () => void;
}

export const TopToolbar = ({ onToggleTheme, isDarkMode, onMenuClick }: TopToolbarProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        height: 64,
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Left: Brand / Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {onMenuClick && (
          <IconButton 
            onClick={onMenuClick} 
            edge="start" 
            sx={{ display: { md: 'none' }, mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <AgentIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>
            Process Design Agents
          </Typography>
          <Typography variant="caption" color="text.secondary">
            AI-Driven Engineering Suite
          </Typography>
        </Box>
      </Box>

      {/* Right: Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <StatusIndicator />
        
        <Tooltip title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}>
          <IconButton onClick={onToggleTheme} color="inherit">
            {isDarkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
