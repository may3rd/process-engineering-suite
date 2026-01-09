import { useState } from 'react';
import { Box, CssBaseline, IconButton } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { Sidebar } from './Sidebar';
import { TopToolbar } from '../TopToolbar';
import { useThemeContext } from '../../ThemeContext';

const DRAWER_WIDTH = 280;

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
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` }
        }}
      >
        <TopToolbar 
          onToggleTheme={toggleColorMode} 
          isDarkMode={mode === 'dark'} 
          // Pass handleDrawerToggle to TopToolbar if we want the menu icon there on mobile
          // But currently we put the MenuIcon in the AppShell logic.
          // Let's modify TopToolbar to accept a "MobileMenuButton" or put it here.
        />
        {/* Mobile Menu Button Overlay (if not inside TopToolbar) */}
        <Box sx={{ position: 'absolute', top: 12, left: 16, display: { md: 'none' }, zIndex: 2000 }}>
           <IconButton
            onClick={handleDrawerToggle}
            sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
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
          mt: '64px', // Height of TopToolbar
          height: 'calc(100vh - 64px)',
          overflow: 'auto'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
