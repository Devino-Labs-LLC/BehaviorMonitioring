/**
 * Scheduled Job: Archive Cleanup and Reminder System
 * 
 * This job runs daily to:
 * 1. Send 90-day, 60-day, and 30-day reminders before client data deletion
 * 2. Permanently delete client data that has reached the 7-year retention limit
 * 
 * Schedule: Runs once per day (recommended: early morning, e.g., 2 AM)
 * 
 * Setup Options:
 * - Use cron (Linux/Mac): 0 2 * * * node server/jobs/archiveCleanup.js
 * - Use node-cron package: Install and uncomment the cron setup at the bottom
 * - Use PM2 with cron: pm2 start server/jobs/archiveCleanup.js --cron "0 2 * * *"
 * - Use cloud scheduler (AWS EventBridge, Google Cloud Scheduler, etc.)
 */

require('dotenv').config();
const adminQueries = require('../middleware/helpers/AdminQueries');
const emailTemplate = require('../middleware/email/emailTemplate');

/**
 * Calculate days between two dates
 */
function daysBetween(date1Str, date2Str) {
    const date1 = new Date(date1Str);
    const date2 = new Date(date2Str);
    const diffTime = date2 - date1;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Process 90-day reminders
 */
async function send90DayReminders() {
    try {
        // Get clients with deletion date 90 days from now (±1 day tolerance)
        const clients = await adminQueries.adminGetClientsForDeletion(90);
        
        let remindersSent = 0;
        for (const client of clients) {
            // Check if reminder not already sent
            if (!client.reminder_90_sent) {
                const daysUntilDeletion = daysBetween(
                    new Date().toISOString().split('T')[0],
                    client.archived_deletion_date
                );
                
                // Send reminder if within 89-91 days range
                if (daysUntilDeletion >= 89 && daysUntilDeletion <= 91) {
                    await emailTemplate.sendClientDataDeletionReminder(
                        `${client.fName} ${client.lName}`,
                        90,
                        client.archived_deletion_date,
                        client.archived_date
                    );
                    
                    await adminQueries.adminUpdateReminderSent(client.clientID, '90');
                    remindersSent++;
                }
            }
        }
        
        if (remindersSent > 0) {
            console.log(`✓ Sent ${remindersSent} 90-day deletion reminders`);
        }
        return remindersSent;
    } catch (error) {
        console.error('Error sending 90-day reminders:', error);
        return 0;
    }
}

/**
 * Process 60-day reminders
 */
async function send60DayReminders() {
    try {
        const clients = await adminQueries.adminGetClientsForDeletion(60);
        
        let remindersSent = 0;
        for (const client of clients) {
            if (!client.reminder_60_sent) {
                const daysUntilDeletion = daysBetween(
                    new Date().toISOString().split('T')[0],
                    client.archived_deletion_date
                );
                
                // Send reminder if within 59-61 days range
                if (daysUntilDeletion >= 59 && daysUntilDeletion <= 61) {
                    await emailTemplate.sendClientDataDeletionReminder(
                        `${client.fName} ${client.lName}`,
                        60,
                        client.archived_deletion_date,
                        client.archived_date
                    );
                    
                    await adminQueries.adminUpdateReminderSent(client.clientID, '60');
                    remindersSent++;
                }
            }
        }
        
        if (remindersSent > 0) {
            console.log(`✓ Sent ${remindersSent} 60-day deletion reminders`);
        }
        return remindersSent;
    } catch (error) {
        console.error('Error sending 60-day reminders:', error);
        return 0;
    }
}

/**
 * Process 30-day reminders
 */
async function send30DayReminders() {
    try {
        const clients = await adminQueries.adminGetClientsForDeletion(30);
        
        let remindersSent = 0;
        for (const client of clients) {
            if (!client.reminder_30_sent) {
                const daysUntilDeletion = daysBetween(
                    new Date().toISOString().split('T')[0],
                    client.archived_deletion_date
                );
                
                // Send reminder if within 29-31 days range
                if (daysUntilDeletion >= 29 && daysUntilDeletion <= 31) {
                    await emailTemplate.sendClientDataDeletionReminder(
                        `${client.fName} ${client.lName}`,
                        30,
                        client.archived_deletion_date,
                        client.archived_date
                    );
                    
                    await adminQueries.adminUpdateReminderSent(client.clientID, '30');
                    remindersSent++;
                }
            }
        }
        
        if (remindersSent > 0) {
            console.log(`✓ Sent ${remindersSent} 30-day deletion reminders`);
        }
        return remindersSent;
    } catch (error) {
        console.error('Error sending 30-day reminders:', error);
        return 0;
    }
}

/**
 * Delete clients whose deletion date has passed
 */
async function deleteExpiredClients() {
    try {
        // Get clients with deletion date today or earlier
        const clients = await adminQueries.adminGetClientsForDeletion(0);
        
        let clientsDeleted = 0;
        for (const client of clients) {
            const daysUntilDeletion = daysBetween(
                new Date().toISOString().split('T')[0],
                client.archived_deletion_date
            );
            
            // Delete if deletion date has passed (0 or negative days)
            if (daysUntilDeletion <= 0) {
                await adminQueries.adminDeleteArchivedClient(client.clientID, client.companyID);
                
                // Send deletion notification
                await emailTemplate.sendClientDataDeleted(
                    `${client.fName} ${client.lName}`,
                    client.archived_deletion_date,
                    client.archived_date
                );
                
                clientsDeleted++;
            }
        }
        
        if (clientsDeleted > 0) {
            console.log(`✓ Deleted ${clientsDeleted} expired client records`);
        }
        return clientsDeleted;
    } catch (error) {
        console.error('Error deleting expired clients:', error);
        return 0;
    }
}

/**
 * Main job execution
 */
async function runArchiveCleanup() {
    console.log('\n========================================');
    console.log('Archive Cleanup Job Started');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('========================================\n');
    
    try {
        // Run all tasks
        const reminders90 = await send90DayReminders();
        const reminders60 = await send60DayReminders();
        const reminders30 = await send30DayReminders();
        const deletions = await deleteExpiredClients();
        
        console.log('\n========================================');
        console.log('Archive Cleanup Job Completed');
        console.log(`90-day reminders: ${reminders90}`);
        console.log(`60-day reminders: ${reminders60}`);
        console.log(`30-day reminders: ${reminders30}`);
        console.log(`Clients deleted: ${deletions}`);
        console.log('========================================\n');
        
        return {
            success: true,
            reminders90,
            reminders60,
            reminders30,
            deletions
        };
    } catch (error) {
        console.error('\n✗ Archive cleanup job failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Export for manual execution or testing
module.exports = {
    runArchiveCleanup,
    send90DayReminders,
    send60DayReminders,
    send30DayReminders,
    deleteExpiredClients
};

const isRunDirectly = require.main?.filename === __filename;

// If running directly (not imported)
if (isRunDirectly) {
    runArchiveCleanup()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Job failed:', error);
            process.exit(1);
        });
}

/* 
 * OPTIONAL: Use node-cron for built-in scheduling
 * Uncomment below to run automatically without external cron
 * 
 * First install: npm install node-cron
 * 
const cron = require('node-cron');

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', () => {
    runArchiveCleanup();
}, {
    timezone: "America/New_York" // Adjust to your timezone
});

console.log('Archive cleanup job scheduled: Daily at 2:00 AM EST');
*/
