require('dotenv').config();
const { Resend } = require('resend');

const businessEmail = process.env.BUSINESS_EMAIL;
const businessPOCEmail = process.env.POC_Email;
const brevoApiKey = process.env.Brevo_API_KEY;

// Lazy initialize Resend to support testing
let resend = null;
function getResendClient() {
    if (!resend) {
        resend = new Resend(process.env.Resend_API_KEY);
    }
    return resend;
}

/**
 * Parse 'from' string into email and name components
 * Supports formats: "email@domain.com" or "Name <email@domain.com>"
 */
function parseFromField(fromString) {
    const match = fromString.match(/^(?:(.+?)\s+)?<(.+?)>$|^(.+)$/);
    if (match) {
        if (match[2]) {
            // Format: "Name <email@domain.com>"
            return { name: match[1] || 'BMetrics', email: match[2] };
        } else if (match[3]) {
            // Format: "email@domain.com"
            return { name: 'BMetrics', email: match[3] };
        }
    }
    // Fallback
    return { name: 'BMetrics', email: fromString };
}

/**
 * Send email using Resend with Brevo fallback
 */
async function sendEmailWithFallback(emailData) {
    try {
        // Ensure 'from' is a string for Resend
        let resendEmailData = { ...emailData };
        if (typeof resendEmailData.from === 'object') {
            resendEmailData.from = `${resendEmailData.from.name} <${resendEmailData.from.email}>`;
        }
        
        // Try Resend first
        const resendClient = getResendClient();
        const result = await resendClient.emails.send(resendEmailData);
        if (result.error) {
            throw result.error;
        }
        return { success: true, provider: 'resend', id: result.data.id };
    } catch (resendError) {
        console.warn('Resend failed, attempting fallback to Brevo:', resendError.message);
        try {
            // Parse from field for Brevo
            let fromParsed = emailData.from;
            if (typeof fromParsed === 'string') {
                fromParsed = parseFromField(fromParsed);
            }

            // Fallback to Brevo REST API
            const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': brevoApiKey,
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    to: [{
                        email: emailData.to,
                        name: emailData.to.split('@')[0]
                    }],
                    sender: {
                        email: fromParsed.email,
                        name: fromParsed.name
                    },
                    subject: emailData.subject,
                    htmlContent: emailData.html
                })
            });

            if (!brevoResponse.ok) {
                throw new Error(`Brevo API error: ${brevoResponse.status} ${brevoResponse.statusText}`);
            }

            const result = await brevoResponse.json();
            return { success: true, provider: 'brevo', id: result.messageId };
        } catch (brevoError) {
            console.error('Both Resend and Brevo failed:', brevoError);
            return { success: false, provider: 'both', error: brevoError };
        }
    }
}

/**
 * Send verification email to new signup users
 */
async function sendSignupVerification(email, firstName, lastName, verificationToken) {
    const emailData = {
        to: email,
        from: { name: 'BMetrics', email: businessEmail },
        subject: 'BMetrics - Verify Your Account',
        html: `
            <h1 style="font-size: 22px; font-family: Arial, sans-serif;">Hello ${firstName} ${lastName},</h1>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">Thank you for registering with BMetrics.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">Your account has been created and is pending admin approval.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">Once approved, you will receive a confirmation email and can begin using BMetrics.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">If you did not create this account, please ignore this email.</p>
        `
    };

    try {
        const result = await sendEmailWithFallback(emailData);
        return result.success;
    } catch (error) {
        console.error('Error sending signup verification email:', error);
        return false;
    }
}

/**
 * Send account approval notification to user
 */
async function sendAccountApprovalNotification(email, firstName, lastName, username) {
    const emailData = {
        to: email,
        from: { name: 'BMetrics', email: businessEmail },
        subject: 'BMetrics - Account Approved',
        html: `
            <h1 style="font-size: 22px; font-family: Arial, sans-serif;">Hello ${firstName} ${lastName},</h1>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">Great news! Your BMetrics account has been approved.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">Your username is: <strong>${username}</strong></p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">You can now log in and start using BMetrics.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;"><a href="${process.env.ClientHost}/Login">Click here to login</a></p>
        `
    };

    try {
        const result = await sendEmailWithFallback(emailData);
        return result.success;
    } catch (error) {
        console.error('Error sending account approval email:', error);
        return false;
    }
}

