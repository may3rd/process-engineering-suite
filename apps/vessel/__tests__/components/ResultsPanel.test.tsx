/**
 * ResultsPanel component state tests.
 *
 * Tests three states:
 *  1. Empty state   — no calculationResult → shows guidance checklist
 *  2. Results state — valid calculationResult → shows result sections
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ── Mock zustand store (useUomStore) so tests don't need localStorage ──────────
vi.mock('../../src/lib/store/uomStore', () => ({
  useUomStore: () => ({
    units: {
      length: 'mm',
      density: 'kg/m3',
      volumeFlow: 'm3/h',
      volume: 'm3',
      area: 'm2',
      mass: 'kg',
    },
    setUnit: vi.fn(),
  }),
}))

// ── Mock convertUnit so tests don't need the physics-engine package ────────────
vi.mock('@eng-suite/physics', () => ({
  convertUnit: (value: number) => value,
}))

import { ResultsPanel } from '../../src/app/calculator/components/ResultsPanel'
import { VesselOrientation, HeadType } from '../../src/types'
import type { CalculationResult } from '../../src/types'

// ─── Fixture ─────────────────────────────────────────────────────────────────

const MOCK_RESULT: CalculationResult = {
  volumes: {
    headVolume: 0.131,
    shellVolume: 1.571,
    totalVolume: 1.833,
    tangentVolume: 1.571,
    effectiveVolume: 1.833,
    workingVolume: 0.5,
    overflowVolume: 0,
    partialVolume: 0.9,
  },
  surfaceAreas: {
    headSurfaceArea: 1.571,
    shellSurfaceArea: 6.283,
    totalSurfaceArea: 7.854,
    wettedSurfaceArea: 3.8,
  },
  masses: {
    massEmpty: null,
    massLiquid: 765,
    massFull: 1558,
  },
  timing: {
    surgeTime: 0.05,
    inventory: 0.05,
  },
  headDepthUsed: 250,
  calculatedAt: '2025-01-01T00:00:00.000Z',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ResultsPanel — empty state', () => {
  it('shows guidance text when no result', () => {
    render(<ResultsPanel calculationResult={null} />)
    expect(screen.getByText(/Enter valid inputs to see results/i)).toBeTruthy()
  })

  it('shows required input checklist items', () => {
    render(<ResultsPanel calculationResult={null} />)
    expect(screen.getByText(/Tag \/ Equipment number/i)).toBeTruthy()
    expect(screen.getByText(/Inside diameter/i)).toBeTruthy()
    expect(screen.getByText(/Shell length/i)).toBeTruthy()
    expect(screen.getByText(/Orientation/i)).toBeTruthy()
  })

  it('does not render any result sections', () => {
    render(<ResultsPanel calculationResult={null} />)
    expect(screen.queryByText(/Total Volume/i)).toBeNull()
    expect(screen.queryByText(/Surface Area/i)).toBeNull()
  })
})

describe('ResultsPanel — results state', () => {
  it('does not show guidance text when result is provided', () => {
    render(<ResultsPanel calculationResult={MOCK_RESULT} />)
    expect(screen.queryByText(/Enter valid inputs to see results/i)).toBeNull()
  })

  it('renders volume section', () => {
    render(<ResultsPanel calculationResult={MOCK_RESULT} />)
    // VolumeResult section title is "Volumes"
    expect(screen.getAllByText(/Volume/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Volumes')).toBeTruthy()
  })

  it('renders surface area section', () => {
    render(<ResultsPanel calculationResult={MOCK_RESULT} />)
    // SurfaceAreaResult section title is "Surface Areas"
    expect(screen.getByText('Surface Areas')).toBeTruthy()
  })

  it('renders mass and timing section', () => {
    render(<ResultsPanel calculationResult={MOCK_RESULT} />)
    // MassTimingResult section title is "Mass & Timing"
    expect(screen.getByText('Mass & Timing')).toBeTruthy()
  })

  it('renders summary section with a total volume value', () => {
    render(<ResultsPanel calculationResult={MOCK_RESULT} />)
    // SummaryResult shows total volume — check it's non-zero string
    const totalVolElements = screen.getAllByText(/1\.833|1\.57/i)
    expect(totalVolElements.length).toBeGreaterThan(0)
  })
})
