import { Box, Typography, Container } from '@mui/material'

function App() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Process Design Agents
        </Typography>
        <Typography variant="body1">
          Scaffolding complete. Ready for implementation.
        </Typography>
      </Box>
    </Container>
  )
}

export default App
