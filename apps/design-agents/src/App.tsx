import { Typography, Paper, Box } from '@mui/material';
import { AppShell } from './components/layout/AppShell';
import { useDesignStore } from './store/useDesignStore';
import { useLogStore } from './store/useLogStore';
import { RequirementsView } from './components/views/RequirementsView';
import { SpreadsheetView } from './components/views/SpreadsheetView';
import { ResearchView } from './components/views/ResearchView';
import { SynthesisView } from './components/views/SynthesisView';
import { PFDView } from './components/views/PFDView';
import { SimulationView } from './components/views/SimulationView';
import { EquipmentListView } from './components/views/EquipmentListView';
import { SizingView } from './components/views/SizingView';
import { SafetyView } from './components/views/SafetyView';
import { ProjectReviewView } from './components/views/ProjectReviewView';
import { FinalReportView } from './components/views/FinalReportView';
import { SettingsView } from './components/views/SettingsView';
import { CostView } from './components/views/CostView';
import { AuroraBackground } from './components/common/AuroraBackground';
import { ActivityMonitor } from './components/common/ActivityMonitor/ActivityMonitor';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { activeStepId, steps } = useDesignStore();
  const { logs, isActive, clearLogs, setActive } = useLogStore();
  const activeStep = steps.find(s => s.id === activeStepId);

  // Auto-close monitor logic could go here, but we'll let user close it or close on next action
  const handleCloseMonitor = () => {
      // We only clear logs if we want to reset for next time, 
      // or we can keep them until next run. 
      // Let's just hide it by clearing logs if we treat 'logs.length > 0' as visibility trigger.
      clearLogs();
  };

  const handleCancelAgent = () => {
      // In a real app, we would abort the fetch controller.
      // For now, just force UI state to stop.
      setActive(false);
      // Ideally we should also tell the backend to cancel, but we don't have that plumbing yet.
  };

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
      case 'simulation':
        return <SimulationView />;
      case 'equipment':
        return <EquipmentListView />;
      case 'sizing':
        return <SizingView />;
      case 'safety':
        return <SafetyView />;
      case 'cost':
        return <CostView />;
      case 'review':
        return <ProjectReviewView />;
      case 'report':
        return <FinalReportView />;
      case 'settings':
        return <SettingsView />;
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
      <AuroraBackground />
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          {activeStep?.label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {activeStep?.description}
        </Typography>
      </Box>

      <AnimatePresence>
        {(isActive || logs.length > 0) && (
             <ActivityMonitor 
                logs={logs} 
                isActive={isActive} 
                onClose={handleCloseMonitor}
                onCancel={handleCancelAgent}
             />
        )}
      </AnimatePresence>

      <Box sx={{ flexGrow: 1, height: 'calc(100vh - 160px)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStepId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{ height: '100%' }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </Box>
    </AppShell>
  );
}

export default App;