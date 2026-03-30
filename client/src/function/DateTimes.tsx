export const getCurrentDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed, so add 1
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // Returns 'YYYY-MM-DD'
};

export const getCurrentTime = (): string => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // returns 'HH:MM'
};

export const formatDate = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '';
        
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`; // Returns 'MM/DD/YYYY'
    } catch {
        return '';
    }
};

export const formatTime = (timeString: string): string => {
    try {
        // Check if it's a time-only string like "14:30:00"
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeString)) {
            return timeString.slice(0, 5); // Return HH:MM
        }
        
        // Otherwise try to parse as a date
        const date = new Date(timeString);
        if (Number.isNaN(date.getTime())) return '';
        
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`; // Returns 'HH:MM'
    } catch {
        return '';
    }
};
