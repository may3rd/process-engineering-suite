import { useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { Sidebar } from './Sidebar';
import { TopToolbar } from '../TopToolbar';
import { useThemeContext } from '../../ThemeContext';

const DRAWER_WIDTH = 300;

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toggleColorMode, mode } = useThemeContext();
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <CssBaseline />
      
      {/* Fixed Top Toolbar */}
      <Box 
        sx={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: (theme) => theme.zIndex.drawer + 1, // Clipped drawer (Toolbar above Drawer)
          width: '100%',
        }}
      >
        <TopToolbar 
          onToggleTheme={toggleColorMode} 
          isDarkMode={mode === 'dark'} 
          onMenuClick={handleDrawerToggle}
        />
      </Box>

      {/* Sidebar (Desktop Persistent / Mobile Drawer) */}
      <Sidebar mobileOpen={mobileOpen} onClose={handleDrawerToggle} />
      
      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          mt: '60px',
          height: 'calc(100vh - 60px)',
          overflow: 'auto'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
