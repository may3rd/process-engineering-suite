import { Typography, Paper, Box } from '@mui/material';
import { AppShell } from './components/layout/AppShell';
import { useDesignStore } from './store/useDesignStore';
import { RequirementsView } from './components/views/RequirementsView';
import { SpreadsheetView } from './components/views/SpreadsheetView';
import { ResearchView } from './components/views/ResearchView';
import { SynthesisView } from './components/views/SynthesisView';
import { PFDView } from './components/views/PFDView';

function App() {
  const { activeStepId, steps } = useDesignStore();
  const activeStep = steps.find(s => s.id === activeStepId);

  const renderContent = () => {
    switch (activeStepId) {
      case 'requirements':
        return <RequirementsView />;
      case 'research':
        return <ResearchView />;
      case 'synthesis':
        return <SynthesisView />;
      case 'pfd':
        return <PFDView />;
      case 'equipment':
      case 'sizing':
        return <SpreadsheetView />;
      default:
        return (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              border: 1, 
              borderColor: 'divider', 
              borderRadius: 2,
              minHeight: '60vh',
              bgcolor: 'background.paper'
            }}
          >
            <Typography variant="h6" gutterBottom>
               Workspace: {activeStep?.label}
            </Typography>
            <Typography>
               This view is under construction. It will handle the <strong>{activeStep?.id}</strong> logic.
            </Typography>
          </Paper>
        );
    }
  };

  return (
    <AppShell>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          {activeStep?.label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {activeStep?.description}
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, height: 'calc(100vh - 160px)' }}>
        {renderContent()}
      </Box>
    </AppShell>
  );
}

export default App;