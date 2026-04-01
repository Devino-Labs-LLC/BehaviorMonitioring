import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tab from '../../../src/components/Tab';

describe('Tab', () => {
  it('renders a tab button with an aria label', () => {
    render(
      <Tab
        nameOfClass="tab-class"
        placeholder="Overview"
        onClick={jest.fn()}
      />,
    );

    const tab = screen.getByRole('tab', { name: 'Overview tab' });
    expect(tab).toHaveClass('tab-class');
    expect(tab).toHaveAttribute('type', 'button');
  });

  it('calls the click handler', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(
      <Tab
        nameOfClass="tab-class"
        placeholder="Details"
        onClick={onClick}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Details tab' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
