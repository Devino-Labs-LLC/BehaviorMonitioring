import React from 'react';
import { render, screen } from '@testing-library/react';
import LineGraph from '../../../src/components/LineGraph';

const mockLine = jest.fn(() => <div data-testid="line-chart" />);

jest.mock('react-chartjs-2', () => ({
  Line: (props: any) => {
    mockLine(props);
    return <div data-testid="line-chart" />;
  },
}));

describe('LineGraph component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chart data with average marker datasets and filtered legend', () => {
    render(
      <LineGraph
        average={0}
        data={{
          labels: ['2026-03-29', '2026-03-30', '2026-03-31'],
          title: 'Behavior Trends',
          measurementType: 'Frequency',
          datasets: [
            {
              label: 'Aggression',
              data: [1, 2, 3],
              borderColor: 'red',
            },
            {
              label: 'Elopement',
              data: [2, 2, 2],
              borderColor: 'blue',
            },
          ],
        }}
      />,
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(mockLine).toHaveBeenCalledTimes(1);

    const props = mockLine.mock.calls[0][0];
    expect(props.data.datasets).toHaveLength(4);
    expect(props.options.plugins.title.text).toBe('Behavior Trends');
    expect(props.options.scales.y.title.text).toBe('Frequency');
    expect(props.options.plugins.legend.labels.filter({ text: 'Aggression Avg Marker' })).toBe(
      false,
    );
    expect(props.options.plugins.legend.labels.filter({ text: 'Aggression' })).toBe(true);
    expect(props.options.plugins.tooltip.callbacks.label({
      dataset: { label: 'Aggression' },
      raw: 4,
    })).toBe('Aggression: 4');
    expect(props.options.plugins.tooltip.callbacks.label({
      dataset: { label: 'Aggression Avg Marker' },
      raw: 2,
    })).toBe('Aggression Avg Marker: 2.00');
  });

  it('falls back to gray styling when dataset colors are missing', () => {
    render(
      <LineGraph
        average={0}
        data={{
          labels: ['2026-03-31'],
          title: 'Fallback Colors',
          measurementType: 'Duration',
          datasets: [
            {
              label: 'Engagement',
              data: [4],
            },
          ],
        }}
      />,
    );

    const props = mockLine.mock.calls[mockLine.mock.calls.length - 1][0];

    expect(props.data.datasets[1].backgroundColor).toBe('gray');
    expect(props.options.plugins.annotation.annotations['averageLine-0'].borderColor).toBe('gray');
    expect(props.options.scales.x.title.text).toBe('Date');
    expect(props.options.plugins.tooltip.callbacks.label({
      dataset: { label: '' },
      raw: null,
    })).toBe(': 0');
  });
});
