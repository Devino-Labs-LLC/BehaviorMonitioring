import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TooltipItem, LegendItem } from 'chart.js';
import annotationPlugin, { AnnotationOptions } from 'chartjs-plugin-annotation';

const backgroundPlugin = {
    id: 'backgroundColor',
    beforeDraw: (chart: ChartJS) => {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;

        if (!ctx) {
            return;
        }

        ctx.save();
        if (chart.width !== null && chart.height !== null) {
            ctx.save();
            ctx.fillStyle = '#F1FCFD';
            ctx.fillRect(0, 0, chart.width, chart.height); // Ensure full coverage
        }

        // Draw background for title
        const titleOptions = chart.options.plugins?.title;
        if (titleOptions?.display) {
            const titleHeight = 30; // Approximation of title height
            ctx.fillRect(
                chartArea.left,
                chartArea.top - titleHeight,
                chartArea.right - chartArea.left,
                titleHeight
            );
        }

        ctx.restore();
    },
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, annotationPlugin, backgroundPlugin);

interface Dataset {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
}

interface ChartData {
    labels: string[]; //Session dates
    datasets: Dataset[];
    title: string;
    measurementType: string; //'Rate', 'Duration', or 'Count'
}

const LineGraph: React.FC<{ data: ChartData; average: number }> = ({ data, average }) => {
    const averages = data.datasets.map((dataset) => {
        const total = dataset.data.reduce((sum, value) => sum + value, 0);
        return total / dataset.data.length;
    });

    // Create a dataset for the average line with a single marker in the middle
    const avgDataset = averages.map((avg, index) => {
        const midIndex = Math.floor(data.labels.length / 2); // Find the middle index
        const avgData = new Array(data.labels.length).fill(null); // Fill the array with null values
        avgData[midIndex] = avg; // Set the average value only at the middle index
    
        return {
            label: `${data.datasets[index].label} Avg Marker`,
            data: avgData, // Only one value in the middle
            borderColor: 'transparent', // No line
            backgroundColor: data.datasets[index].borderColor || 'gray', // Marker color
            borderWidth: 0,
            pointRadius: 6, // Highlight the point
            pointBackgroundColor: data.datasets[index].borderColor || 'gray',
            pointBorderColor: data.datasets[index].borderColor || 'gray',
            pointHoverRadius: 8,
        };
    });

    const annotations = averages.reduce((acc, avg, index) => {
        acc[`averageLine-${index}`] = {
            type: 'line',
            yMin: avg,
            yMax: avg,
            borderColor: data.datasets[index].borderColor || 'gray',
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
                enabled: true,
                content: `${data.datasets[index].label} Avg: ${avg.toFixed(2)}`,
                position: 'end',
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
            },
        } as AnnotationOptions<'line'>;
        return acc;
    }, {} as Record<string, AnnotationOptions<'line'>>);

    const chartData = {
        labels: data.labels,
        datasets: [
            ...data.datasets.map((dataset) => ({
                ...dataset,
                tension: 0,
                fill: false,
            })),
            ...avgDataset,
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    filter: (legendItem: LegendItem) => !legendItem.text.includes('Avg'),
                    color: 'black',
                },
            },
            title: { 
                display: true, 
                text: data.title,
                color: 'black'
            },
            annotation: {
                annotations,
            },
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<'line'>) => {
                        const datasetLabel = context.dataset.label || '';
                        const rawValue = context.raw;
                        const value = typeof rawValue === 'number' ? rawValue : 0;
                        if (!datasetLabel.includes('Avg')) {
                            return `${datasetLabel}: ${value}`;
                        }
                        return `${datasetLabel}: ${value.toFixed(2)}`;
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: data.measurementType,
                    color: 'black',
                },
                ticks: {
                    color: 'black',
                },
                grid: {
                    color: 'gray',
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Date',
                    color: 'black',
                },
                ticks: {
                    color: 'black',
                },
                grid: {
                    color: 'gray',
                },
            },
        },
    };

    return <Line data={chartData} options={options} />;
};

export default LineGraph;
