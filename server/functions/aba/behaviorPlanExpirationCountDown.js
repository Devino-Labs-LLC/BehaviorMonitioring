const { differenceInDays } = require('date-fns');

function behaviorPlanExpirationCountDown(targetDate) {
    return new Promise((resolve, reject) => {
        try {
            const now = new Date();
            const target = new Date(targetDate);

            if (Number.isNaN(target.getTime())) {
                reject(new Error('Invalid target date'));
                return;
            }

            if (now > target) {
                resolve(0); // The target date has already passed, return 0 days
                return;
            }

            const daysDifference = differenceInDays(target, now);

            resolve(daysDifference);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    behaviorPlanExpirationCountDown
}
