import {
  Box,
  Chip,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  PlayCircle as RunningIcon,
  RadioButtonUnchecked as PendingIcon,
  Schedule as OutdatedIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useDesignStore } from '../../store/useDesignStore';
import { AgentStep, StepStatus } from '../../types';
import { WORKFLOW_PHASES } from './workflowMeta';

const DRAWER_WIDTH = 300;

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

const getStatusIcon = (status: StepStatus) => {
  switch (status) {
    case 'completed':
      return <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />;
    case 'running':
      return <RunningIcon sx={{ fontSize: 18, color: 'info.main' }} />;
    case 'failed':
      return <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />;
    case 'outdated':
      return <OutdatedIcon sx={{ fontSize: 18, color: 'warning.main' }} />;
    default:
      return <PendingIcon sx={{ fontSize: 18, color: 'text.disabled' }} />;
  }
};

const StepRow = ({
  step,
  active,
  onClick,
}: {
  step: AgentStep;
  active: boolean;
  onClick: () => void;
}) => {
  const theme = useTheme();
  return (
    <ListItem disablePadding>
      <ListItemButton
        selected={active}
        onClick={onClick}
        sx={{
          borderRadius: 2,
          px: 1.25,
          py: 1,
          alignItems: 'flex-start',
          '&.Mui-selected': {
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.12),
            border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.5 : 0.26)}`,
          },
        }}
      >
        <Stack direction="row" spacing={1.1} alignItems="flex-start" sx={{ width: '100%' }}>
          {getStatusIcon(step.status)}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={active ? 700 : 600} noWrap>
              {step.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
              {step.description}
            </Typography>
          </Box>
          <Chip
            size="small"
            variant="outlined"
            label={step.status}
            sx={{
              height: 20,
              textTransform: 'capitalize',
              '& .MuiChip-label': { px: 0.8, fontSize: 10 },
            }}
          />
        </Stack>
      </ListItemButton>
    </ListItem>
  );
};

const SettingsRow = ({ active, onClick }: { active: boolean; onClick: () => void }) => {
  const theme = useTheme();
  return (
    <ListItem disablePadding>
      <ListItemButton
        selected={active}
        onClick={onClick}
        sx={{
          borderRadius: 2,
          px: 1.25,
          py: 1,
          '&.Mui-selected': {
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.12),
            border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.5 : 0.26)}`,
          },
        }}
      >
        <Stack direction="row" spacing={1.1} alignItems="center" sx={{ width: '100%' }}>
          <SettingsIcon sx={{ fontSize: 18, color: active ? 'primary.main' : 'text.secondary' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={active ? 700 : 600} noWrap>
              Settings
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
              Model provider and controls
            </Typography>
          </Box>
        </Stack>
      </ListItemButton>
    </ListItem>
  );
};

export const Sidebar = ({ mobileOpen = false, onClose }: SidebarProps) => {
  const { steps, activeStepId, setActiveStep } = useDesignStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const grouped = WORKFLOW_PHASES.map((phase) => ({
    ...phase,
    steps: steps.filter((step) => phase.stepIds.includes(step.id)),
  }));

  const handleStepClick = (stepId: string) => {
    setActiveStep(stepId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: 1.5,
        pt: 9,
      }}
    >
      <Box sx={{ px: 1, mb: 1.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
          Workflow Navigator
        </Typography>
      </Box>
      <Box sx={{ overflowY: 'auto', pr: 0.5 }}>
        {grouped.map((phase) => {
          if (phase.steps.length === 0) {
            return null;
          }
          const doneCount = phase.steps.filter((step) => step.status === 'completed').length;
          return (
            <Box key={phase.id} sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.2, mb: 0.8 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                    {phase.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {phase.subtitle}
                  </Typography>
                </Box>
                <Chip size="small" label={`${doneCount}/${phase.steps.length}`} />
              </Stack>
              <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.7 }}>
                {phase.steps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    active={step.id === activeStepId}
                    onClick={() => handleStepClick(step.id)}
                  />
                ))}
              </List>
            </Box>
          );
        })}
      </Box>
      <Divider sx={{ my: 1 }} />
      <List disablePadding>
        <SettingsRow active={activeStepId === 'settings'} onClick={() => handleStepClick('settings')} />
      </List>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
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
            borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
            backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.8 : 0.92),
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};
