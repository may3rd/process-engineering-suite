import { useEffect, useMemo, useState } from 'react';
import { 
  Box, 
  Button, 
  Chip,
  Paper, 
  Stack, 
  CircularProgress, 
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography
} from '@mui/material';
import { 
  CheckCircle as ConfirmIcon,
  Inventory as AssetIcon,
  Science as SimIcon
} from '@mui/icons-material';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender,
  ColumnDef
} from '@tanstack/react-table';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';

const safeParse = (str?: string) => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('JSON Parse Error', e);
    return null;
  }
};

type Equipment = {
  id: string;
  name: string;
  service: string;
  type: string;
  category: string;
  streams_in: string[];
  streams_out: string[];
  design_criteria: string;
  notes: string;
};

export const SimulationView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: Streams, 1: Equipment

  const simulationData = useMemo(() => safeParse(designState.simulation_results), [designState.simulation_results]);
  const fullResults = useMemo(() => safeParse(designState.full_simulation_results), [designState.full_simulation_results]);
  const equipmentData = useMemo<Equipment[]>(() => (fullResults?.equipments || []) as Equipment[], [fullResults]);

  useEffect(() => {
    if (simulationData && !loading) setActiveTab(0);
  }, [simulationData, loading]);

  const handleRunSimulation = async () => {
    if (!designState.catalog_template) return;
    
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      const result = await runAgent('simulation_agent', { 
        prompt: 'Run Simulation',
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
        setActiveTab(0);
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

  const renderStreamTable = (data: any) => {
    if (!data?.streams) return <Typography fontStyle="italic">No data available.</Typography>;

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '60vh' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Phase</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Mass Flow (kg/h)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Temp (°C)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Press (barg)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.streams.map((stream: any) => {
              const props = stream.properties || {};
              const getVal = (key: string) => {
                const val = props[key];
                if (!val) return '-';
                if (typeof val === 'object' && val.value !== undefined) return val.value;
                return val;
              };

              return (
                <TableRow key={stream.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{stream.id}</TableCell>
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

  const columns = useMemo<ColumnDef<Equipment>[]>(
    () => [
      { accessorKey: 'id', header: 'Tag', cell: info => <Typography variant="body2" fontWeight="bold">{info.getValue() as string}</Typography> },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'service', header: 'Service' },
      { accessorKey: 'type', header: 'Type' },
      { accessorKey: 'category', header: 'Category', cell: info => <Chip label={info.getValue() as string} size="small" variant="outlined" /> },
      { accessorKey: 'design_criteria', header: 'Design Criteria' },
    ],
    []
  );

  const table = useReactTable({
    data: equipmentData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">Simulation & Mass Balance</Typography>
          <Typography variant="caption" color="text.secondary">
            Run the simulation and review streams and equipment extracted from results.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button 
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SimIcon />} 
            onClick={handleRunSimulation} 
            variant="contained" 
            color="primary"
            disabled={loading || !designState.catalog_template}
          >
            {simulationData ? 'Re-run Simulation' : 'Run Simulation'}
          </Button>
          <Button 
            startIcon={<ConfirmIcon />} 
            onClick={handleConfirmAndNext} 
            variant={simulationData ? 'contained' : 'outlined'}
            color="success"
            disabled={!simulationData}
          >
            Confirm & Next
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Streams" disabled={!simulationData} />
          <Tab label="Equipment" disabled={!designState.full_simulation_results} />
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {activeTab === 0 && (
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            {!simulationData ? (
              <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                <SimIcon sx={{ fontSize: 60, mb: 2 }} />
                <Typography>Run the simulation to see stream results.</Typography>
              </Box>
            ) : (
              renderStreamTable(simulationData)
            )}
          </Box>
        )}
        {activeTab === 1 && (
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            {equipmentData.length === 0 ? (
              <Box sx={{ p: 10, textAlign: 'center', opacity: 0.5 }}>
                <AssetIcon sx={{ fontSize: 60, mb: 2 }} />
                <Typography>No equipment data found.</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, maxHeight: 'calc(100vh - 250px)' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    {table.getHeaderGroups().map(headerGroup => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <TableCell key={header.id} sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableHead>
                  <TableBody>
                    {table.getRowModel().rows.map(row => (
                      <TableRow key={row.id} hover>
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

