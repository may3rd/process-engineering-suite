# Hydraulic Network Web Application - Design Documentation

## 1. Application Architecture and Technology Stack

### 1.1 Technology Stack

#### Frontend (React Application)
- **Framework**: React 18+ with TypeScript
- **State Management**: Zustand (lightweight alternative to Redux)
- **UI Library**: Material-UI (MUI) v5 for professional components
- **Forms**: React Hook Form with Yup validation
- **Data Visualization**: 
  - Chart.js/Recharts for charts and graphs
  - D3.js for network topology visualization
  - React Flow for interactive pipe network diagrams
- **HTTP Client**: Axios for API communication
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Styled-components or CSS-in-JS with MUI theming
- **File Handling**: React Dropzone for configuration file upload

#### Backend Integration
- **Python Integration**: Multiple approaches for running network-hydraulic:
  1. **FastAPI Backend** (Recommended): REST API wrapper around network-hydraulic
  2. **Direct Python Execution**: Child process execution with Python bridge
  3. **WebAssembly**: Compile network-hydraulic to WASM for browser execution
  4. **Serverless Functions**: AWS Lambda or similar for calculation execution

#### Development Tools
- **Package Manager**: npm or yarn
- **Linting**: ESLint with TypeScript support
- **Code Formatting**: Prettier
- **Testing**: Jest + React Testing Library
- **E2E Testing**: Cypress or Playwright

### 1.2 Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Web Application                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Config UI  │  │ Results UI  │  │   Visualization     │  │
│  │   Forms     │  │   Tables    │  │    Components       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│               State Management (Zustand)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ File Upload │  │ API Client  │  │   Validation &      │  │
│  │  Handler    │  │   (Axios)   │  │   Error Handling    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                Backend Integration Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   FastAPI   │  │   Python    │  │   JSON/YAML         │  │
│  │   Server    │  │   Bridge    │  │   Serialization     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│              Network-Hydraulic Python Library               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Models    │  │  Solvers    │  │   I/O & Results     │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 2. Component Hierarchy and Data Flow Design

### 2.1 Component Architecture

```
App
├── Layout
│   ├── Header
│   ├── Navigation
│   ├── MainContent
│   └── Footer
├── Configuration
│   ├── NetworkSettings
│   │   ├── BoundaryConditions (Pressure, Temperature)
│   │   ├── FlowDirection
│   │   ├── MassFlowRate
│   │   └── OutputUnits
│   ├── FluidProperties
│   │   ├── PhaseSelection
│   │   ├── Properties
│   │   └── Others
│   └── PipeSections
│       ├── SectionList
│       ├── SectionEditor
│       ├── PipeProperties
│       ├── FittingsSelector
│       ├── ElevationProfile
│       └── Components
│           ├── ControlValve
│           ├── Orifice
│           └── UserDefinedLosses
├── Calculation
│   ├── SolverControls
│   ├── ProgressIndicator
│   ├── ValidationPanel
│   └── ExecutionStatus
└── Results
    ├── SummaryDashboard
    ├── SectionResults
    ├── Visualization
    │   ├── NetworkDiagram
    │   ├── PressureProfile
    │   ├── FlowCharacteristics
    │   └── LossBreakdown
    ├── Reports
    │   ├── ExecutiveSummary
    │   ├── DetailedReport
    │   ├── ExportOptions
    │   └── PrintLayout
    └── History
        ├── SavedCalculations
        ├── ComparisonTools
        └── VersionControl
```

### 2.2 State Management Structure (Zustand Stores)

```typescript
// Configuration Store
interface ConfigurationStore {
  network: NetworkConfig;
  fluid: FluidConfig;
  sections: PipeSection[];
  validation: ValidationState;
  actions: {
    updateNetwork: (network: Partial<NetworkConfig>) => void;
    updateFluid: (fluid: Partial<FluidConfig>) => void;
    addSection: (section: PipeSection) => void;
    updateSection: (id: string, updates: Partial<PipeSection>) => void;
    removeSection: (id: string) => void;
    validateConfiguration: () => ValidationResult;
    resetConfiguration: () => void;
    loadConfiguration: (config: ConfigFile) => void;
  };
}

// Calculation Store
interface CalculationStore {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  result: CalculationResult | null;
  error: string | null;
  configuration: string;
  actions: {
    startCalculation: () => Promise<void>;
    cancelCalculation: () => void;
    setProgress: (progress: number) => void;
    setResult: (result: CalculationResult) => void;
    setError: (error: string) => void;
    clearResult: () => void;
  };
}

// UI Store
interface UIStore {
  activeView: 'config' | 'results' | 'history';
  theme: 'light' | 'dark';
  sidebarExpanded: boolean;
  notifications: Notification[];
  actions: {
    setActiveView: (view: 'config' | 'results' | 'history') => void;
    toggleTheme: () => void;
    toggleSidebar: () => void;
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
  };
}
```

