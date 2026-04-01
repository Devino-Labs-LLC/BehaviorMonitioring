jest.mock('resend');
jest.mock('nodemailer');

// We'll require emailTemplate after setting up mocks in beforeEach
let emailTemplate;

describe('Email Template Unit Tests - Resend with Brevo SMTP Fallback', () => {
    let mockResendEmails;
    let mockSendMail;
    let mockNodemailer;
    let originalGithubActions;
    let originalNodeEnv;
    let originalJestWorkerId;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules(); // Clear the module cache
        originalGithubActions = process.env.GITHUB_ACTIONS;
        originalNodeEnv = process.env.NODE_ENV;
        originalJestWorkerId = process.env.JEST_WORKER_ID;
        
        // Setup Resend mock BEFORE importing emailTemplate
        const { Resend } = require('resend');
        mockResendEmails = {
            send: jest.fn()
        };
        Resend.mockImplementation(() => ({
            emails: mockResendEmails
        }));
        // Setup nodemailer mock BEFORE importing emailTemplate
        mockSendMail = jest.fn();
        mockNodemailer = require('nodemailer');
        mockNodemailer.createTransport.mockReturnValue({
            sendMail: mockSendMail
        });
        
        // Now import emailTemplate AFTER setting up the mocks
        emailTemplate = require('../../../middleware/email/emailTemplate');
    });

    afterEach(() => {
        process.env.GITHUB_ACTIONS = originalGithubActions;
        process.env.NODE_ENV = originalNodeEnv;
        process.env.JEST_WORKER_ID = originalJestWorkerId;
        jest.resetModules();
    });

    describe('sendSignupVerification', () => {
        it('should send signup verification email using Resend', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-123' }
            });

            const result = await emailTemplate.sendSignupVerification(
                'user@example.com',
                'John',
                'Doe',
                'test-token-123'
            );

            expect(result).toBe(true);
            expect(mockResendEmails.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user@example.com',
                    from: expect.stringContaining('BMetrics'),
                    subject: 'BMetrics - Verify Your Account'
                })
            );
        });

        it('should fallback to Brevo SMTP when Resend fails', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: new Error('Resend API error'),
                data: null
            });
            mockSendMail.mockResolvedValue({
                messageId: 'brevo-123'
            });

            const result = await emailTemplate.sendSignupVerification(
                'user@example.com',
                'John',
                'Doe',
                'token'
            );

            expect(result).toBe(true);
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user@example.com',
                    subject: 'BMetrics - Verify Your Account'
                })
            );
        });

        it('should return false when both providers fail', async () => {
            mockResendEmails.send.mockRejectedValue(new Error('Resend error'));
            mockSendMail.mockRejectedValue(new Error('Brevo SMTP error'));

            const result = await emailTemplate.sendSignupVerification(
                'user@example.com',
                'John',
                'Doe',
                'token'
            );

            expect(result).toBe(false);
        });
    });

    describe('sendAccountApprovalNotification', () => {
        it('should send account approval email using Resend', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-456' }
            });

            const result = await emailTemplate.sendAccountApprovalNotification(
                'user@example.com',
                'John',
                'Doe',
                'johndoe'
            );

            expect(result).toBe(true);
            expect(mockResendEmails.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user@example.com',
                    subject: 'BMetrics - Account Approved'
                })
            );
        });

        it('should include username and login link in email', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-456' }
            });

            await emailTemplate.sendAccountApprovalNotification(
                'user@example.com',
                'John',
                'Doe',
                'johndoe'
            );

            const emailCall = mockResendEmails.send.mock.calls[0][0];
            expect(emailCall.html).toContain('johndoe');
            expect(emailCall.html).toContain('/Login');
        });
    });

    describe('sendEmployeeVerification', () => {
        it('should send employee verification email', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-789' }
            });

            const result = await emailTemplate.sendEmployeeVerification(
                'employee@example.com',
                'Alice',
                'Johnson',
                'alicej'
            );

            expect(result).toBe(true);
            expect(mockResendEmails.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'employee@example.com',
                    subject: 'BMetrics - Activate Your Account'
                })
            );
        });

        it('should include activation link with lowercase username', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-789' }
            });

            await emailTemplate.sendEmployeeVerification(
                'employee@example.com',
                'Alice',
                'Johnson',
                'AliceJ'
            );

            const emailCall = mockResendEmails.send.mock.calls[0][0];
            expect(emailCall.html).toContain('alicej');
            expect(emailCall.html).toContain('AccountVerification/alicej');
        });
    });

    describe('sendAdminVerification', () => {
        it('should send admin verification email', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-admin' }
            });

            const result = await emailTemplate.sendAdminVerification(
                'admin@example.com',
                'Bob',
                'Admin',
                'bobadmin'
            );

            expect(result).toBe(true);
            expect(mockResendEmails.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'admin@example.com',
                    from: expect.stringContaining('BMetrics Admin'),
                    subject: 'BMetrics - Admin Account Activation'
                })
            );
        });

        it('should include admin verification link with case conversion', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-admin' }
            });

            await emailTemplate.sendAdminVerification(
                'admin@example.com',
                'Bob',
                'Admin',
                'BobAdmin'
            );

            const emailCall = mockResendEmails.send.mock.calls[0][0];
            expect(emailCall.html).toContain('Admin/Verification/bobadmin');
        });
    });

    describe('sendPasswordRecovery', () => {
        it('should send password recovery email with reset token', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-reset' }
            });

            const result = await emailTemplate.sendPasswordRecovery(
                'user@example.com',
                'John',
                'Doe',
                'johndoe',
                'reset-token-123'
            );

            expect(result).toBe(true);
            expect(mockResendEmails.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user@example.com',
                    subject: 'BMetrics - Password Recovery'
                })
            );
        });

        it('should include reset link with token and expiration info', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-reset' }
            });

            await emailTemplate.sendPasswordRecovery(
                'user@example.com',
                'John',
                'Doe',
                'johndoe',
                'reset-token-xyz'
            );

            const emailCall = mockResendEmails.send.mock.calls[0][0];
            expect(emailCall.html).toContain('ResetPassword/reset-token-xyz');
            expect(emailCall.html).toContain('24 hours');
        });
    });

    describe('sendNewSignupNotificationToAdmin', () => {
        it('should send notification to admin about new signup', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-admin-notif' }
            });

            const result = await emailTemplate.sendNewSignupNotificationToAdmin(
                'John',
                'Doe',
                'john@example.com',
                'Acme Corp'
            );

            expect(result).toBe(true);
            expect(mockResendEmails.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'BMetrics - New User Signup Pending Approval'
                })
            );
        });

        it('should include user details in admin notification', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-admin-notif' }
            });

            await emailTemplate.sendNewSignupNotificationToAdmin(
                'Jane',
                'Smith',
                'jane@company.com',
                'Tech Industries'
            );

            const emailCall = mockResendEmails.send.mock.calls[0][0];
            expect(emailCall.html).toContain('Jane Smith');
            expect(emailCall.html).toContain('jane@company.com');
            expect(emailCall.html).toContain('Tech Industries');
        });
    });

    describe('sendDatabaseBackupNotification', () => {
        it('should send backup notification to admin', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-backup' }
            });

            const result = await emailTemplate.sendDatabaseBackupNotification();

            expect(result).toBe(true);
            expect(mockResendEmails.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'BMetrics - Database Backup Started'
                })
            );
        });
    });

    describe('sendDatabaseBackupResults', () => {
        it('should send backup results with success status', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-backup-result' }
            });

            const result = await emailTemplate.sendDatabaseBackupResults(
                'Success',
                'Backup completed in 2.5 seconds'
            );

            expect(result).toBe(true);
            expect(mockResendEmails.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'BMetrics - Database Backup Success'
                })
            );
        });

        it('should include status and logs in email', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-backup-result' }
            });

            await emailTemplate.sendDatabaseBackupResults(
                'Failed',
                'Error: Connection timeout'
            );

            const emailCall = mockResendEmails.send.mock.calls[0][0];
            expect(emailCall.html).toContain('Failed');
            expect(emailCall.html).toContain('Error: Connection timeout');
        });
    });

    describe('archived client notifications', () => {
        it('should send a deletion reminder email with archival metadata', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-reminder' }
            });

            const result = await emailTemplate.sendClientDataDeletionReminder(
                'John Doe',
                30,
                '2032-01-01',
                '2025-01-01'
            );

            expect(result).toBe(true);

            const emailCall = mockResendEmails.send.mock.calls[0][0];
            expect(emailCall.subject).toContain('30 Days');
            expect(emailCall.html).toContain('John Doe');
            expect(emailCall.html).toContain('2025-01-01');
            expect(emailCall.html).toContain('2032-01-01');
            expect(emailCall.html).toContain('30 days');
            expect(emailCall.html).toContain('/Admin/ArchivedClients');
        });

        it('should send a deleted-data notification email', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-deleted' }
            });

            const result = await emailTemplate.sendClientDataDeleted(
                'Jane Smith',
                '2032-02-01',
                '2025-02-01'
            );

            expect(result).toBe(true);

            const emailCall = mockResendEmails.send.mock.calls[0][0];
            expect(emailCall.subject).toContain('Jane Smith');
            expect(emailCall.html).toContain('Client Data Deleted');
            expect(emailCall.html).toContain('2025-02-01');
            expect(emailCall.html).toContain('2032-02-01');
            expect(emailCall.html).toContain('permanently removed');
        });
    });

    describe('Error Handling with Fallback Strategy', () => {
        it('should handle Resend API errors and fallback to Brevo SMTP', async () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            mockResendEmails.send.mockRejectedValue(new Error('Resend API error'));
            mockSendMail.mockResolvedValue({
                messageId: 'brevo-msg'
            });

            const result = await emailTemplate.sendSignupVerification(
                'user@example.com',
                'John',
                'Doe',
                'token'
            );

            expect(result).toBe(true);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Resend failed'),
                expect.anything()
            );
            expect(mockSendMail).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });

        it('should log error when both providers fail', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockResendEmails.send.mockRejectedValue(new Error('Resend timeout'));
            mockSendMail.mockRejectedValue(new Error('Brevo SMTP timeout'));

            const result = await emailTemplate.sendAccountApprovalNotification(
                'user@example.com',
                'John',
                'Doe',
                'johndoe'
            );

            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Both Resend and Brevo SMTP failed'),
                expect.anything()
            );
            consoleErrorSpy.mockRestore();
        });

        it('should handle network errors gracefully', async () => {
            mockResendEmails.send.mockRejectedValue(new Error('Network timeout'));
            mockSendMail.mockRejectedValue(new Error('Network timeout'));

            const result = await emailTemplate.sendEmployeeVerification(
                'employee@example.com',
                'Alice',
                'Johnson',
                'alicej'
            );

            expect(result).toBe(false);
        });

        it('bypasses outbound delivery during GitHub Actions test startup flows', async () => {
            process.env.GITHUB_ACTIONS = 'true';
            process.env.NODE_ENV = 'test';
            delete process.env.JEST_WORKER_ID;

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await emailTemplate.sendSignupVerification(
                'user@example.com',
                'John',
                'Doe',
                'token'
            );

            expect(result).toBe(true);
            expect(mockResendEmails.send).not.toHaveBeenCalled();
            expect(mockSendMail).not.toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(
                'Skipping outbound email delivery during GitHub Actions test run.'
            );

            consoleLogSpy.mockRestore();
        });
    });
});
