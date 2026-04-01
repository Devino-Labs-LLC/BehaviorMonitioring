import React from 'react';
import { render, screen } from '@testing-library/react';
import GraphDataProcessor from '../../../src/function/GraphDataProcessor';

const mockLineGraph = jest.fn();

jest.mock('../../../src/components/LineGraph', () => ({
  __esModule: true,
  default: (props: any) => {
    mockLineGraph(props);
    return <div data-testid="line-graph" />;
  },
}));

describe('GraphDataProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-31T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows a loading message when no data has been fetched yet', () => {
    render(
      <GraphDataProcessor
        fetchedData={[]}
        behaviorNames={{}}
        title="Test Graph"
        measurementType="Frequency"
        dateRange={7}
      />,
    );

    expect(screen.getByText('Loading data...')).toBeInTheDocument();
    expect(mockLineGraph).not.toHaveBeenCalled();
  });

  it('aggregates frequency data into graph datasets', () => {
    render(
      <GraphDataProcessor
        fetchedData={[
          { bsID: 1, behaviorID: 1, sessionDate: '2026-03-30T12:00:00.000Z', count: 2 },
          { bsID: 1, behaviorID: 1, sessionDate: '2026-03-30T13:00:00.000Z', count: 3 },
          { bsID: 2, behaviorID: 2, sessionDate: '2026-03-31T12:00:00.000Z', count: 4 },
        ]}
        behaviorNames={{ 1: 'Aggression', 2: 'Elopement' }}
        title="Behavior Graph"
        measurementType="Frequency"
        dateRange={7}
      />,
    );

    expect(screen.getByTestId('line-graph')).toBeInTheDocument();
    expect(mockLineGraph).toHaveBeenCalledTimes(1);

    const graphProps = mockLineGraph.mock.calls[0][0];
    expect(graphProps.data.title).toBe('Behavior Graph');
    expect(graphProps.data.measurementType).toBe('Frequency');

    const aggression = graphProps.data.datasets.find((dataset: any) => dataset.label === 'Aggression');
    const elopement = graphProps.data.datasets.find((dataset: any) => dataset.label === 'Elopement');

    expect(aggression.data.some((value: number) => value === 5)).toBe(true);
    expect(elopement.data.some((value: number) => value === 4)).toBe(true);
    expect(graphProps.average).toBeGreaterThanOrEqual(0);
  });

  it('converts duration values to seconds for the graph', () => {
    render(
      <GraphDataProcessor
        fetchedData={[
          { bsID: 3, behaviorID: 3, sessionDate: '2026-03-30T12:00:00.000Z', count: 0, duration: '00:05:30' },
          { bsID: 3, behaviorID: 3, sessionDate: '2026-03-31T12:00:00.000Z', count: 0, duration: '00:01:00' },
        ]}
        behaviorNames={{ 3: 'Task Refusal' }}
        title="Duration Graph"
        measurementType="Duration"
        dateRange={7}
      />,
    );

    const graphProps = mockLineGraph.mock.calls[0][0];
    const dataset = graphProps.data.datasets[0];

    expect(dataset.label).toBe('Task Refusal');
    expect(dataset.data.some((value: number) => value === 330)).toBe(true);
    expect(dataset.data.some((value: number) => value === 60)).toBe(true);
  });

  it('builds month-based labels and rate values for longer ranges', () => {
    render(
      <GraphDataProcessor
        fetchedData={[
          { bsID: 4, behaviorID: 4, sessionDate: '2026-03-15T12:00:00.000Z', count: 6, duration: '00:30:00' },
          { bsID: 4, behaviorID: 4, sessionDate: '2026-03-16T12:00:00.000Z', count: 3, duration: '00:30:00' },
        ]}
        behaviorNames={{ 4: 'Property Destruction' }}
        title="Rate Graph"
        measurementType="Rate"
        dateRange={30}
      />,
    );

    const graphProps = mockLineGraph.mock.calls[0][0];
    const dataset = graphProps.data.datasets[0];

    expect(graphProps.data.labels.length).toBeGreaterThan(0);
    expect(graphProps.data.labels.every((label: string) => /^[A-Z][a-z]{2} \d{4}$/.test(label))).toBe(true);
    expect(dataset.data.some((value: number) => Math.abs(value - 0.3) < 0.0001)).toBe(true);
  });
});
