import React from 'react';
import { render, screen } from '@testing-library/react';
import LineGraph from '../../../src/components/LineGraph';

const mockLine = jest.fn(() => <div data-testid="line-chart" />);

declare global {
  // eslint-disable-next-line no-var
  var __chartRegisterArgs__: any[] | undefined;
}

jest.mock('react-chartjs-2', () => ({
  Line: (props: any) => {
    mockLine(props);
    return <div data-testid="line-chart" />;
  },
}));
jest.mock('chart.js', () => ({
  Chart: {
    register: (...args: any[]) => {
      globalThis.__chartRegisterArgs__ = args;
    },
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));
jest.mock('chartjs-plugin-annotation', () => ({
  __esModule: true,
  default: { id: 'annotationPlugin' },
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

  it('builds average markers at the midpoint and avg annotation labels with decimals', () => {
    render(
      <LineGraph
        average={0}
        data={{
          labels: ['day1', 'day2', 'day3', 'day4', 'day5'],
          title: 'Midpoint Coverage',
          measurementType: 'Rate',
          datasets: [
            {
              label: 'Target',
              data: [1, 2, 3, 4, 5],
              borderColor: 'green',
            },
          ],
        }}
      />,
    );

    const props = mockLine.mock.calls[mockLine.mock.calls.length - 1][0];
    expect(props.data.datasets[1].data).toEqual([null, null, 3, null, null]);
    expect(props.data.datasets[1].pointBorderColor).toBe('green');
    expect(props.options.plugins.annotation.annotations['averageLine-0'].label.content).toBe(
      'Target Avg: 3.00',
    );
  });

  it('registers and runs the custom background plugin safely', () => {
    const backgroundPlugin = globalThis.__chartRegisterArgs__?.find(
      (plugin: any) => plugin?.id === 'backgroundColor',
    );
    expect(backgroundPlugin).toBeDefined();

    const fillRect = jest.fn();
    const save = jest.fn();
    const restore = jest.fn();

    backgroundPlugin.beforeDraw({
      ctx: {
        save,
        restore,
        fillRect,
        fillStyle: '',
      },
      chartArea: {
        left: 10,
        top: 40,
        right: 110,
      },
      width: 200,
      height: 100,
      options: {
        plugins: {
          title: {
            display: true,
          },
        },
      },
    });

    expect(save).toHaveBeenCalled();
    expect(fillRect).toHaveBeenCalledWith(0, 0, 200, 100);
    expect(fillRect).toHaveBeenCalledWith(10, 10, 100, 30);
    expect(restore).toHaveBeenCalled();

    expect(() =>
      backgroundPlugin.beforeDraw({
        ctx: null,
        chartArea: {},
        width: null,
        height: null,
        options: {},
      }),
    ).not.toThrow();
  });
});
