export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'outdated';

export interface AgentStep {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  agentId: string; // The backend agent node name
}

// Mirroring the Python DesignState (simplified for now)
export interface ResearchConcept {
  name: string;
  maturity: 'conventional' | 'innovative' | 'state_of_the_art';
  description: string;
  unit_operations: string[];
  key_benefits: string[];
  feasibility_score?: number; // Added later by ranking agent
}

export interface LLMSettings {
  provider: 'OpenRouter' | 'OpenAI' | 'Google';
  quickModel: string;
  deepModel: string;
  temperature: number;
  apiKey?: string;
}

export interface DesignState {
  llmSettings?: LLMSettings;
  problem_statement?: string; // User input
  process_requirements?: string; // AI Analysis
  research_concepts?: { concepts: ResearchConcept[] }; // AI Research Output
  selected_concept?: ResearchConcept; // User Selection
  selected_concept_details?: string; // Detailed Design Basis (AI Analysis)
  flowsheet_description?: string;
  catalog_template?: string; // JSON String of Equipments/Streams (Empty)
  simulation_results?: string; // JSON String of Populated Streams
  full_simulation_results?: string; // JSON String of Equipments + Populated Streams
  sizing_results?: string; // JSON String of Metadata + Sized Equipments + Streams
  safety_report?: string; // Markdown report from Safety Analyst
  project_manager_report?: string; // Executive Approval Memo
  project_approval_status?: string; // Approved, Conditional, etc.
  final_report?: string;
  // Add other fields as needed
}

export interface DesignProject {
  id: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export const DESIGN_STEPS: AgentStep[] = [
  { id: 'requirements', label: 'Requirements', description: 'Define process goals', status: 'pending', agentId: 'requirements_agent' },
  { id: 'research', label: 'Research', description: 'Explore options', status: 'pending', agentId: 'research_agent' },
  { id: 'synthesis', label: 'Synthesis', description: 'Select best path', status: 'pending', agentId: 'synthesis_agent' },
  { id: 'pfd', label: 'PFD Generation', description: 'Create flow diagrams', status: 'pending', agentId: 'pfd_agent' },
  { id: 'simulation', label: 'Simulation', description: 'Mass & Energy Balance', status: 'pending', agentId: 'simulation_agent' },
  { id: 'equipment', label: 'Equipment List', description: 'Define assets', status: 'pending', agentId: 'equipment_agent' },
  { id: 'sizing', label: 'Sizing', description: 'Detailed sizing', status: 'pending', agentId: 'sizing_agent' },
  { id: 'safety', label: 'Safety', description: 'HAZOP / Safety check', status: 'pending', agentId: 'safety_agent' },
  { id: 'cost', label: 'Costing', description: 'CAPEX/OPEX', status: 'pending', agentId: 'cost_agent' },
  { id: 'report', label: 'Report', description: 'Final dossier', status: 'pending', agentId: 'report_agent' },
];
