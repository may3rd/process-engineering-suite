import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { API521Calculator } from '../API521Calculator';
import type { Equipment } from '@/data/types';

describe('API521Calculator', () => {
    it('runs the fire load calculation and emits results', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        const equipment: Equipment[] = [
            {
                id: 'eq-1',
                areaId: 'area-1',
                type: 'vessel',
                tag: 'V-101',
                name: 'Test Vessel',
                designPressure: null,
                mawp: null,
                designTemperature: null,
                ownerId: 'owner-1',
                status: 'active',
                details: {
                    orientation: 'vertical',
                    innerDiameter: 1000,
                    tangentToTangentLength: 3000,
                    headType: 'torispherical',
                    insulated: false,
                },
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01',
            },
        ];

        const config = {
            latentHeat: 420,
            latentHeatUnit: 'kJ/kg',
            relievingTemp: 50,
            relievingTempUnit: '°C',
            environmentalFactor: 1.0,
            heightAboveGrade: 0,
            heightUnit: 'm',
            liquidLevels: new Map([
                ['eq-1', { value: 2, unit: 'm' }],
            ]),
        };

        render(
            <API521Calculator
                equipment={equipment}
                config={config}
                onChange={onChange}
            />
        );

        await user.click(
            screen.getByRole('button', { name: /calculate fire relief load/i })
        );

        expect(onChange).toHaveBeenCalled();
        const results = onChange.mock.calls.at(-1)?.[1];
        expect(results).toMatchObject({
            totalWettedArea: expect.any(Number),
            limitedWettedArea: expect.any(Number),
            heatAbsorption: expect.any(Number),
            reliefRate: expect.any(Number),
        });
        expect(screen.getByText(/Total Wetted Area/i)).toBeInTheDocument();
    });
});
