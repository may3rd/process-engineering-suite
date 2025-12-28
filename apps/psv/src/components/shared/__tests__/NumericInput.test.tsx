import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumericInput } from '../NumericInput';

describe('NumericInput', () => {
    it('allows empty values during editing and commits on blur', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        const handleBlur = vi.fn();

        render(
            <NumericInput
                label="Pressure"
                value={10}
                onChange={handleChange}
                onBlur={handleBlur}
            />
        );

        const input = screen.getByLabelText('Pressure');
        await user.clear(input);

        expect(handleChange.mock.calls.at(-1)?.[0]).toBeUndefined();

        fireEvent.blur(input);
        expect(handleBlur).toHaveBeenCalledWith(undefined);
    });

    it('commits on Enter and restores on Escape', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        const handleBlur = vi.fn();

        render(
            <NumericInput
                label="Diameter"
                value={10}
                onChange={handleChange}
                onBlur={handleBlur}
            />
        );

        const input = screen.getByLabelText('Diameter');
        await user.clear(input);
        await user.type(input, '12.5');
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(handleBlur).toHaveBeenCalledWith(12.5);

        await user.clear(input);
        await user.type(input, '99');
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(input).toHaveValue(10);
    });
});
