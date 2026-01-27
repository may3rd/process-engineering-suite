import { useRef } from 'react';
import { IconButton, Tooltip, Stack } from '@mui/material';
import { 
  AutoFixHigh as AgentIcon, 
  Menu as MenuIcon, 
  Save as SaveIcon, 
  UploadFile as LoadIcon,
  DeleteSweep as ClearIcon
} from '@mui/icons-material';
import { TopFloatingToolbar } from '@eng-suite/ui-kit';
import { StatusIndicator } from './common/StatusIndicator';
import { useDesignStore } from '../store/useDesignStore';
import { DesignState } from '../types';

interface TopToolbarProps {
  onToggleTheme: () => void;
  isDarkMode: boolean;
  onMenuClick?: () => void;
}

export const TopToolbar = ({ onToggleTheme, isDarkMode, onMenuClick }: TopToolbarProps) => {
  const { designState, setDesignState, clearProject } = useDesignStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const exportState = {
      ...designState,
      llmSettings: designState.llmSettings
        ? { ...designState.llmSettings, apiKey: undefined }
        : undefined,
    };
    const dataStr = JSON.stringify(exportState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design_project_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid project file');
        }
        const currentLlmSettings = designState.llmSettings;
        const currentApiKey = currentLlmSettings?.apiKey;
        const parsedState = parsed as DesignState;
        const loadedLlmSettings = parsedState.llmSettings;
        const newState = {
          ...parsedState,
          llmSettings: loadedLlmSettings
            ? { ...loadedLlmSettings, apiKey: currentApiKey }
            : currentLlmSettings,
        };
        setDesignState(newState);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('Failed to load project file:', error);
        alert('Invalid project file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (window.confirm('Clear all project data? (LLM settings will be preserved)')) {
      clearProject();
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept='.json'
        onChange={handleFileChange}
      />
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
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Clear Project Data">
              <IconButton onClick={handleClear} size="small" color="error">
                <ClearIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save Project">
              <IconButton onClick={handleSave} size="small">
                <SaveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Load Project">
              <IconButton onClick={handleLoadClick} size="small">
                <LoadIcon />
              </IconButton>
            </Tooltip>
            <StatusIndicator />
          </Stack>
        }
        onToggleTheme={onToggleTheme}
        isDarkMode={isDarkMode}
      />
    </>
  );
};
