import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UnitSelector } from '../UnitSelector';

describe('UnitSelector', () => {
    it('allows empty values during editing and commits on blur', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();

        render(
            <UnitSelector
                label="Length"
                value={10}
                unit="m"
                availableUnits={['m', 'ft']}
                onChange={handleChange}
            />
        );

        const input = screen.getByLabelText('Length');
        await user.clear(input);

        expect(handleChange.mock.calls.at(-1)).toEqual([null, 'm']);

        fireEvent.blur(input);
        expect(handleChange.mock.calls.at(-1)).toEqual([null, 'm']);
    });

    it('commits on Enter', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();

        render(
            <UnitSelector
                label="Height"
                value={10}
                unit="m"
                availableUnits={['m', 'ft']}
                onChange={handleChange}
            />
        );

        const input = screen.getByLabelText('Height');
        await user.clear(input);
        await user.type(input, '2.5');
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(handleChange.mock.calls.at(-1)).toEqual([2.5, 'm']);
    });
});