### 2.3 Data Flow Architecture

```
User Interaction
       ↓
React Components (Controlled Inputs)
       ↓
Zustand Store Updates
       ↓
Validation Layer (Yup Schemas)
       ↓
API Client (Axios)
       ↓
FastAPI Backend
       ↓
Python Network-Hydraulic Library
       ↓
Calculation Execution
       ↓
Result Processing
       ↓
JSON Response
       ↓
Frontend State Update
       ↓
UI Re-render with Results
```

### 2.4 Section Calculation Semantics

The frontend must mirror the solver’s “single component per section” rules so users understand how data will be interpreted:

- **Pipeline-first**: If a section includes a non-zero pipe length, the solver treats it as a pipeline span. All fittings, friction, and elevation losses are computed, and any configured control valve or orifice in that section is ignored for pressure-drop purposes (still retained for documentation/metadata).
- **Component-only sections**: If length is omitted or zero, the UI should require exactly one component. The solver will select a single drop source using the priority below:
  1. **Control valve** – takes precedence when present; the orifice configuration is ignored.
  2. **Orifice** – used only when no control valve exists and a valid flow rate is available.
  3. **User-defined fixed loss** – treated as its own component when no valve or orifice is configured; otherwise ignored. This lets engineers model vendor data or miscellaneous losses without inventing fittings.
- **Pipeline sections**: Any section with non-zero length automatically behaves as a pipeline span. All components (control valve, orifice, user-defined loss) entered in that section are considered documentation-only; their drops are ignored in the calculation.
- **Validation guidance**: Form validation should surface these priorities (e.g., warning banners when both valve and orifice are present, tooltips explaining that the section acts as a pipeline vs. device). This avoids confusion when the results view shows only one loss contributor.

Surfacing these rules in the React state/schema layer keeps the UI consistent with the current Python calculation engine and reduces support questions about “missing” component drops.

## 3. User Interface Design

### 3.1 Main Layout Design

#### Navigation Structure
- **Left Sidebar**: Configurator panels (collapsible)
- **Main Content**: Active view content area
- **Top Header**: Global actions, theme toggle, save/load
- **Status Bar**: Calculation status and progress

#### View Management
```
┌─────────────────────────────────────────┐
│ Header: [Logo] [Save] [Load] [Theme] [] │
├─────────────────────────────────────────┤
│   │                                 │   │
│   │                                 │   │
│ S │  Main Content Area              │   │
│ i │  - Configuration Forms          │ R │
│ d │  - Results Dashboard            │ i │
│ e │  - Network Visualization        │ g │
│ b │  - Reports & Export             │ h │
│ a │                                 │ t │
│ r │                                 │   │
│   │                                 │   │
└─────────────────────────────────────────┘
```

### 3.2 Configuration Interface Design

#### Network Settings Panel
- **Boundary Conditions**:
  - Boundary pressure
  - Boundary Temperature
- **Flow Conditions**:
  - Mass flow rate
  - Design margin percentage
- **Flow Direction**: Forward/Backward
- **Gas Flow Model**: Isothermal/Adiabatic (for gas phases)
- **Output Units**: Dropdown selectors for each unit type

#### Fluid Properties Panel
- **Phase Selection**: Radio buttons for liquid/gas
- **Properties** (shown when needed):
  - Density (fixed for liquid, auto-calculated for gases)
  - Molecular weight (for gases)
  - Z-factor (for gases)
  - Specific heat ratio (for gases)
  - Viscosity

#### Pipe Section Editor
- **Section List**: Tabular view with add/edit/delete actions
- **Section Component**: (only one per section)
  - **Pipeline**: (add/edit/delete)
    - Basic geometry (NPS/schedule or direct diameter)
    - Length and elevation change
    - Roughness (with typical values)
    - **Fittings Selector**: (add/edit/delete)
    - Visual fitting library
    - K-factor lookup table
    - Drag-and-drop interface
  - **Control Valve**: (add/edit/delete)
   
  - **Orifice**: (add/edit/delete)
  - **User-Defined Losses**: (add/edit/delete)

