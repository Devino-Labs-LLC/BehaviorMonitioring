import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ConfirmActionModal from '../../../src/components/ConfirmActionModal';
import Datefield from '../../../src/components/Datefield';
import Tab from '../../../src/components/Tab';
import TextareaInput from '../../../src/components/TextareaInput';
import Timefield from '../../../src/components/Timefield';

describe('Form Primitives', () => {
  it('renders a confirm action modal and handles its callbacks', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <ConfirmActionModal
        isVisible={true}
        title="Confirm Archive"
        message="Archive this record?"
        confirmLabel="Archive"
        cancelLabel="Nevermind"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Confirm Archive' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nevermind' }));
    fireEvent.click(screen.getByTestId('confirm-action-button'));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalled();
  });

  it('renders nothing when the confirm action modal is hidden', () => {
    const { container } = render(
      <ConfirmActionModal
        isVisible={false}
        title="Hidden"
        message="Nope"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a labeled date field with a max date by default', () => {
    render(
      <Datefield
        name="startDate"
        requiring={true}
        value="2026-03-31"
        label="Start Date"
        onChange={jest.fn()}
      />,
    );

    const input = screen.getByLabelText('Start Date *');
    expect(input).toHaveAttribute('type', 'date');
    expect(input).toHaveAttribute('max');
  });

  it('renders a future-dated field without a max restriction', () => {
    render(
      <Datefield
        name="dueDate"
        requiring={false}
        value="2026-04-30"
        futureDating={true}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByDisplayValue('2026-04-30')).not.toHaveAttribute('max');
  });

  it('renders a tab button', () => {
    const onClick = jest.fn();

    render(<Tab nameOfClass="tab" placeholder="Overview" onClick={onClick} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Overview tab' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders textarea variants with and without labels', () => {
    const { rerender } = render(
      <TextareaInput
        name="notes"
        placeholder="Notes"
        requiring={true}
        value=""
        nameOfClass="notes"
        label="Notes"
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Notes *')).toBeInTheDocument();

    rerender(
      <TextareaInput
        name="details"
        placeholder="Details"
        requiring={false}
        value="Saved"
        nameOfClass="details"
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Details text field')).toBeInTheDocument();
  });

  it('renders a time field and propagates changes', () => {
    const onChange = jest.fn();

    render(
      <Timefield
        name="sessionTime"
        requiring={true}
        value="09:30"
        onChange={onChange}
      />,
    );

    const input = screen.getByDisplayValue('09:30');
    fireEvent.change(input, { target: { value: '10:15' } });

    expect(onChange).toHaveBeenCalled();
  });
});
