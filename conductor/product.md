# Initial Concept
A unified platform for process design, hydraulic analysis, and equipment sizing. This monorepo contains multiple applications tailored for process engineers, including a Dashboard, Network Editor, PSV Sizing tool, and a FastAPI backend.

# Product Guide

## Target Audience
The primary users of this suite are **Process Engineers in the Oil & Gas industry** and **Engineering Consultants (EPC)**. These professionals require high-precision tools for safety-critical calculations and system design.

## Core Goals
- **Accuracy & Consistency:** Improve the reliability of engineering calculations by centralizing logic and reducing human error.
- **Efficiency:** Drastically reduce the time spent on manual documentation and repetitive sizing tasks through automation and integrated workflows.
- **Compliance:** Ensure all designs and safety device sizing (e.g., PSVs) adhere strictly to international standards like **API 520/521**.
- **Expansion:** Grow the suite to include comprehensive modules for **pump sizing**, **tank and vessel sizing**, and other core process equipment.

## Value Proposition
The suite's primary advantage is **Better Collaboration**. By moving away from local files and towards a centralized platform, teams can work together on complex systems with a single source of truth, robust audit trails, and modern UI patterns that improve productivity.

## Feature Priorities
1. **Automated Reporting:** Implementation of high-quality PDF report generation for all sizing and simulation results to facilitate easy sharing and approval workflows.
2. **Equipment Sizing Modules:** Expansion into specialized calculation tools for pumps, tanks, and pressure vessels.
3. **Advanced Hydraulics:** Support for complex simulation scenarios, including transient analysis and compressible flow regimes.

## Integration Strategy
The suite follows a **Modular but Consistent** architecture. While each calculation tool (sizing, simulation, hierarchy) operates with its own specific logic, they share a unified data model and UI design system. Data exchange between modules (e.g., linking a pump curve to a hydraulic network) is handled via explicit, user-driven actions to maintain clarity and control.