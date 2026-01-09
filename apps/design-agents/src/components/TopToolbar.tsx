import { IconButton } from '@mui/material';
import { AutoFixHigh as AgentIcon, Menu as MenuIcon } from '@mui/icons-material';
import { TopFloatingToolbar } from '@eng-suite/ui-kit';
import { StatusIndicator } from './common/StatusIndicator';

interface TopToolbarProps {
  onToggleTheme: () => void;
  isDarkMode: boolean;
  onMenuClick?: () => void;
}

export const TopToolbar = ({ onToggleTheme, isDarkMode, onMenuClick }: TopToolbarProps) => {
  return (
    <TopFloatingToolbar
      title="Process Design Agents"
      subtitle="AI-Driven Engineering Suite"
      icon={<AgentIcon />}
      leadingAction={onMenuClick ? (
        <IconButton
          onClick={onMenuClick}
          edge="start"
          sx={{ display: { md: 'none' }, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>
      ) : undefined}
      actions={<StatusIndicator />}
      onToggleTheme={onToggleTheme}
      isDarkMode={isDarkMode}
    />
  );
};
