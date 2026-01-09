import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Toolbar,
  useTheme,
  Divider,
  Chip,
  useMediaQuery
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as PendingIcon,
  Error as ErrorIcon,
  PlayCircle as RunningIcon,
  AccessTime as OutdatedIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useDesignStore } from '../../store/useDesignStore';
import { StepStatus } from '../../types';

const DRAWER_WIDTH = 280;

const StatusIcon = ({ status }: { status: StepStatus }) => {
  const theme = useTheme();
  switch (status) {
    case 'completed': return <CheckIcon sx={{ color: theme.palette.success.main }} />;
    case 'running': return <RunningIcon sx={{ color: theme.palette.info.main }} />;
    case 'failed': return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
    case 'outdated': return <OutdatedIcon sx={{ color: theme.palette.warning.main }} />;
    default: return <PendingIcon sx={{ color: theme.palette.text.disabled }} />;
  }
};

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ mobileOpen = false, onClose }: SidebarProps) => {
  const { steps, activeStepId, setActiveStep } = useDesignStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleStepClick = (stepId: string) => {
    setActiveStep(stepId);
    if (isMobile && onClose) onClose();
  };

  const drawerContent = (
    <>
      <Toolbar />
      <Divider />
      <Box sx={{ overflow: 'auto', flexGrow: 1, mt: 2 }}>
        <List>
          {steps.map((step) => (
            <ListItem key={step.id} disablePadding>
              <ListItemButton
                selected={activeStepId === step.id}
                onClick={() => handleStepClick(step.id)}
                sx={{
                    borderRadius: 2,
                    mx: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                        borderLeft: `4px solid ${theme.palette.primary.main}`
                    }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <StatusIcon status={step.status} />
                </ListItemIcon>
                <ListItemText
                  primary={step.label}
                  secondary={step.description}
                  primaryTypographyProps={{ variant: 'subtitle2', fontWeight: activeStepId === step.id ? 'bold' : 'medium' }}
                  secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            selected={activeStepId === 'settings'}
            onClick={() => handleStepClick('settings')}
            sx={{ borderRadius: 2, mx: 1, my: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="LLM Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
    >
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: DRAWER_WIDTH,
            backgroundColor: theme.palette.background.paper,
            backgroundImage: 'none'
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};
