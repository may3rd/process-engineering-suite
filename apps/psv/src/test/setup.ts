import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock external APIs
vi.mock("@eng-suite/api/psv", () => ({
  calculateSizing: vi.fn(),
  ORIFICE_SIZES: {
    D: { area: 0.0005067, letter: "D" },
    E: { area: 0.0007854, letter: "E" },
    F: { area: 0.0012566, letter: "F" },
  },
}));

vi.mock("@eng-suite/physics", () => ({
  convertUnit: vi.fn((value) => value),
}));

declare global {
  interface Window {
    ResizeObserver?: typeof ResizeObserver;
  }
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

if (!window.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock;
}
