import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextareaInput from '../../../src/components/TextareaInput';

describe('TextareaInput', () => {
  it('renders a bare textarea when no label is provided', () => {
    render(
      <TextareaInput
        name="notes"
        placeholder="Notes"
        requiring={false}
        value="hello"
        nameOfClass="notes-class"
        onChange={jest.fn()}
      />,
    );

    const input = screen.getByLabelText('Notes text field');
    expect(input).toHaveValue('hello');
    expect(input).toHaveClass('notes-class');
    expect(screen.queryByText('Notes *')).not.toBeInTheDocument();
  });

  it('renders a labeled textarea and forwards changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <TextareaInput
        name="summary"
        placeholder="Summary"
        requiring={true}
        value=""
        nameOfClass="summary-class"
        label="Summary"
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Summary *');
    expect(input).toHaveAttribute('id', 'summary-textarea');
    expect(input).toBeRequired();

    await user.type(input, 'abc');
    expect(onChange).toHaveBeenCalled();
  });
});
