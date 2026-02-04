import { useMemo, useState } from 'react';
import { 
  Alert,
  Box, 
  Button, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper, 
  Stack, 
  CircularProgress,
  Tab,
  Tabs,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Typography
} from '@mui/material';
import { 
  AutoAwesome as MagicIcon,
  CheckCircle as ConfirmIcon,
  Edit as EditIcon,
  Inventory as AssetIcon,
  TableChart as StructureIcon
} from '@mui/icons-material';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';

const safeParse = (str?: string) => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);

export const CatalogView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 streams, 1 equipment
  const [isEditing, setIsEditing] = useState(false);
  const [draftJson, setDraftJson] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const catalogData = useMemo(() => safeParse(designState.catalog_template), [designState.catalog_template]);
  const streams = useMemo(() => (catalogData?.streams ?? []) as any[], [catalogData]);
  const equipments = useMemo(() => (catalogData?.equipments ?? []) as any[], [catalogData]);

  const handleRunCatalog = async () => {
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      const result = await runAgent('catalog_agent', { 
        prompt: 'Generate Catalog',
        flowsheet: designState.flowsheet_description,
        design_basis: designState.selected_concept_details,
        requirements: designState.process_requirements,
        concept_details: designState.selected_concept_details,
      });
      
      if (result.status === 'completed' && result.data?.output) {
        updateDesignState({ catalog_template: result.data.output });
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
    const nextStep = steps[currentIndex + 1];
    if (nextStep) {
      setActiveStep(nextStep.id);
    }
  };

  const handleOpenEditor = () => {
    const parsed = catalogData ?? safeParse(designState.catalog_template);
    const initial = parsed ? prettyJson(parsed) : (designState.catalog_template || '');
    setDraftJson(initial);
    setDraftError(null);
    setIsEditing(true);
  };

  const handleDraftChange = (value: string) => {
    setDraftJson(value);
    try {
      JSON.parse(value);
      setDraftError(null);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const handleSaveDraft = () => {
    const parsed = JSON.parse(draftJson);
    updateDesignState({ catalog_template: prettyJson(parsed) });
    updateStepStatus(activeStepId, 'completed');
    setIsEditing(false);
  };

  const hasTemplate = Boolean(designState.catalog_template);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">Stream + Equipment Template</Typography>
          <Typography variant="caption" color="text.secondary">
            Review and optionally edit the template before running the simulation.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button 
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <MagicIcon />} 
            onClick={handleRunCatalog} 
            variant="contained" 
            color="primary"
            disabled={loading || !designState.flowsheet_description}
          >
            {hasTemplate ? 'Re-generate Template' : 'Generate Template'}
          </Button>
          <Button
            startIcon={<EditIcon />}
            onClick={handleOpenEditor}
            variant="outlined"
            disabled={!hasTemplate}
          >
            Edit Template
          </Button>
          <Button 
            startIcon={<ConfirmIcon />} 
            onClick={handleConfirmAndNext} 
            variant={hasTemplate ? 'contained' : 'outlined'}
            color="success"
            disabled={!hasTemplate}
          >
            Confirm & Next
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Streams" disabled={!hasTemplate} />
          <Tab label="Equipment" disabled={!hasTemplate} />
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {!hasTemplate ? (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, flexDirection: 'column', gap: 2 }}>
            <StructureIcon sx={{ fontSize: 60 }} />
            <Typography variant="body2">Generate the template to continue.</Typography>
          </Box>
        ) : (
          <>
            {activeTab === 0 && (
              <Box sx={{ height: '100%', overflow: 'auto' }}>
                <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, maxHeight: 'calc(100vh - 260px)' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>ID</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Phase</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>From</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>To</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {streams.map((stream: any) => (
                        <TableRow key={stream.id} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{stream.id}</TableCell>
                          <TableCell>{stream.name}</TableCell>
                          <TableCell>{stream.phase}</TableCell>
                          <TableCell>{stream.from}</TableCell>
                          <TableCell>{stream.to}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {activeTab === 1 && (
              <Box sx={{ height: '100%', overflow: 'auto' }}>
                {equipments.length === 0 ? (
                  <Box sx={{ p: 10, textAlign: 'center', opacity: 0.6 }}>
                    <AssetIcon sx={{ fontSize: 60, mb: 2 }} />
                    <Typography>No equipment template entries found.</Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, maxHeight: 'calc(100vh - 260px)' }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Tag</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>In</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'transparent' }}>Out</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {equipments.map((eq: any) => (
                          <TableRow key={eq.id} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{eq.id}</TableCell>
                            <TableCell>{eq.name}</TableCell>
                            <TableCell>{eq.category}</TableCell>
                            <TableCell>{eq.type}</TableCell>
                            <TableCell>{Array.isArray(eq.streams_in) ? eq.streams_in.join(', ') : ''}</TableCell>
                            <TableCell>{Array.isArray(eq.streams_out) ? eq.streams_out.join(', ') : ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </>
        )}
      </Box>

      <Dialog open={isEditing} onClose={() => setIsEditing(false)} fullWidth maxWidth="md">
        <DialogTitle>Edit Stream + Equipment Template (JSON)</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {draftError && <Alert severity="error">{draftError}</Alert>}
          <TextField
            multiline
            minRows={16}
            value={draftJson}
            onChange={(e) => handleDraftChange(e.target.value)}
            spellCheck={false}
            sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditing(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSaveDraft} variant="contained" disabled={Boolean(draftError)}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

