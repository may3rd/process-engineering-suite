import { useMemo } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender,
  ColumnDef
} from '@tanstack/react-table';
import { 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Typography,
  Stack,
  Button,
  Chip,
  Divider
} from '@mui/material';
import { 
  CheckCircle as ConfirmIcon,
  Inventory as AssetIcon,
  ArrowForward as NextIcon
} from '@mui/icons-material';
import { useDesignStore } from '../../store/useDesignStore';

// Real Equipment structure from Python agent
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

const safeParse = (str?: string) => {
  if (!str) return null;
  try { return JSON.parse(str); } 
  catch (e) { return null; }
};

export const EquipmentListView = () => {
  const { designState, updateStepStatus, activeStepId, setActiveStep, steps } = useDesignStore();
  
  const results = useMemo(() => safeParse(designState.full_simulation_results), [designState.full_simulation_results]);
  const data = useMemo<Equipment[]>(() => results?.equipments || [], [results]);

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
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleConfirmAndNext = () => {
      updateStepStatus(activeStepId, 'completed');
      const currentIndex = steps.findIndex(s => s.id === activeStepId);
      if (currentIndex < steps.length - 1) {
          setActiveStep(steps[currentIndex + 1].id);
      }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Action Bar */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">Asset Inventory (Equipment List)</Typography>
          <Typography variant="caption" color="text.secondary">
             Review the major equipment identified from the flowsheet and simulation.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
            <Button 
                startIcon={<ConfirmIcon />} 
                onClick={handleConfirmAndNext} 
                variant="contained" 
                color="success"
                disabled={data.length === 0}
            >
                Confirm & Next
            </Button>
        </Stack>
      </Paper>

      {/* Grid */}
      <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, maxHeight: 'calc(100vh - 250px)' }}>
        {data.length === 0 ? (
            <Box sx={{ p: 10, textAlign: 'center', opacity: 0.5 }}>
                <AssetIcon sx={{ fontSize: 60, mb: 2 }} />
                <Typography>No equipment data found. Please complete the Simulation step first.</Typography>
            </Box>
        ) : (
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
        )}
      </TableContainer>
    </Box>
  );
};