### 3.3 Results Display Design

#### Executive Dashboard
```
┌─────────────────────────────────────────────────────────┐
│                    RESULTS SUMMARY                      │
├─────────────────────────────────────────────────────────┤
│ Total Pressure Drop:    199.7 kPa                       │
│ Maximum Velocity:       4.30 m/s                        │
│ Design Margin Applied:  0.0%                            │
│ Critical Conditions:    None Detected                   │
├─────────────────────────────────────────────────────────┤
│ INLET                   │ OUTLET                        │
│ Pressure: 101.0 kPa     │ Pressure: 300.7 kPa           │
│ Temperature: 103.4°C    │ Temperature: 103.4°C          │
│ Density: 783.4 kg/m³    │ Density: 783.4 kg/m³          │
│ Velocity: 1.09 m/s      │ Velocity: 4.30 m/s            │
└─────────────────────────────────────────────────────────┘
```

#### Detailed Results Tables
- **Section-by-Section Breakdown**
- **Loss Component Analysis**
- **Flow Characteristics**
- **Component Performance**

#### Interactive Visualization
- **Network Topology Diagram**: Interactive pipe network layout
- **Pressure Profile Chart**: Pressure vs. distance
- **Velocity Distribution**: Flow velocity along network
- **Loss Breakdown Pie Chart**: Relative contribution of different loss types

## 4. Backend API Integration Strategy

### 4.1 FastAPI Backend Architecture

```python
# FastAPI Application Structure
from fastapi import FastAPI, BackgroundTasks, File, UploadFile
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import json
import yaml
from pathlib import Path

app = FastAPI(title="Hydraulic Network Calculator API")

class ConfigurationModel(BaseModel):
    network: Dict[str, Any]
    fluid: Dict[str, Any] 
    sections: List[Dict[str, Any]]
    components: Optional[List[Dict[str, Any]]] = []

class CalculationRequest(BaseModel):
    configuration: ConfigurationModel
    options: Optional[Dict[str, Any]] = {}

class CalculationResponse(BaseModel):
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None
    warnings: Optional[List[str]] = []

# API Endpoints
@app.post("/api/calculate")
async def calculate_hydraulics(
    request: CalculationRequest,
    background_tasks: BackgroundTasks
) -> CalculationResponse:
    """Execute hydraulic calculation"""
    
@app.post("/api/validate")
async def validate_configuration(
    config: ConfigurationModel
) -> Dict[str, Any]:
    """Validate configuration without running calculation"""
    
@app.post("/api/upload-config")
async def upload_configuration(
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """Upload YAML/JSON configuration file"""
    
@app.get("/api/templates")
async def get_configuration_templates() -> Dict[str, List[str]]:
    """Get sample configuration templates"""
    
@app.get("/api/fittings/{fitting_type}")
async def get_fitting_properties(
    fitting_type: str
) -> Dict[str, Any]:
    """Get fitting properties and K-factors"""
```

### 4.2 Python Integration Layer

```python
# Integration layer to wrap network-hydraulic
import sys
sys.path.append('/path/to/network-hydraulic/src')

from network_hydraulic.io.loader import ConfigurationLoader
from network_hydraulic.solver.network_solver import NetworkSolver
from network_hydraulic.io import results as results_io

class HydraulicCalculator:
    def __init__(self):
        self.solver = NetworkSolver()
    
    def calculate(self, configuration: dict) -> dict:
        try:
            # Convert API request to network-hydraulic format
            network = self._build_network_from_config(configuration)
            
            # Execute calculation
            result = self.solver.run(network)
            
            # Convert results to API response format
            return self._format_results(result, network)
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "result": None
            }
    
    def validate(self, configuration: dict) -> dict:
        try:
            # Validate configuration without full calculation
            network = self._build_network_from_config(configuration)
            return {"valid": True, "errors": []}
        except Exception as e:
            return {"valid": False, "errors": [str(e)]}
```

### 4.3 Real-time Communication

