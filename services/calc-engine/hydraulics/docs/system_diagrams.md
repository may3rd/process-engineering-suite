# System Architecture Diagrams

## Application Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React Components]
        State[Zustand State Management]
        Forms[React Hook Form + Yup]
        Charts[Chart.js + Recharts]
        Files[File Upload Handler]
    end
    
    subgraph "API Integration"
        Client[Axios HTTP Client]
        WS[WebSocket Client]
        Cache[Result Cache]
    end
    
    subgraph "Backend Layer"
        API[FastAPI Server]
        WS_SRV[WebSocket Server]
        Validation[Request Validation]
    end
    
    subgraph "Python Integration"
        Bridge[Python Bridge]
        Solver[NetworkHydraulic Solver]
        Models[Data Models]
    end
    
    subgraph "External"
        DB[(Optional Database)]
        FileSystem[File System]
        Logging[Logging Service]
    end
    
    UI --> State
    State --> Client
    Client --> API
    API --> Bridge
    Bridge --> Solver
    Solver --> Models
    
    State --> WS
    WS --> WS_SRV
    WS_SRV --> Solver
    
    API --> Validation
    API --> FileSystem
    API --> DB
    API --> Logging
```

## Component Hierarchy

```mermaid
graph TD
    App[App Component]
    
    subgraph "Layout Components"
        Header[Header]
        Sidebar[Sidebar Navigation]
        Main[Main Content]
        Footer[Footer]
    end
    
    subgraph "Configuration Views"
        ConfigTabs[Configuration Tabs]
        FluidPanel[Fluid Properties Panel]
        NetworkPanel[Network Settings Panel]
        SectionsPanel[Pipe Sections Panel]
        ComponentsPanel[Components Panel]
    end
    
    subgraph "Calculation Views"
        SolverPanel[Solver Control Panel]
        ProgressPanel[Progress Indicator]
        StatusPanel[Status Display]
    end
    
    subgraph "Results Views"
        ResultsTabs[Results Tabs]
        SummaryPanel[Executive Summary]
        DetailsPanel[Detailed Results]
        VisualizationPanel[Charts & Graphs]
        ReportsPanel[Reports & Export]
    end
    
    subgraph "Utility Components"
        FileUploader[File Upload]
        ValidationMessages[Validation Display]
        ErrorBoundary[Error Boundary]
        LoadingSpinner[Loading States]
    end
    
    App --> Header
    App --> Sidebar
    App --> Main
    App --> Footer
    
    Main --> ConfigTabs
    Main --> SolverPanel
    Main --> ResultsTabs
    
    ConfigTabs --> FluidPanel
    ConfigTabs --> NetworkPanel
    ConfigTabs --> SectionsPanel
    ConfigTabs --> ComponentsPanel
    
    ResultsTabs --> SummaryPanel
    ResultsTabs --> DetailsPanel
    ResultsTabs --> VisualizationPanel
    ResultsTabs --> ReportsPanel
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant UI as React Components
    participant Store as Zustand Store
    participant Form as React Hook Form
    participant API as FastAPI
    participant Python as NetworkHydraulic
    participant Results as Results Store
    
    User->>UI: Enter Configuration
    UI->>Form: Update Form Values
    Form->>Store: Validate & Update State
    Store->>API: Send Validation Request
    API->>Python: Validate Configuration
    Python-->>API: Validation Result
    API-->>Store: Validation Response
    Store-->>UI: Update Validation State
    UI-->>User: Show Validation Feedback
    
    User->>UI: Start Calculation
    UI->>Store: Trigger Calculation
    Store->>API: Send Calculation Request
    API->>Python: Execute Calculation
    
    loop Progress Updates
        Python->>API: Progress Update
        API->>Store: Progress Event
        Store->>UI: Update Progress
        UI-->>User: Show Progress
    end
    
    Python->>API: Calculation Complete
    API->>Store: Store Results
    Store->>Results: Update Results Store
    Store->>UI: Calculation Complete
    UI-->>User: Show Results
    
    User->>UI: Request Export
    UI->>API: Request Export
    API->>API: Generate File
    API-->>UI: Return File
    UI-->>User: Download File
```

## State Management Architecture

```mermaid
graph LR
    subgraph "Zustand Stores"
        ConfigStore[Configuration Store]
        CalcStore[Calculation Store]
        UIStore[UI Store]
        ResultsStore[Results Store]
    end
    
    subgraph "Data Types"
        Config[Network Configuration]
        Fluid[Fluid Properties]
        Sections[Pipe Sections]
        Components[Components Config]
        Status[Calculation Status]
        Progress[Calculation Progress]
        Result[Calculation Results]
        UIState[UI State]
    end
    
    ConfigStore --> Config
    ConfigStore --> Fluid
    ConfigStore --> Sections
    ConfigStore --> Components
    
    CalcStore --> Status
    CalcStore --> Progress
    
    ResultsStore --> Result
    
    UIStore --> UIState
    
    subgraph "Cross-Store Actions"
        Validation[Configuration Validation]
        Calculation[Start Calculation]
        Export[Export Results]
        Reset[Reset State]
    end
    
    ConfigStore -.-> Validation
    CalcStore -.-> Calculation
    ResultsStore -.-> Export
    ConfigStore -.-> Reset
