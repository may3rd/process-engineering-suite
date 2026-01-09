import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  Stack, 
  CircularProgress, 
  Divider,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';
import { 
  AutoAwesome as MagicIcon,
  CheckCircle as ConfirmIcon,
  TableChart as StructureIcon,
  Science as SimIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';

// Helper to parse JSON safely
const safeParse = (str?: string) => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("JSON Parse Error", e);
    return null;
  }
};

export const SimulationView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: Catalog (Structure), 1: Simulation (Results)

  const catalogData = safeParse(designState.catalog_template);
  const simulationData = safeParse(designState.simulation_results);

  // Auto-switch tab if simulation exists
  useEffect(() => {
    if (simulationData && !loading) setActiveTab(1);
  }, [simulationData]);

  const handleRunCatalog = async () => {
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      const result = await runAgent('catalog_agent', { 
        prompt: "Generate Catalog",
        flowsheet: designState.flowsheet_description,
        design_basis: designState.selected_concept_details,
        requirements: designState.process_requirements,
        concept_details: designState.selected_concept_details,
      });
      
      if (result.status === 'completed' && result.data?.output) {
         updateDesignState({ catalog_template: result.data.output });
         // Keep step running until simulation is done? Or mark partial?
         // Let's keep it running effectively, or just "pending" next sub-step.
      } else {
         throw new Error(result.message || 'Unknown error');
      }
    } catch (e) {
      console.error(e);
      updateStepStatus(activeStepId, 'failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!designState.catalog_template) return;
    
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      const result = await runAgent('simulation_agent', { 
        prompt: "Run Simulation",
        flowsheet: designState.flowsheet_description,
        design_basis: designState.selected_concept_details,
        catalog_template: designState.catalog_template
      });
      
      if (result.status === 'completed' && result.data?.output) {
         updateDesignState({ 
             simulation_results: result.data.output,
             full_simulation_results: result.data.full_results
         });
         updateStepStatus(activeStepId, 'completed');
         setActiveTab(1);
      } else {
         throw new Error(result.message || 'Unknown error');
      }
    } catch (e) {
      console.error(e);
      updateStepStatus(activeStepId, 'failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndNext = () => {
      const currentIndex = steps.findIndex(s => s.id === activeStepId);
      if (currentIndex < steps.length - 1) {
          setActiveStep(steps[currentIndex + 1].id);
      }
  };

  const renderStreamTable = (data: any, isResult: boolean) => {
      if (!data?.streams) return <Typography fontStyle="italic">No data available.</Typography>;

      return (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '60vh' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Phase</TableCell>
                <TableCell align="right">Mass Flow (kg/h)</TableCell>
                <TableCell align="right">Temp (°C)</TableCell>
                <TableCell align="right">Press (barg)</TableCell>
                {/* Add more cols as needed */}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.streams.map((stream: any, i: number) => {
                  const props = stream.properties || {};
                  // Helper to extract value whether it's direct or in {value, unit} object
                  const getVal = (key: string) => {
                      const val = props[key];
                      if (!val) return "-";
                      if (typeof val === 'object' && val.value !== undefined) return val.value;
                      return val;
                  };

                  return (
                    <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{stream.id}</TableCell>
                        <TableCell>{stream.name}</TableCell>
                        <TableCell>{stream.phase}</TableCell>
                        <TableCell align="right">{getVal('mass_flow')}</TableCell>
                        <TableCell align="right">{getVal('temperature')}</TableCell>
                        <TableCell align="right">{getVal('pressure')}</TableCell>
                    </TableRow>
                  );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">Simulation & Mass Balance</Typography>
          <Typography variant="caption" color="text.secondary">
             Structure the flowsheet and calculate stream properties.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
             <Button 
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <StructureIcon />} 
                onClick={handleRunCatalog} 
                variant="outlined" 
                disabled={loading}
             >
                {catalogData ? "Re-structure Catalog" : "1. Structure Catalog"}
             </Button>
             <Button 
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SimIcon />} 
                onClick={handleRunSimulation} 
                variant="contained" 
                color="primary"
                disabled={loading || !catalogData}
             >
                {simulationData ? "Re-run Simulation" : "2. Run Simulation"}
             </Button>
             <Button 
                startIcon={<ConfirmIcon />} 
                onClick={handleConfirmAndNext} 
                variant="contained" 
                color="success"
                disabled={!simulationData}
             >
                Confirm & Next
             </Button>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="1. Stream Catalog (Template)" disabled={!catalogData} />
          <Tab label="2. Simulation Results" disabled={!simulationData} />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}> {/* Prevent double scroll */}
          {activeTab === 0 && (
              <Box sx={{ height: '100%', overflow: 'auto' }}>
                  {!catalogData ? (
                      <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                          <StructureIcon sx={{ fontSize: 60, mb: 2 }} />
                          <Typography>Generate the catalog structure first.</Typography>
                      </Box>
                  ) : (
                      renderStreamTable(catalogData, false)
                  )}
              </Box>
          )}
          {activeTab === 1 && (
              <Box sx={{ height: '100%', overflow: 'auto' }}>
                  {!simulationData ? (
                      <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                          <SimIcon sx={{ fontSize: 60, mb: 2 }} />
                          <Typography>Run the simulation to see results.</Typography>
                      </Box>
                  ) : (
                      renderStreamTable(simulationData, true)
                  )}
              </Box>
          )}
      </Box>
    </Box>
  );
};
