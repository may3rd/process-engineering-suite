import { render, screen } from '@testing-library/react';
import { RequirementsView } from './RequirementsView';
import { describe, it, expect, vi } from 'vitest';

// Mock store
vi.mock('../../store/useDesignStore', () => ({
  useDesignStore: () => ({
    designState: { process_requirements: '' },
    updateDesignState: vi.fn(),
    updateStepStatus: vi.fn(),
    activeStepId: 'requirements',
  }),
}));

describe('RequirementsView', () => {
  it('renders the title and input', () => {
    render(<RequirementsView />);
    expect(screen.getByText('Define Process Objectives & Constraints')).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter process requirements here/i)).toBeDefined();
  });
});
