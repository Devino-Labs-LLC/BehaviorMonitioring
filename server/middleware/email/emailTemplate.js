require('dotenv').config();
const { Resend } = require('resend');
const nodemailer = require('nodemailer');

const businessEmail = process.env.BUSINESS_EMAIL;
const businessPOCEmail = process.env.POC_Email;

// Lazy initialize Resend to support testing
let resend = null;
function getResendClient() {
    if (!resend) {
        resend = new Resend(process.env.Resend_API_KEY);
    }
    return resend;
}

function shouldBypassEmailDelivery() {
    const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
    const isTestEnv = process.env.NODE_ENV === 'test';
    const isJestRuntime = process.env.JEST_WORKER_ID !== undefined;

    // In CI runtime flows (e.g., Playwright-backed server startup), bypass external
    // email providers to avoid network/provider delays. Keep real provider paths
    // active for Jest, where tests assert provider call behavior via mocks.
    return isGithubActions && isTestEnv && !isJestRuntime;
}

// Lazy initialize Brevo SMTP transporter
let brevoTransporter = null;
function getBrevoTransporter() {
    if (!brevoTransporter) {
        const port = Number.parseInt(process.env.Brevo_SMTP_Port, 10);
        brevoTransporter = nodemailer.createTransport({
            host: process.env.Brevo_SMTP_Server,
            port: port,
            secure: port === 465, // true for 465, false for 587 (STARTTLS)
            auth: {
                user: process.env.Brevo_SMTP_Login,
                pass: process.env.Brevo_SMTP_Password
            }
        });
    }
    return brevoTransporter;
}

/**
 * Send email using Resend with Brevo SMTP fallback
 */
async function sendEmailWithFallback(emailData) {
    if (shouldBypassEmailDelivery()) {
        console.log('Skipping outbound email delivery during GitHub Actions test run.');
        return { success: true, provider: 'bypass', id: 'github-actions-test-bypass' };
    }

    try {
        // Ensure 'from' is a string for Resend
        let resendEmailData = { ...emailData };
        if (resendEmailData.from !== undefined && typeof resendEmailData.from === 'object') {
            resendEmailData.from = `${resendEmailData.from.name} <${resendEmailData.from.email}>`;
        }
        
        // Try Resend first
        const resendClient = getResendClient();
        const result = await resendClient.emails.send(resendEmailData);
        if (result.error) {
            throw result.error;
        }
        console.log('Email sent via Resend:', result.data.id);
        return { success: true, provider: 'resend', id: result.data.id };
    } catch (resendError) {
        console.warn('Resend failed, attempting fallback to Brevo SMTP:', resendError.message);
        try {
            // Parse from field for Brevo SMTP
            let fromAddress = emailData.from;
            if (fromAddress !== undefined && typeof fromAddress === 'object') {
                fromAddress = `${fromAddress.name} <${fromAddress.email}>`;
            }

            // Fallback to Brevo SMTP
            const transporter = getBrevoTransporter();
            const result = await transporter.sendMail({
                from: fromAddress,
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html
            });

            console.log('Email sent via Brevo SMTP:', result.messageId);
            return { success: true, provider: 'brevo', id: result.messageId };
        } catch (brevoError) {
            console.error('Both Resend and Brevo SMTP failed:', brevoError);
            return { success: false, provider: 'both', error: brevoError };
        }
    }
}

/**
 * Send verification email to new signup users
 */
async function sendSignupVerification(email, firstName, lastName, verificationToken) {
    const verificationLink = `${process.env.ClientHost}/verify-email?token=${verificationToken}`;
    
    const emailData = {
        to: email,
        from: { name: 'BMetrics', email: businessEmail },
        subject: 'BMetrics - Verify Your Account',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="font-size: 24px; color: #333; margin-bottom: 20px;">Welcome to BMetrics, ${firstName}!</h1>
                
                <p style="font-size: 16px; color: #555; line-height: 1.6;">
                    Thank you for registering with BMetrics. To complete your account setup, please verify your email address by clicking the button below:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" 
                       style="background-color: #4F46E5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; font-weight: 600;">
                        Verify Email Address
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #777; line-height: 1.6;">
                    Or copy and paste this link into your browser:<br>
                    <a href="${verificationLink}" style="color: #4F46E5; word-break: break-all;">${verificationLink}</a>
                </p>
                
                <p style="font-size: 14px; color: #777; line-height: 1.6; margin-top: 30px;">
                    <strong>Note:</strong> This link will expire in 24 hours for security reasons.
                </p>
                
                <p style="font-size: 14px; color: #777; line-height: 1.6;">
                    Once your email is verified, your account will be pending admin approval. You'll receive another email once approved.
                </p>
                
                <p style="font-size: 14px; color: #999; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                    If you didn't create this account, please ignore this email or contact support if you have concerns.
                </p>
            </div>
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
