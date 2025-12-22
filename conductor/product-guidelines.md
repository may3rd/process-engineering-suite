# Product Guidelines

## Tone and Voice
- **Professional and Authoritative:** The application's interface and documentation must use technical, precise, and serious language. This reflects the safety-critical nature of process engineering calculations and ensures users trust the integrity of the results.

## Visual Identity and UI Principles
- **Clarity and Information Density:** Interfaces should be optimized to display high volumes of engineering data in a clean, organized manner.
- **Visual Hierarchy (Glassmorphism):** Use the modern glassmorphism and iOS-inspired design system to create depth and draw immediate attention to critical values, warnings, and navigation elements.
- **Consistency Across Modules:** UI components (e.g., pipes, nodes, input fields) must look and behave identically across all applications in the suite (Dashboard, Network Editor, PSV Tool).
- **Accessibility:** Ensure high contrast for readability and support for high-resolution engineering monitors.

## Performance Standards
- **Instant Calculation Feedback:** Engineering formulas should be optimized for near-instant updates (<100ms) upon input changes to allow for rapid iterative design.
- **High-Performance Reporting:** Automated PDF report generation must be fast, aiming for completion in under 2 seconds to support efficient project documentation.
- **Reliable Data Sync:** Implement robust auto-save and synchronization to ensure data persistence and prevent loss in collaborative environments.
- **Smooth Interaction:** The diagramming tools must maintain 60fps performance, even when handling large-scale hydraulic networks.

## Error Handling and Validation
- **Proactive Validation:** Input fields must highlight errors and out-of-range values in real-time.
- **Warning System:** Use visible warning indicators for values that are physically possible but suspicious (e.g., high Mach numbers or unusual roughness factors).
- **Explanatory Feedback:** Provide detailed context and explanations for errors, helping engineers understand the physical or regulatory basis for the violation.

## Documentation and Technical Support
- **Integrated Engineering Wiki:** Maintain a comprehensive, searchable knowledge base within the platform. This wiki should explain the underlying physics (e.g., Bernoulli's principle) and industry standards (e.g., API 520) used in the suite's calculations.