#### WebSocket for Progress Updates
```typescript
// Frontend WebSocket connection
const ws = new WebSocket('ws://localhost:8000/ws/calculation');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  switch (update.type) {
    case 'progress':
      setCalculationProgress(update.progress);
      break;
    case 'warning':
      addNotification({ type: 'warning', message: update.message });
      break;
    case 'complete':
      setCalculationResult(update.result);
      break;
    case 'error':
      setCalculationError(update.error);
      break;
  }
};
```

#### Server-Sent Events Alternative
```python
@app.get("/api/calculate/stream/{calculation_id}")
async def calculation_stream(calculation_id: str):
    async def generate():
        # Stream calculation progress
        for progress in calculate_with_progress(calculation_id):
            yield f"data: {json.dumps(progress)}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

## 5. Data Validation and Error Handling

### 5.1 Frontend Validation Strategy

#### React Hook Form with Yup Schemas
```typescript
import * as yup from 'yup';

// Fluid validation schema
const fluidSchema = yup.object({
  phase: yup.string().oneOf(['liquid', 'gas', 'vapor']).required(),
  temperature: yup.number().positive().required(),
  pressure: yup.number().positive().required(),
  density: yup.number().when('phase', {
    is: 'liquid',
    then: yup.number().positive().required(),
    otherwise: yup.number().positive()
  }),
  molecular_weight: yup.number().when('phase', {
    is: (phase: string) => phase !== 'liquid',
    then: yup.number().positive().required(),
    otherwise: yup.number().notRequired()
  }),
  // ... other validations
});

// Real-time validation on change
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(fluidSchema),
  mode: 'onChange'
});
```

#### Configuration Validation
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}
```

### 5.2 Backend Validation

#### Pydantic Models for Request Validation
```python
from pydantic import BaseModel, validator, Field
from typing import Optional, List

class FluidConfig(BaseModel):
    phase: str = Field(..., regex="^(liquid|gas|vapor)$")
    temperature: float = Field(..., gt=0)
    pressure: float = Field(..., gt=0)
    density: Optional[float] = Field(None, gt=0)
    molecular_weight: Optional[float] = Field(None, gt=0)
    
    @validator('density')
    def validate_density_for_liquid(cls, v, values):
        if values.get('phase') == 'liquid' and v is None:
            raise ValueError('Density required for liquid phase')
        return v
    
    @validator('molecular_weight')
    def validate_mw_for_gas(cls, v, values):
        if values.get('phase') in ['gas', 'vapor'] and v is None:
            raise ValueError('Molecular weight required for gas/vapor phase')
        return v
```

#### Business Logic Validation
```python
def validate_network_configuration(config: dict) -> List[ValidationIssue]:
    issues = []
    
    # Check flow consistency
    fluid = config.get('fluid', {})
    if fluid.get('mass_flow_rate') and fluid.get('volumetric_flow_rate'):
        # Check if mass flow matches volumetric flow
        if not _flow_rates_consistent(fluid):
            issues.append(ValidationIssue(
                field='fluid',
                message='Mass and volumetric flow rates are inconsistent',
                severity='warning'
            ))
    
    # Check section continuity
    sections = config.get('sections', [])
    for i, section in enumerate(sections[:-1]):
        next_section = sections[i + 1]
        if not _diameters_compatible(section, next_section):
            issues.append(ValidationIssue(
                field=f'sections[{i}].outlet_diameter',
                message=f'Diameter mismatch with next section',
                severity='error'
            ))
    
    return issues
```

### 5.3 Error Handling Strategy

#### Frontend Error Boundaries
```typescript
class CalculationErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error('Calculation error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorAlert
          title="Calculation Error"
          message={this.state.error?.message || 'An unexpected error occurred'}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}
```

#### Backend Exception Handling
```python
from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": "Configuration Error",
            "details": str(exc),
            "error_type": "validation_error"
        }
    )

@app.exception_handler(NotImplementedError)
async def not_implemented_handler(request: Request, exc: NotImplementedError):
    return JSONResponse(
        status_code=501,
        content={
            "success": False,
            "error": "Feature Not Implemented",
            "details": str(exc),
            "error_type": "not_implemented"
        }
    )
```

## 6. Results Visualization and Reporting Features

### 6.1 Interactive Network Visualization

