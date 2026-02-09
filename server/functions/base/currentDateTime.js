const options = { timeZone: 'America/New_York' };
const timeOptions = {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
};

async function getCurrentDate() {
    return new Promise((resolve, reject) => {
        try {
            const currentDate = new Date();
            resolve(currentDate.toLocaleDateString('en-US', options));
        } catch (error) {
            reject(error);
        }
    });
}

async function getCurrentTime() {
    return new Promise((resolve, reject) => {
        try {
            const currentDate = new Date();
            resolve(currentDate.toLocaleTimeString('en-US', timeOptions));
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    getCurrentDate,
    getCurrentTime
}