/**
 * Send employee account verification (for admin-created accounts)
 */
async function sendEmployeeVerification(email, firstName, lastName, username) {
    const emailData = {
        to: email,
        from: { name: 'BMetrics', email: businessEmail },
        subject: 'BMetrics - Activate Your Account',
        html: `
            <h1 style="font-size: 22px; font-family: Arial, sans-serif;">Hello ${firstName} ${lastName},</h1>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">An account has been created for you on BMetrics.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">Your username is: <strong>${username}</strong></p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">Please click "Activate my account" below to set your password and activate your account.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;"><a href="${process.env.ClientHost}/AccountVerification/${username.toLowerCase()}">Activate my account</a></p>
        `
    };

    try {
        const result = await sendEmailWithFallback(emailData);
        return result.success;
    } catch (error) {
        console.error('Error sending employee verification email:', error);
        return false;
    }
}

/**
 * Send admin account verification
 */
async function sendAdminVerification(email, firstName, lastName, username) {
    const emailData = {
        to: email,
        from: { name: 'BMetrics Admin', email: businessEmail },
        subject: 'BMetrics - Admin Account Activation',
        html: `
            <h1 style="font-size: 22px; font-family: Arial, sans-serif;">Hello ${firstName} ${lastName},</h1>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">You have been added as an admin to BMetrics.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">Your username is: <strong>${username}</strong></p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">Please click "Verify my account" below to set your password and activate your account.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;"><a href="${process.env.ClientHost}/Admin/Verification/${username.toLowerCase()}">Verify my account</a></p>
        `
    };

    try {
        const result = await sendEmailWithFallback(emailData);
        return result.success;
    } catch (error) {
        console.error('Error sending admin verification email:', error);
        return false;
    }
}

/**
 * Send password recovery email
 */
async function sendPasswordRecovery(email, firstName, lastName, username, resetToken) {
    const emailData = {
        to: email,
        from: { name: 'BMetrics', email: businessEmail },
        subject: 'BMetrics - Password Recovery',
        html: `
            <h1 style="font-size: 22px; font-family: Arial, sans-serif;">Hello ${firstName} ${lastName},</h1>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">We received a request to reset your BMetrics password.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">Click "Reset my password" below to create a new password.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;"><a href="${process.env.ClientHost}/ResetPassword/${resetToken}">Reset my password</a></p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">This link will expire in 24 hours.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">If you did not request this, please ignore this email.</p>
        `
    };

    try {
        const result = await sendEmailWithFallback(emailData);
        return result.success;
    } catch (error) {
        console.error('Error sending password recovery email:', error);
        return false;
    }
}

/**
 * Send new signup notification to admin
 */
async function sendNewSignupNotificationToAdmin(firstName, lastName, email, companyName) {
    const emailData = {
        to: businessPOCEmail,
        from: { name: 'BMetrics', email: businessEmail },
        subject: 'BMetrics - New User Signup Pending Approval',
        html: `
            <h1 style="font-size: 22px; font-family: Arial, sans-serif;">New User Registration</h1>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">A new user has registered and is pending approval:</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;"><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;"><strong>Email:</strong> ${email}</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;"><strong>Company:</strong> ${companyName}</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;"><a href="${process.env.ClientHost}/Admin">Review in Admin Panel</a></p>
        `
    };

    try {
        const result = await sendEmailWithFallback(emailData);
        return result.success;
    } catch (error) {
        console.error('Error sending admin notification email:', error);
        return false;
    }
}

/**
 * Send database backup notification
 */
async function sendDatabaseBackupNotification() {
    const emailData = {
        to: businessPOCEmail,
        from: { name: 'BMetrics', email: businessEmail },
        subject: 'BMetrics - Database Backup Started',
        html: `
            <h1 style="font-size: 22px; font-family: Arial, sans-serif;">Database Backup Initiated</h1>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">The database backup has started.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">You will be notified when the backup completes.</p>
        `
    };

    try {
        const result = await sendEmailWithFallback(emailData);
        return result.success;
    } catch (error) {
        console.error('Error sending backup notification:', error);
        return false;
    }
}

