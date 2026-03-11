import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SectionCard } from '@/app/calculator/components/SectionCard'

describe('SectionCard', () => {
  it('starts collapsed when configured with defaultOpen false and expands on toggle', async () => {
    const user = userEvent.setup()

    render(
      <SectionCard title="Fluid Data" collapsible defaultOpen={false}>
        <div>Section body</div>
      </SectionCard>,
    )

    expect(screen.queryByText('Section body')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand Fluid Data' }))

    expect(screen.getByText('Section body')).toBeInTheDocument()
  })
})