#### Network Topology Diagram
```typescript
// Using React Flow for interactive network diagram
import ReactFlow, { 
  Node, 
  Edge, 
  addEdge, 
  Connection, 
  useNodesState, 
  useEdgesState 
} from 'reactflow';

const NetworkDiagram: React.FC<{ sections: PipeSection[] }> = ({ sections }) => {
  const initialNodes: Node[] = sections.map((section, index) => ({
    id: section.id,
    type: 'pipeNode',
    position: { x: index * 200, y: section.elevation_change * 10 },
    data: { 
      label: `${section.id}: ${section.pipe_diameter}"`,
      flow_rate: section.flow_rate,
      pressure: section.pressure
    },
  }));

  const initialEdges: Edge[] = sections.slice(0, -1).map((section, index) => ({
    id: `${section.id}-${sections[index + 1].id}`,
    source: section.id,
    target: sections[index + 1].id,
    type: 'pipeConnection',
    label: `ΔP: ${section.pressure_drop.toFixed(1)} kPa`,
    style: { strokeWidth: Math.sqrt(section.flow_rate) * 2 },
  }));

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      />
    </div>
  );
};
```

#### Pressure Profile Visualization
```typescript
// Pressure vs distance chart using Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PressureProfileChart: React.FC<{ results: CalculationResult }> = ({ results }) => {
  const data = results.sections.map(section => ({
    position: section.position,
    inletPressure: section.inlet_pressure,
    outletPressure: section.outlet_pressure,
    elevation: section.elevation,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="position" label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5 }} />
        <YAxis label={{ value: 'Pressure (kPa)', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value: any) => `${value.toFixed(1)} kPa`} />
        <Line type="monotone" dataKey="inletPressure" stroke="#8884d8" name="Inlet Pressure" />
        <Line type="monotone" dataKey="outletPressure" stroke="#82ca9d" name="Outlet Pressure" />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

### 6.2 Comprehensive Report Generation

#### Executive Summary Report
```typescript
interface ExecutiveSummary {
  networkName: string;
  totalPressureDrop: number;
  maxVelocity: number;
  criticalConditions: string[];
  designMarginApplied: number;
  recommendations: string[];
}

const ExecutiveReport: React.FC<{ summary: ExecutiveSummary }> = ({ summary }) => (
  <ReportSection title="Executive Summary">
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <MetricCard
          title="Total Pressure Drop"
          value={`${summary.totalPressureDrop.toFixed(1)} kPa`}
          trend={summary.totalPressureDrop > 100 ? 'high' : 'normal'}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <MetricCard
          title="Maximum Velocity"
          value={`${summary.maxVelocity.toFixed(2)} m/s`}
          trend={summary.maxVelocity > 10 ? 'high' : 'normal'}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h6">Recommendations</Typography>
        <List>
          {summary.recommendations.map((rec, index) => (
            <ListItem key={index}>
              <ListItemIcon><WarningIcon /></ListItemIcon>
              <ListItemText primary={rec} />
            </ListItem>
          ))}
        </List>
      </Grid>
    </Grid>
  </ReportSection>
);
```

#### Detailed Results Table
```typescript
const DetailedResultsTable: React.FC<{ results: CalculationResult }> = ({ results }) => {
  const columns = [
    { id: 'sectionId', label: 'Section ID', minWidth: 80 },
    { id: 'inletPressure', label: 'Inlet Pressure (kPa)', minWidth: 120, format: (value: number) => value.toFixed(1) },
    { id: 'outletPressure', label: 'Outlet Pressure (kPa)', minWidth: 120, format: (value: number) => value.toFixed(1) },
    { id: 'pressureDrop', label: 'Pressure Drop (kPa)', minWidth: 120, format: (value: number) => value.toFixed(1) },
    { id: 'velocity', label: 'Velocity (m/s)', minWidth: 100, format: (value: number) => value.toFixed(2) },
    { id: 'reynoldsNumber', label: 'Reynolds Number', minWidth: 120, format: (value: number) => value.toFixed(0) },
    { id: 'frictionFactor', label: 'Friction Factor', minWidth: 100, format: (value: number) => value.toFixed(4) },
    { id: 'remarks', label: 'Remarks', minWidth: 150 },
  ];

  return (
    <Paper>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} style={{ minWidth: column.minWidth }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {results.sections.map((section) => (
              <TableRow key={section.id}>
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    {column.format ? column.format(section[column.id]) : section[column.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
```

### 6.3 Export and Print Features

#### Multiple Export Formats
```typescript
const ExportOptions: React.FC<{ results: CalculationResult }> = ({ results }) => {
  const exportToPDF = async () => {
    const doc = new jsPDF();
    // Generate PDF report
    doc.text('Hydraulic Network Analysis Report', 20, 20);
    // ... add content
    doc.save('hydraulic-analysis-report.pdf');
  };

  const exportToExcel = async () => {
    const ws = XLSX.utils.json_to_sheet(results.sections);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, 'hydraulic-results.xlsx');
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'calculation-results.json';
    link.click();
  };

  return (
    <ButtonGroup>
      <Button onClick={exportToPDF} startIcon={<PictureAsPdfIcon />}>Export PDF</Button>
      <Button onClick={exportToExcel} startIcon={<TableChartIcon />}>Export Excel</Button>
      <Button onClick={exportToJSON} startIcon={<CodeIcon />}>Export JSON</Button>
    </ButtonGroup>
  );
};
```

#### Print-Optimized Layout
```typescript
const PrintLayout: React.FC<{ results: CalculationResult }> = ({ results }) => (
  <Box className="print-layout">
    {/* Print-only styles for optimal layout */}
    <style>{`
      @media print {
        .no-print { display: none !important; }
        .print-page { page-break-after: always; }
        body { font-size: 12pt; }
        h1 { font-size: 18pt; }
        h2 { font-size: 16pt; }
        h3 { font-size: 14pt; }
      }
    `}</style>
    
    <div className="print-header">
      <Typography variant="h4">Hydraulic Network Analysis</Typography>
      <Typography variant="subtitle1">{results.networkName}</Typography>
      <Typography variant="body2">
        Generated on: {new Date().toLocaleDateString()}
      </Typography>
    </div>

    <div className="print-page">
      <ExecutiveSummary results={results.summary} />
    </div>

    <div className="print-page">
      <DetailedResults results={results} />
    </div>

    <div className="print-page">
      <NetworkDiagramVisualization results={results} />
    </div>
  </Box>
);
```

## 7. Implementation Roadmap and Development Phases

### Phase 1: Core Infrastructure (Weeks 1-3)
**Goals**: Establish basic project structure and backend integration

**Tasks**:
1. **Project Setup**
   - Initialize React TypeScript project with Vite
   - Configure development environment (ESLint, Prettier, testing)
   - Set up project structure and component architecture
   - Configure Zustand for state management

2. **FastAPI Backend**
   - Create FastAPI server structure
   - Implement basic calculation endpoint
   - Set up Python integration with network-hydraulic
   - Create configuration validation endpoints

3. **Basic UI Components**
   - Implement layout structure (header, sidebar, main content)
   - Create fluid properties form component
   - Implement basic validation with React Hook Form
   - Add file upload functionality for YAML/JSON configs

**Deliverables**:
- Working development environment
- Basic backend API
- Simple configuration interface
- File upload/validation functionality

### Phase 2: Configuration Interface (Weeks 4-6)
**Goals**: Complete configuration management system

**Tasks**:
1. **Advanced Configuration Forms**
   - Network settings panel
   - Pipe section editor with table interface
   - Fittings selector with visual library
   - Component configuration (valves, orifices)

2. **Real-time Validation**
   - Implement comprehensive Yup validation schemas
   - Add real-time field validation feedback
   - Create configuration consistency checks
   - Implement template system for common configurations

3. **State Management Enhancement**
   - Implement all Zustand stores (config, calculation, UI)
   - Add configuration persistence (local storage)
   - Create configuration import/export functionality
   - Implement undo/redo capabilities

**Deliverables**:
- Complete configuration interface
- Real-time validation system
- Template management
- Configuration persistence

### Phase 3: Calculation Engine Integration (Weeks 7-8)
**Goals**: Integrate calculation execution and monitoring

**Tasks**:
1. **Calculation Execution**
   - Implement calculation API integration
   - Add progress tracking with WebSocket/SSE
   - Create calculation cancellation functionality
   - Implement result caching and history

2. **Error Handling & Monitoring**
   - Comprehensive error boundary implementation
   - Calculation timeout handling
   - Progress monitoring and user feedback
   - Logging and debugging tools

3. **Performance Optimization**
   - Implement calculation result caching
   - Add debouncing for validation updates
   - Optimize large configuration handling
   - Create background calculation queue

**Deliverables**:
- Working calculation execution
- Progress monitoring
- Error handling system
- Performance optimizations

### Phase 4: Results Visualization (Weeks 9-11)
**Goals**: Create comprehensive results display and analysis

**Tasks**:
1. **Basic Results Display**
   - Executive summary dashboard
   - Detailed results tables
   - Section-by-section breakdown
   - Export functionality (PDF, Excel, JSON)

2. **Interactive Visualizations**
   - Network topology diagram (React Flow)
   - Pressure profile charts (Recharts)
   - Flow characteristic graphs
   - Loss breakdown visualizations

3. **Report Generation**
   - Executive summary reports
   - Detailed technical reports
   - Print-optimized layouts
   - Automated report templates

**Deliverables**:
- Complete results dashboard
- Interactive visualizations
- Report generation system
- Export capabilities

### Phase 5: Advanced Features (Weeks 12-13)
**Goals**: Add advanced functionality and optimization

**Tasks**:
1. **Advanced Analysis**
   - Sensitivity analysis tools
   - Optimization suggestions
   - Comparative analysis (before/after)
   - What-if scenario modeling

2. **User Experience Enhancements**
   - Keyboard shortcuts and accessibility
   - Dark/light theme implementation
   - Responsive design for mobile/tablet
   - Advanced filtering and search

3. **Integration & API**
   - RESTful API documentation
   - Authentication system (if needed)
   - Database integration for history
   - Third-party integrations

**Deliverables**:
- Advanced analysis tools
- Enhanced user experience
- API documentation
- Integration capabilities

### Phase 6: Testing & Deployment (Week 14)
**Goals**: Comprehensive testing and production deployment

**Tasks**:
1. **Testing Implementation**
   - Unit tests for components and utilities
   - Integration tests for API endpoints
   - E2E tests for user workflows
   - Performance testing and optimization

2. **Production Deployment**
   - Docker containerization
   - CI/CD pipeline setup
   - Production environment configuration
   - Monitoring and logging setup

3. **Documentation & Training**
   - User documentation and tutorials
   - Developer documentation
   - API documentation
   - Video tutorials and demos

**Deliverables**:
- Comprehensive test suite
- Production deployment
- Complete documentation
- Training materials

## 8. Technical Specifications and API Contracts

### 8.1 API Specification

#### Request/Response Models
```typescript
// Configuration Models
interface FluidConfiguration {
  name?: string;
  phase: 'liquid' | 'gas' | 'vapor';
  temperature: number; // Kelvin
  pressure: number; // Pascal
  density?: number; // kg/m³ (required for liquids)
  molecularWeight?: number; // kg/kmol (required for gases)
  zFactor?: number; // (required for gases)
  specificHeatRatio?: number; // (required for gases)
  viscosity: number; // Pa·s
  massFlowRate?: number; // kg/s
  volumetricFlowRate?: number; // m³/s
  standardFlowRate?: number; // m³/s
}

interface NetworkConfiguration {
  name: string;
  description?: string;
  direction: 'auto' | 'forward' | 'backward';
  boundaryPressure?: number; // Pascal
  upstreamPressure?: number; // Pascal
  downstreamPressure?: number; // Pascal
  gasFlowModel?: 'isothermal' | 'adiabatic';
  outputUnits?: OutputUnitsConfiguration;
  designMargin?: number; // percentage
}

interface PipeSection {
  id: string;
  description?: string;
  schedule: string;
  pipeNPD?: number; // Nominal Pipe Size (inches)
  pipeDiameter?: number; // meters (alternative to pipeNPD)
  inletDiameter?: number; // meters
  outletDiameter?: number; // meters
  roughness: number; // meters
  length: number; // meters
  elevationChange: number; // meters
  fittingType: 'LR' | 'SR';
  fittings: Fitting[];
  controlValve?: ControlValve;
  orifice?: Orifice;
  boundaryPressure?: number; // Pascal
  direction?: 'forward' | 'backward' | 'bidirectional';
  designMargin?: number; // percentage
  userSpecifiedFixedLoss?: number; // Pascal
}

interface CalculationRequest {
  configuration: {
    network: NetworkConfiguration;
    fluid: FluidConfiguration;
    sections: PipeSection[];
  };
  options?: {
    validateOnly?: boolean;
    includeDebugInfo?: boolean;
    outputFormat?: 'standard' | 'detailed';
  };
}

interface CalculationResult {
  success: boolean;
  network: {
    name: string;
    direction: string;
    boundaryPressure: number;
    fluid: FluidConfiguration;
  };
  sections: SectionResult[];
  summary: {
    inlet: StatePoint;
    outlet: StatePoint;
    pressureDrop: PressureDropSummary;
  };
  warnings?: string[];
  executionTime: number; // seconds
  metadata: {
    version: string;
    timestamp: string;
    solver: string;
  };
}
```

#### API Endpoints
```typescript
// RESTful API Structure
interface APIEndpoints {
  // Configuration Management
  'POST /api/config/validate': (config: CalculationRequest['configuration']) => ValidationResult;
  'POST /api/config/upload': (file: File) => CalculationRequest['configuration'];
  'GET /api/config/templates': () => { templates: ConfigurationTemplate[] };
  'GET /api/config/fittings/{type}': (type: string) => FittingProperties;

  // Calculation Execution
  'POST /api/calculate': (request: CalculationRequest) => CalculationResult;
  'GET /api/calculate/{id}/status': (id: string) => CalculationStatus;
  'POST /api/calculate/{id}/cancel': (id: string) => void;
  'GET /api/calculate/{id}/stream': (id: string) => AsyncIterable<CalculationUpdate>;

  // Results Management
  'GET /api/results/{id}': (id: string) => CalculationResult;
  'GET /api/results/{id}/export/{format}': (id: string, format: 'pdf' | 'excel' | 'json') => File;
  'GET /api/history': () => CalculationHistory[];
  'DELETE /api/results/{id}': (id: string) => void;

  // System Information
  'GET /api/system/status': () => SystemStatus;
  'GET /api/system/info': () => SystemInfo;
}
```

### 8.2 Error Handling Standards

#### Error Response Format
```typescript
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string; // For validation errors
    suggestion?: string;
  };
  timestamp: string;
  requestId: string;
}

enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  TIMEOUT = 'TIMEOUT'
}
```

#### Frontend Error Types
```typescript
interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
  suggestion?: string;
}

interface CalculationError {
  type: 'solver_error' | 'timeout' | 'configuration' | 'system';
  message: string;
  details?: any;
  recoverable: boolean;
}

interface FileUploadError {
  type: 'invalid_format' | 'too_large' | 'parse_error' | 'validation_failed';
  message: string;
  line?: number; // For YAML/JSON parsing errors
  field?: string; // For validation errors
}
```

### 8.3 Performance Specifications

#### Response Time Requirements
- Configuration validation: < 500ms
- Small calculations (< 10 sections): < 2s
- Medium calculations (10-50 sections): < 10s
- Large calculations (> 50 sections): < 30s
- File upload processing: < 1s per MB

#### Concurrent User Support
- Development/staging: 5-10 concurrent users
- Production: 50+ concurrent users
- Calculation queue: 20 parallel calculations maximum

#### Resource Usage
- Backend memory: < 2GB per calculation instance
- Frontend memory: < 500MB for complex networks
- File size limits: 10MB for configuration files
- Calculation history: 1000 results per user

### 8.4 Security Considerations

#### Input Validation
- All API inputs validated with Pydantic models
- File upload restrictions (size, type, content)
- SQL injection prevention (if database used)
- XSS prevention in user inputs

#### Authentication/Authorization (if needed)
- JWT token-based authentication
- Role-based access control
- API rate limiting
- CORS configuration

#### Data Protection
- Configuration data encryption at rest
- Secure communication (HTTPS/WSS)
- User data privacy compliance
- Audit logging for sensitive operations

## 9. Conclusion

This comprehensive design provides a robust foundation for developing a professional React web application for hydraulic network analysis. The architecture emphasizes user experience, scalability, and integration with the existing Python network-hydraulic library.

Key benefits of this approach:

1. **Modular Architecture**: Clean separation of concerns enables easy maintenance and extension
2. **Type Safety**: TypeScript throughout ensures robust development and fewer runtime errors  
3. **User Experience**: Modern, intuitive interface with real-time feedback and comprehensive results
4. **Performance**: Optimized for both small and large network calculations
5. **Integration**: Seamless connection with existing Python backend
6. **Extensibility**: Design supports future enhancements and additional features

The phased implementation approach ensures steady progress while maintaining quality and user feedback integration throughout the development process.

---

*This design document serves as the technical specification and architectural blueprint for the hydraulic network web application development project.*
