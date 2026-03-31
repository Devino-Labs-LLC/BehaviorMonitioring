import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Timer from '../../../src/components/Timer';

describe('Timer component', () => {
  it('hydrates from the initial value and emits updates from input changes', () => {
    const onChange = jest.fn();

    render(
      <Timer
        initialValue="01:02:03"
        name="duration"
        required={true}
        onChange={onChange}
      />,
    );

    const hourInput = screen.getByLabelText('Duration hours input field');
    const minuteInput = screen.getByLabelText('Duration minutes input field');
    const secondInput = screen.getByLabelText('Duration seconds input field');

    expect(hourInput).toHaveValue(1);
    expect(minuteInput).toHaveValue(2);
    expect(secondInput).toHaveValue(3);

    fireEvent.change(hourInput, { target: { value: '5' } });
    fireEvent.change(minuteInput, { target: { value: '15' } });
    fireEvent.change(secondInput, { target: { value: '25' } });

    expect(onChange).toHaveBeenLastCalledWith({ hour: 5, minute: 15, second: 25 });
  });

  it('increments and decrements using the control cells', () => {
    const onChange = jest.fn();
    const { container } = render(
      <Timer
        initialValue="00:00:00"
        name="duration"
        required={false}
        onChange={onChange}
      />,
    );

    const controls = container.querySelectorAll('td.act');
    fireEvent.click(controls[0]);
    fireEvent.click(controls[1]);

    expect(onChange).toHaveBeenCalled();
    expect(screen.getByLabelText('Duration hours input field')).toHaveValue(1);
    expect(screen.getByLabelText('Duration minutes input field')).toHaveValue(1);
    expect(screen.getByLabelText('Duration seconds input field')).toHaveValue(0);
  });

  it('prevents the timer controls from decrementing below zero', () => {
    const onChange = jest.fn();
    const { container } = render(
      <Timer
        initialValue="00:00:00"
        name="duration"
        required={false}
        onChange={onChange}
      />,
    );

    const controls = container.querySelectorAll('td.act');
    fireEvent.click(controls[3]);
    fireEvent.click(controls[4]);
    fireEvent.click(controls[5]);

    expect(screen.getByLabelText('Duration hours input field')).toHaveValue(0);
    expect(screen.getByLabelText('Duration minutes input field')).toHaveValue(0);
    expect(screen.getByLabelText('Duration seconds input field')).toHaveValue(0);
  });

  it('rolls seconds and minutes forward correctly and ignores invalid direct input', () => {
    const onChange = jest.fn();
    const { container } = render(
      <Timer
        initialValue="01:59:59"
        name="duration"
        required={false}
        onChange={onChange}
      />,
    );

    const controls = container.querySelectorAll('td.act');
    fireEvent.click(controls[2]);

    expect(screen.getByLabelText('Duration hours input field')).toHaveValue(2);
    expect(screen.getByLabelText('Duration minutes input field')).toHaveValue(0);
    expect(screen.getByLabelText('Duration seconds input field')).toHaveValue(0);

    fireEvent.change(screen.getByLabelText('Duration minutes input field'), {
      target: { value: '61' },
    });
    fireEvent.change(screen.getByLabelText('Duration seconds input field'), {
      target: { value: '-1' },
    });

    expect(screen.getByLabelText('Duration minutes input field')).toHaveValue(0);
    expect(screen.getByLabelText('Duration seconds input field')).toHaveValue(0);
  });

  it('borrows from minutes and hours correctly when decrementing seconds', () => {
    const onChange = jest.fn();
    const { container } = render(
      <Timer
        initialValue="02:00:00"
        name="duration"
        required={false}
        onChange={onChange}
      />,
    );

    const controls = container.querySelectorAll('td.act');
    fireEvent.click(controls[5]);

    expect(screen.getByLabelText('Duration hours input field')).toHaveValue(1);
    expect(screen.getByLabelText('Duration minutes input field')).toHaveValue(59);
    expect(screen.getByLabelText('Duration seconds input field')).toHaveValue(59);
    expect(onChange).toHaveBeenLastCalledWith({ hour: 1, minute: 59, second: 59 });
  });
});
