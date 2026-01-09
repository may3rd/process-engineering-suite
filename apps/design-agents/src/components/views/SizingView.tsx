import { useState, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  Stack, 
  CircularProgress, 
  Divider,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  AutoAwesome as MagicIcon,
  CheckCircle as ConfirmIcon,
  ExpandMore as ExpandMoreIcon,
  Straighten as SizingIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';

const safeParse = (str?: string) => {
  if (!str) return null;
  try { return JSON.parse(str); } 
  catch (e) { return null; }
};

export const SizingView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  const [loading, setLoading] = useState(false);

  const sizingData = useMemo(() => safeParse(designState.sizing_results), [designState.sizing_results]);
  const equipments = sizingData?.equipments || [];
  const metadata = sizingData?.metadata || {};

  const handleRunSizing = async () => {
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      const result = await runAgent('sizing_agent', { 
        prompt: "Run Equipment Sizing",
        flowsheet: designState.flowsheet_description,
        design_basis: designState.selected_concept_details,
        full_simulation_results: designState.full_simulation_results
      });
      
      if (result.status === 'completed' && result.data?.output) {
         updateDesignState({ sizing_results: result.data.output });
         updateStepStatus(activeStepId, 'completed');
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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">Engineering Design & Sizing</Typography>
          <Typography variant="caption" color="text.secondary">
             Calculate physical dimensions, power requirements, and performance parameters.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
             <Button 
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <MagicIcon />} 
                onClick={handleRunSizing} 
                variant="contained" 
                color="primary"
                disabled={loading || !designState.full_simulation_results}
             >
                {sizingData ? "Re-run Sizing" : "Run Detailed Sizing"}
             </Button>
             <Button 
                startIcon={<ConfirmIcon />} 
                onClick={handleConfirmAndNext} 
                variant="contained" 
                color="success"
                disabled={!sizingData}
             >
                Confirm & Next
             </Button>
        </Stack>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {!sizingData ? (
              <Box sx={{ p: 10, textAlign: 'center', opacity: 0.5 }}>
                  <SizingIcon sx={{ fontSize: 60, mb: 2 }} />
                  <Typography>Run the sizing agent to calculate equipment parameters.</Typography>
              </Box>
          ) : (
              <Grid container spacing={3}>
                  {/* Metadata & Summary */}
                  <Grid item xs={12}>
                      <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                          <CardContent>
                              <Typography variant="subtitle2" gutterBottom color="primary">Design Standards & Assumptions</Typography>
                              <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                                  {metadata.design_codes?.map((code: string, i: number) => (
                                      <Chip key={i} label={code} size="small" variant="filled" sx={{ mb: 1 }} />
                                  ))}
                              </Stack>
                              <Typography variant="caption" display="block">
                                  <strong>Margins:</strong> Duty: {metadata.design_margins?.duty_margin * 100}% | 
                                  Power: {metadata.design_margins?.power_margin * 100}% | 
                                  Pressure: {metadata.design_margins?.pressure_margin * 100}%
                              </Typography>
                          </CardContent>
                      </Card>
                  </Grid>

                  {/* Equipment Accordions */}
                  <Grid item xs={12}>
                      {equipments.map((eq: any, i: number) => (
                          <Accordion key={i} variant="outlined" sx={{ mb: 1 }}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                                      <Typography sx={{ fontWeight: 'bold', minWidth: 80 }}>{eq.id}</Typography>
                                      <Typography sx={{ color: 'text.secondary', flexGrow: 1 }}>{eq.name}</Typography>
                                      <Chip label={eq.category} size="small" variant="outlined" />
                                  </Stack>
                              </AccordionSummary>
                              <AccordionDetails>
                                  <Grid container spacing={2}>
                                      <Grid item xs={12} md={6}>
                                          <Typography variant="subtitle2" gutterBottom color="secondary">Calculated Parameters</Typography>
                                          <Table size="small">
                                              <TableBody>
                                                  {eq.sizing_parameters?.map((param: any, j: number) => (
                                                      <TableRow key={j}>
                                                          <TableCell sx={{ pl: 0, border: 'none', textTransform: 'capitalize' }}>
                                                              {param.name.replace(/_/g, ' ')}
                                                          </TableCell>
                                                          <TableCell align="right" sx={{ fontWeight: 'bold', border: 'none' }}>
                                                              {param.quantity?.value ?? '-'} {param.quantity?.unit}
                                                          </TableCell>
                                                      </TableRow>
                                                  ))}
                                              </TableBody>
                                          </Table>
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                          <Typography variant="subtitle2" gutterBottom color="secondary">Engineering Notes</Typography>
                                          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default', minHeight: 80 }}>
                                              <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap' }}>
                                                  {eq.notes}
                                              </Typography>
                                          </Paper>
                                      </Grid>
                                  </Grid>
                              </AccordionDetails>
                          </Accordion>
                      ))}
                  </Grid>
              </Grid>
          )}
      </Box>
    </Box>
  );
};
