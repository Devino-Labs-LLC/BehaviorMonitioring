import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Timefield from '../../../src/components/Timefield';

describe('Timefield', () => {
  it('renders a time input with the expected props', () => {
    render(
      <Timefield
        name="startTime"
        requiring={true}
        value="09:30"
        nameOfClass="time-class"
        onChange={jest.fn()}
      />,
    );

    const input = screen.getByDisplayValue('09:30');
    expect(input).toHaveAttribute('type', 'time');
    expect(input).toHaveAttribute('name', 'startTime');
    expect(input).toHaveClass('time-class');
    expect(input).toBeRequired();
  });

  it('forwards change events', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <Timefield
        name="endTime"
        requiring={false}
        value=""
        onChange={onChange}
      />,
    );

    const input = document.querySelector('input[type="time"]') as HTMLInputElement;
    await user.type(input, '10:45');
    expect(onChange).toHaveBeenCalled();
  });
});
