# Product Overview: Process Design Agents (Web)

## Overview

A specialized module within the **Process Engineering Suite** that turns a linear agent pipeline into an interactive, user-steered design workbench. It wraps the `ProcessDesignAgents` LangGraph workflow into a React interface where engineers don't just "prompt and pray"—they review, edit, and approve the output of each agent before the next one starts. It’s built to feel familiar to anyone who lives in Excel but wants the power of a 12-agent specialized team.

`ProcessDesignAgents` located in `apps/multi-agents/ProcessDesignAgents`.

## Goals and Scope

* **Design-Project Centric**: Focuses entirely on individual design projects, stripping away unnecessary plant/customer hierarchies for a leaner workflow.
* **User-in-the-Loop Control**: Every agent step is a "gate." Users can tweak the `Design Basis` or `Equipment List` manually, ensuring the AI doesn't go off the rails.
* **Spreadsheet-First UI**: Equipment and stream data are handled in high-performance grids—because let’s be honest, that’s where engineers do their best work.
* **State Awareness**: Automatically tracks dependencies. If you change a component in the `Design Basis`, the app flags downstream results (like `Sizing` or `Safety`) as "outdated."

## Domain Hierarchy and Navigation

* **Structure**: Project → Agent Steps (1 through 12).
* **Step Pipeline**: A visual "stepper" or sidebar showing the status of each agent (Complete, Running, Edited, or Outdated).
* **Workspace**: A tabbed interface where each tab represents a node in the `ProcessDesignGraph`.

## Core Data Model (Conceptual)

* **DesignProject**: `id`, `name`, `problem_statement`, `status`, `last_run_timestamp`.
* **DesignState**: The master JSON object (as defined in `DesignState`) that persists across tabs, storing everything from `process_requirements` to `equipment_list_results`.
* **StepSnapshot**: Captures the state of the project at each agent’s finish line, allowing the user to "revert" or see what the AI originally proposed vs. their manual edits.

## Frontend (React) Overview

* **Tech**: React + TS, leveraging the suite’s UI kit. It’s designed to run snappy on local machines (like an M4 Pro) using Vite.
* **Views**:
* **Dashboard**: Not required.
* **Requirements/Narrative View**: Markdown editors for the `Process Requirements` and `Flowsheet Description`.
* **Research Comparison**: A side-by-side card view for the `Innovative` and `Conservative` researcher outputs.
* **Engineering Spreadsheet**: A customized grid component for `Equipment List` and `Stream List`. Supports bulk copy-paste from Excel.
* **Approval View**: A tabbed interface where each tab represents a node in the `ProcessDesignGraph`.
* **LLM Settings**: A tabbed interface where user can set the LLM settings, such as model, temperature, API key, etc.
* **Saving and Loading**: A tabbed interface where user can save the project and loading the project.
* **Exporting**: A tabbed interface where user can export the project as a PDF or a Word document.

* **Logic**: A "Trigger Next Step" button that only activates when the current step is "Validated" or "Saved" by the user.

## Backend Overview

* **Engine**: Python (FastAPI) orchestrating the `ProcessDesignGraph`.
* **Persistence**: Uses the `MemorySaver` checkpointer for local sessions, but architected to use a relational DB for the full-scale `process-engineering-suite` integration.
* **Sizing Integration**: Direct hooks to `agent_sizing_tools.py`, allowing the UI to call `size_pump_basic` or `size_heat_exchanger_basic` on-demand.
* **Validation**: Server-side checks to ensure that manual edits to JSON payloads (like stream temperatures or pressures) still follow the Pydantic schemas.

## Reporting and Export

* **Aggregated Dossier**: Real-time generation of the full design report in Markdown.
* **Industry Standard Export**: Uses `pypandoc` to convert the project state into a formatted Word doc using the suite's `template.docx`.
* **Excel Export**: One-click download of the `equipment_list_results` and `stream_list_results` as a native .xlsx file.