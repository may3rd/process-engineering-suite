import { useState } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  Stack, 
  CircularProgress, 
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Science as ScienceIcon, 
  CheckCircle as CheckIcon, 
  AutoAwesome as SparkleIcon,
  Factory as FactoryIcon,
  Lightbulb as IdeaIcon,
  RocketLaunch as RocketIcon
} from '@mui/icons-material';
import { useDesignStore } from '../../store/useDesignStore';
import { runAgent } from '../../lib/api';
import { runTurboPipeline } from '../../lib/turbo';
import { ResearchConcept } from '../../types';

const MaturityChip = ({ maturity }: { maturity: string }) => {
  let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
  let icon = <FactoryIcon fontSize="small" />;
  let label = maturity;

  if (maturity === 'conventional') {
    color = 'info'; // Blue
    label = 'Conventional';
  } else if (maturity === 'innovative') {
    color = 'success'; // Green
    icon = <IdeaIcon fontSize="small" />;
    label = 'Innovative';
  } else if (maturity === 'state_of_the_art') {
    color = 'secondary'; // Purple/Amber (depending on theme)
    icon = <RocketIcon fontSize="small" />;
    label = 'State of the Art';
  }

  return (
    <Chip 
      icon={icon} 
      label={label} 
      color={color} 
      size="small" 
      variant="outlined" 
      sx={{ textTransform: 'capitalize' }} 
    />
  );
};

export const ResearchView = () => {
  const { designState, updateDesignState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  const [loading, setLoading] = useState(false);
  const [selectedConceptIndex, setSelectedConceptIndex] = useState<number | null>(null);
  const [turboRunning, setTurboRunning] = useState(false);

  // Sync selection if already exists
  // (Logic to match existing selection with generated list would go here)

  const handleRunResearch = async () => {
    setLoading(true);
    updateStepStatus(activeStepId, 'running');
    try {
      // Pass the previous step's output (Requirements) as context
      const result = await runAgent('research_agent', { 
        prompt: designState.process_requirements || designState.problem_statement || '' 
      });
      
      if (result.status === 'completed' && result.data?.output) {
         // output is a stringified JSON object { concepts: [...] }
         let conceptsData;
         try {
            conceptsData = typeof result.data.output === 'string' 
                ? JSON.parse(result.data.output) 
                : result.data.output;
         } catch (e) {
             console.error("Failed to parse JSON", e);
             // Fallback if it's already an object
             conceptsData = result.data.output;
         }

         updateDesignState({ research_concepts: conceptsData });
         updateStepStatus(activeStepId, 'completed'); // Mark step as done once we have concepts? 
         // Or maybe keep it 'running' until selection? Let's say 'completed' means "Research Done".
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

  const handleSelectConcept = (index: number) => {
    setSelectedConceptIndex(index);
    if (designState.research_concepts?.concepts) {
        updateDesignState({ selected_concept: designState.research_concepts.concepts[index] });
    }
  };

  const handleConfirmSelection = async () => {
      updateStepStatus(activeStepId, 'completed');
      const currentIndex = steps.findIndex(s => s.id === activeStepId);
      if (currentIndex < steps.length - 1) {
          const nextStepId = steps[currentIndex + 1]!.id;
          setActiveStep(nextStepId);
          if (designState.turbo_mode) {
            setTurboRunning(true);
            await runTurboPipeline(nextStepId);
            setTurboRunning(false);
          }
      }
  };

  const concepts = designState.research_concepts?.concepts || [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header / Action Bar */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>Technology Selection</Typography>
          <Typography variant="caption" color="text.secondary">
            {concepts.length > 0 
                ? "Select the best technology pathway for your design." 
                : "Generate potential process technologies based on your requirements."}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
             <Button 
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ScienceIcon />} 
                onClick={handleRunResearch} 
                variant="contained" 
                color="primary"
                disabled={loading || !designState.process_requirements}
            >
              {concepts.length > 0 ? "Regenerate Concepts" : "Generate Concepts"}
            </Button>
            {concepts.length > 0 && (
                <Button 
                    startIcon={<CheckIcon />} 
                    onClick={handleConfirmSelection} 
                    variant="contained" 
                    color="success"
                    disabled={selectedConceptIndex === null || turboRunning}
                >
                    {designState.turbo_mode ? 'Confirm & Run Turbo' : 'Confirm Selection'}
                </Button>
            )}
        </Stack>
      </Paper>

      {/* Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {concepts.length === 0 ? (
            <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                opacity: 0.5 
            }}>
                <ScienceIcon sx={{ fontSize: 60, mb: 2 }} />
                <Typography>No concepts generated yet.</Typography>
            </Box>
        ) : (
            <Grid container spacing={3}>
                {concepts.map((concept, index) => (
                    <Grid item xs={12} md={6} lg={4} key={concept.name}>
                        <Card 
                            variant="outlined" 
                            sx={{ 
                                height: '100%', 
                                display: 'flex', 
                                flexDirection: 'column',
                                transition: 'all 0.2s',
                                borderWidth: selectedConceptIndex === index ? 2 : 1,
                                borderColor: selectedConceptIndex === index ? 'primary.main' : 'divider',
                                boxShadow: selectedConceptIndex === index ? 3 : 0,
                                transform: 'none',
                                cursor: 'pointer'
                            }}
                            onClick={() => handleSelectConcept(index)}
                        >
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                    <MaturityChip maturity={concept.maturity} />
                                    {selectedConceptIndex === index && <CheckIcon color="primary" />}
                                </Stack>
                                <Typography variant="h6" gutterBottom fontWeight="bold">
                                    {concept.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    {concept.description}
                                </Typography>
                                
                                <Divider sx={{ my: 1.5 }} />
                                
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                    Key Benefits
                                </Typography>
                                <List dense disablePadding>
                                    {(concept.key_benefits || []).map((benefit, i) => (
                                        <ListItem key={`${concept.name}-benefit-${i}`} disablePadding sx={{ mb: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 24 }}>
                                                <SparkleIcon fontSize="inherit" color="warning" />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary={benefit} 
                                                primaryTypographyProps={{ variant: 'caption' }} 
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                            <CardActions sx={{ p: 2, pt: 0, justifyContent: 'flex-end' }}>
                                <Button
                                  size="small"
                                  variant={selectedConceptIndex === index ? 'contained' : 'outlined'}
                                  color={selectedConceptIndex === index ? 'primary' : 'inherit'}
                                >
                                  {selectedConceptIndex === index ? 'Selected' : 'Select'}
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        )}
      </Box>
    </Box>
  );
};
