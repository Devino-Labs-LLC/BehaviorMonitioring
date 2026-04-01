import React from 'react';
import GraphComponent from '../components/LineGraph';

interface FetchedDataEntry {
    bsID: number;
    behaviorID: number;
    sessionDate: string;
    count: number;
    duration?: string;
    trial?: number;
}

interface GraphDataProcessorProps {
    fetchedData: FetchedDataEntry[];
    behaviorNames: Record<number, string>;
    title: string;
    measurementType: string;
    dateRange: number; // Pass the date range for conditional formatting
}

const GraphDataProcessor: React.FC<GraphDataProcessorProps> = ({ fetchedData, behaviorNames, title, measurementType, dateRange }) => {
    if (fetchedData.length === 0) {
        return <p>Loading data...</p>;
    }

    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

    // Function to generate date range based on selected range (daily or monthly)
    const generateDateRange = () => {
        const dates = [];
        const now = new Date();
    
        if (dateRange >= 30) {
            const monthOffset = Math.min(12, Math.ceil(dateRange / 30)); // Calculate the number of months to include
    
            if (dateRange === 30) {
                // Special case: Include the current and last months for "Last Month"
                for (let i = monthOffset; i >= 0; i--) {
                    const monthDate = new Date(now);
                    monthDate.setMonth(now.getMonth() - i);
                    // Format as 'MMM YYYY' for display
                    dates.push(new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short' }).format(monthDate));
                }
            } else {
                // General case: Include the correct range of months for other views
                for (let i = monthOffset - 1; i >= 0; i--) {
                    const monthDate = new Date(now);
                    monthDate.setMonth(now.getMonth() - i);
                    // Format as 'MMM YYYY' for display
                    dates.push(new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short' }).format(monthDate));
                }
            }
        } else {
            // Daily range: Include pastDate to now
            const pastDate = new Date();
            pastDate.setDate(now.getDate() - dateRange);
            let currentDate = new Date(pastDate);
    
            while (currentDate <= now) {
                // Use ISO format for internal use
                dates.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    
        return dates;
    };
                            
    const formattedDateRange = generateDateRange();

    // Function to format date based on the range
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return dateRange >= 30 ? new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short' }).format(date) 
        : 
        date.toISOString().split('T')[0];
    };

    // Step 1: Aggregate data by behaviorID and formatted date
    const aggregatedData = fetchedData.reduce((acc, entry) => {
        const { bsID, sessionDate, count, duration } = entry;
        const formattedDate = formatDate(sessionDate);
    
        let rate = 0;
        let totalDuration = 0;

        if (measurementType === 'Rate' && duration && count) {
            const [hours, minutes, seconds] = duration.split(':').map(Number);
            const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
            const totalMinutes = totalSeconds / 60; // Total minutes
            rate = totalMinutes > 0 ? count / totalMinutes : 0;
        }

        if (measurementType === 'Duration' && duration) {
            const [hours, minutes, seconds] = duration.split(':').map(Number);
            totalDuration = (hours * 3600) + (minutes * 60) + seconds;
        }
    
        const key = `${bsID}-${formattedDate}`;
        if (!acc[key]) {
            acc[key] = { behaviorID: bsID, sessionDate: formattedDate, rate: 0, count: 0, duration: 0 };
        }
        acc[key].rate += rate;
        acc[key].count += count;
        acc[key].duration += totalDuration;
    
        return acc;
    }, {} as Record<string, { behaviorID: number, sessionDate: string, rate: number, count: number, duration: number }>);

    const convertSecondsToHHMMSS = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    
    // Step 2: Group aggregated data by behaviorID
    const groupedByBehavior = Object.values(aggregatedData).reduce((acc, { behaviorID, sessionDate, rate, count, duration }) => {
        if (!acc[behaviorID]) acc[behaviorID] = {};

        let sessionValue: string | number = count;
        if (measurementType === 'Rate') {
            sessionValue = rate;
        } else if (measurementType === 'Duration') {
            sessionValue = convertSecondsToHHMMSS(duration);
        }

        acc[behaviorID][sessionDate] = sessionValue;
    
        return acc;
    }, {} as Record<number, Record<string, string | number>>);
    
    // Step 3: Prepare datasets and fill in missing dates with zero
    const datasets = Object.entries(groupedByBehavior).map(([behaviorID, dateData], index) => {
        const data = formattedDateRange.map((label) => {
            let value = label in dateData ? dateData[label] : 0; // Default to 0 if missing
    
            if (measurementType === 'Duration') {
                if (typeof value === 'string') {
                    const [hours, minutes, seconds] = value.split(':').map((part) => Number.parseInt(part, 10));
                    value = (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0); // Convert to seconds
                } else {
                    value = Number(value); // Ensure it's a number, though it's already a number here
                }
            } else {
                value = Number(value);
            }

            return value; // Return the value, now confirmed to be a number
        });
    
        return {
            label: behaviorNames[Number(behaviorID)] || `Behavior ${behaviorID}`,
            data,
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 2,
            fill: false,
            tension: 0,
        };
    });
                            
    // Step 4: Prepare the graphData object to pass to GraphComponent
    const average = datasets.reduce((sum, ds) => sum + ds.data.reduce((a, b) => a + b, 0), 0) / (datasets.length * formattedDateRange.length || 1);

    const graphData = { labels: formattedDateRange, datasets, title, measurementType };

    return <GraphComponent data={graphData} average={average} />;    
};

export default GraphDataProcessor;