```

## API Architecture

```mermaid
graph TB
    subgraph "API Endpoints"
        ConfigAPI[Configuration API]
        CalcAPI[Calculation API]
        ResultsAPI[Results API]
        SystemAPI[System API]
    end
    
    subgraph "Configuration Endpoints"
        POST Validate[/api/config/validate]
        POST Upload[/api/config/upload]
        GET Templates[/api/config/templates]
        GET Fittings[/api/config/fittings/{type}]
    end
    
    subgraph "Calculation Endpoints"
        POST Calculate[/api/calculate]
        GET Status[/api/calculate/{id}/status]
        POST Cancel[/api/calculate/{id}/cancel]
        GET Stream[/api/calculate/{id}/stream]
    end
    
    subgraph "Results Endpoints"
        GET Result[/api/results/{id}]
        GET Export[/api/results/{id}/export/{format}]
        GET History[/api/history]
        DELETE Delete[/api/results/{id}]
    end
    
    subgraph "System Endpoints"
        GET Status[/api/system/status]
        GET Info[/api/system/info]
    end
    
    ConfigAPI --> Validate
    ConfigAPI --> Upload
    ConfigAPI --> Templates
    ConfigAPI --> Fittings
    
    CalcAPI --> Calculate
    CalcAPI --> Status
    CalcAPI --> Cancel
    CalcAPI --> Stream
    
    ResultsAPI --> Result
    ResultsAPI --> Export
    ResultsAPI --> History
    ResultsAPI --> Delete
    
    SystemAPI --> Status
    SystemAPI --> Info
```

## Results Visualization Architecture

```mermaid
graph TB
    subgraph "Data Processing"
        RawData[Raw Calculation Results]
        ProcessedData[Processed Results]
        ChartsData[Chart Data]
        TablesData[Table Data]
    end
    
    subgraph "Visualization Components"
        NetworkGraph[Network Topology]
        PressureChart[Pressure Profile]
        FlowChart[Flow Characteristics]
        LossChart[Loss Breakdown]
        SummaryTable[Summary Table]
        DetailsTable[Detailed Results]
    end
    
    subgraph "Export Systems"
        PDFExport[PDF Generation]
        ExcelExport[Excel Export]
        JSONExport[JSON Export]
        PrintLayout[Print Layout]
    end
    
    RawData --> ProcessedData
    ProcessedData --> ChartsData
    ProcessedData --> TablesData
    
    ChartsData --> NetworkGraph
    ChartsData --> PressureChart
    ChartsData --> FlowChart
    ChartsData --> LossChart
    
    TablesData --> SummaryTable
    TablesData --> DetailsTable
    
    ProcessedData --> PDFExport
    ProcessedData --> ExcelExport
    ProcessedData --> JSONExport
    SummaryTable --> PrintLayout
```

## Implementation Timeline

```mermaid
gantt
    title React Web Application Development Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: Infrastructure
    Project Setup           :2024-01-01, 3d
    FastAPI Backend        :2024-01-04, 5d
    Basic UI Components    :2024-01-09, 4d
    
    section Phase 2: Configuration
    Advanced Forms         :2024-01-13, 7d
    Real-time Validation   :2024-01-20, 4d
    State Management       :2024-01-24, 5d
    
    section Phase 3: Calculation
    API Integration        :2024-01-29, 4d
    Progress Monitoring    :2024-02-02, 3d
    Error Handling         :2024-02-05, 4d
    
    section Phase 4: Visualization
    Results Display        :2024-02-09, 6d
    Interactive Charts     :2024-02-15, 5d
    Report Generation      :2024-02-20, 4d
    
    section Phase 5: Advanced Features
    Analysis Tools         :2024-02-24, 5d
    UX Enhancements        :2024-03-01, 4d
    Integration            :2024-03-05, 3d
    
    section Phase 6: Testing & Deploy
    Testing Suite          :2024-03-08, 4d
    Production Deploy      :2024-03-12, 2d
```

## User Interaction Flow

```mermaid
stateDiagram-v2
    [*] --> LandingPage
    
    LandingPage --> ConfigureNetwork : Click Start
    ConfigureNetwork --> ConfigureFluid : Next
    ConfigureFluid --> ConfigureNetwork : Back
    
    ConfigureFluid --> ConfigureSections : Next
    ConfigureSections --> ConfigureFluid : Back
    ConfigureSections --> ValidateConfig : Validate
    
    ValidateConfig --> ConfigureSections : Fix Errors
    ValidateConfig --> RunCalculation : Valid
    
    RunCalculation --> ShowResults : Complete
    RunCalculation --> ConfigureNetwork : Cancel
    
    ShowResults --> ExportResults : Export
    ShowResults --> ConfigureNetwork : New Calculation
    ShowResults --> LandingPage : Exit
    
    ExportResults --> ShowResults : Continue
    ExportResults --> LandingPage : Done