/**
 * Send database backup results
 */
async function sendDatabaseBackupResults(status, logs) {
    const emailData = {
        to: businessPOCEmail,
        from: { name: 'BMetrics', email: businessEmail },
        subject: `BMetrics - Database Backup ${status}`,
        html: `
            <h1 style="font-size: 22px; font-family: Arial, sans-serif;">Database Backup Results</h1>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">The database backup completed with status: <strong>${status}</strong></p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;"><strong>Logs:</strong></p>
            <pre style="font-size: 14px; font-family: monospace; background-color: #f5f5f5; padding: 10px;">${logs}</pre>
        `
    };

    try {
        const result = await sendEmailWithFallback(emailData);
        return result.success;
    } catch (error) {
        console.error('Error sending backup results:', error);
        return false;
    }
}

/**
 * Send reminder email about upcoming client data deletion
 */
async function sendClientDataDeletionReminder(clientName, daysRemaining, deletionDate, archivedDate) {
    const emailData = {
        to: businessPOCEmail,
        from: { name: 'BMetrics', email: businessEmail },
        subject: `BMetrics - Client Data Deletion Reminder: ${daysRemaining} Days`,
        html: `
            <h1 style="font-size: 22px; font-family: Arial, sans-serif;">Client Data Deletion Reminder</h1>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">This is a reminder that archived client data will be permanently deleted soon.</p>
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="font-size: 16px; font-family: Arial, sans-serif; margin: 5px 0;"><strong>Client Name:</strong> ${clientName}</p>
                <p style="font-size: 16px; font-family: Arial, sans-serif; margin: 5px 0;"><strong>Archived Date:</strong> ${archivedDate}</p>
                <p style="font-size: 16px; font-family: Arial, sans-serif; margin: 5px 0;"><strong>Scheduled Deletion Date:</strong> ${deletionDate}</p>
                <p style="font-size: 16px; font-family: Arial, sans-serif; margin: 5px 0;"><strong>Days Remaining:</strong> ${daysRemaining} days</p>
            </div>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">If you need to retain this data, please unarchive the client before the deletion date.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">After the deletion date, this data will be permanently removed and cannot be recovered.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;"><a href="${process.env.ClientHost}/Admin/ArchivedClients">View Archived Clients</a></p>
        `
    };

    try {
        const result = await sendEmailWithFallback(emailData);
        return result.success;
    } catch (error) {
        console.error('Error sending deletion reminder:', error);
        return false;
    }
}

/**
 * Send notification that client data has been deleted
 */
async function sendClientDataDeleted(clientName, deletionDate, archivedDate) {
    const emailData = {
        to: businessPOCEmail,
        from: { name: 'BMetrics', email: businessEmail },
        subject: `BMetrics - Client Data Deleted: ${clientName}`,
        html: `
            <h1 style="font-size: 22px; font-family: Arial, sans-serif;">Client Data Deleted</h1>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">Archived client data has been permanently deleted as scheduled.</p>
            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
                <p style="font-size: 16px; font-family: Arial, sans-serif; margin: 5px 0;"><strong>Client Name:</strong> ${clientName}</p>
                <p style="font-size: 16px; font-family: Arial, sans-serif; margin: 5px 0;"><strong>Archived Date:</strong> ${archivedDate}</p>
                <p style="font-size: 16px; font-family: Arial, sans-serif; margin: 5px 0;"><strong>Deletion Date:</strong> ${deletionDate}</p>
            </div>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">This data is now permanently removed from the system and cannot be recovered.</p>
            <p style="font-size: 16px; font-family: Arial, sans-serif;">This is an automated notification for compliance and record-keeping purposes.</p>
        `
    };

    try {
        const result = await sendEmailWithFallback(emailData);
        return result.success;
    } catch (error) {
        console.error('Error sending deletion notification:', error);
        return false;
    }
}

module.exports = {
    sendSignupVerification,
    sendAccountApprovalNotification,
    sendEmployeeVerification,
    sendAdminVerification,
    sendPasswordRecovery,
    sendNewSignupNotificationToAdmin,
    sendDatabaseBackupNotification,
    sendDatabaseBackupResults,
    sendClientDataDeletionReminder,
    sendClientDataDeleted
};