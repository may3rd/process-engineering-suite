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
  Typography
} from '@mui/material';
import { useDesignStore } from '../../store/useDesignStore';

// Placeholder data type
type Equipment = {
  tag: string;
  name: string;
  type: string;
  duty: string;
  material: string;
};

export const SpreadsheetView = () => {
  const { designState } = useDesignStore();
  
  const data = useMemo<Equipment[]>(() => 
    designState.equipment_list || [
      { tag: 'P-101', name: 'Feed Pump', type: 'Centrifugal', duty: '50 m3/h', material: 'CS' },
      { tag: 'E-101', name: 'Preheater', type: 'Shell & Tube', duty: '2.5 MW', material: 'CS/SS' },
    ], 
  [designState.equipment_list]);

  const columns = useMemo<ColumnDef<Equipment>[]>(
    () => [
      { accessorKey: 'tag', header: 'Tag' },
      { accessorKey: 'name', header: 'Description' },
      { accessorKey: 'type', header: 'Type' },
      { accessorKey: 'duty', header: 'Duty/Capacity' },
      { accessorKey: 'material', header: 'Material' },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1">Equipment List (Engineering Data)</Typography>
      </Paper>

      <TableContainer component={Paper} sx={{ flexGrow: 1 }}>
        <Table stickyHeader size="small">
          <TableHead>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableCell key={header.id} sx={{ fontWeight: 'bold', bgcolor: 'background.default' }}>
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
    </Box>
  );
};
