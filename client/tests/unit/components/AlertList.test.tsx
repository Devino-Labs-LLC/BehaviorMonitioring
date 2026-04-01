import React from 'react';
import { render, screen } from '@testing-library/react';
import AlertList from '../../../src/components/AlertList';

describe('AlertList', () => {
  it('renders the empty state when no alerts are present', () => {
    render(<AlertList alerts={[]} />);

    expect(screen.getByText('No alerts — data looks stable.')).toBeInTheDocument();
  });

  it('renders alerts with their titles and details', () => {
    render(
      <AlertList
        alerts={[
          { id: 'a1', level: 'high', title: 'High Alert', detail: 'Needs attention' },
          { id: 'a2', level: 'med', title: 'Medium Alert', detail: 'Watch closely' },
          { id: 'a3', level: 'low', title: 'Low Alert', detail: 'Looks stable' },
        ]}
      />,
    );

    expect(screen.getByText('High Alert')).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('Medium Alert')).toBeInTheDocument();
    expect(screen.getByText('Watch closely')).toBeInTheDocument();
    expect(screen.getByText('Low Alert')).toBeInTheDocument();
    expect(screen.getByText('Looks stable')).toBeInTheDocument();
  });
});
