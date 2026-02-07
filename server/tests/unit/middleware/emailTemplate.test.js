jest.mock('resend');

// We'll require emailTemplate after setting up mocks in beforeEach
let emailTemplate;

describe('Email Template Unit Tests - Resend with Brevo Fallback', () => {
    let mockResendEmails;
    let mockResend;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules(); // Clear the module cache
        global.fetch = jest.fn();
        
        // Setup Resend mock BEFORE importing emailTemplate
        const { Resend } = require('resend');
        mockResendEmails = {
            send: jest.fn()
        };
        Resend.mockImplementation(() => ({
            emails: mockResendEmails
        }));
        mockResend = Resend;
        
        // Now import emailTemplate AFTER setting up the mock
        emailTemplate = require('../../../middleware/email/emailTemplate');
    });

    afterEach(() => {
        delete global.fetch;
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

        it('should fallback to Brevo when Resend fails', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: new Error('Resend API error'),
                data: null
            });
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ messageId: 'brevo-123' })
            });

            const result = await emailTemplate.sendSignupVerification(
                'user@example.com',
                'John',
                'Doe',
                'token'
            );

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.brevo.com/v3/smtp/email',
                expect.any(Object)
            );
        });

        it('should return false when both providers fail', async () => {
            mockResendEmails.send.mockRejectedValue(new Error('Resend error'));
            global.fetch.mockRejectedValue(new Error('Brevo error'));

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

    describe('Error Handling with Fallback Strategy', () => {
        it('should handle Resend API errors and fallback to Brevo', async () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            mockResendEmails.send.mockRejectedValue(new Error('Resend API error'));
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ messageId: 'brevo-msg' })
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
            expect(global.fetch).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });

        it('should log error when both providers fail', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockResendEmails.send.mockRejectedValue(new Error('Resend timeout'));
            global.fetch.mockRejectedValue(new Error('Brevo timeout'));

            const result = await emailTemplate.sendAccountApprovalNotification(
                'user@example.com',
                'John',
                'Doe',
                'johndoe'
            );

            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Both Resend and Brevo failed'),
                expect.anything()
            );
            consoleErrorSpy.mockRestore();
        });

        it('should handle network errors gracefully', async () => {
            mockResendEmails.send.mockRejectedValue(new Error('Network timeout'));
            global.fetch.mockRejectedValue(new Error('Network timeout'));

            const result = await emailTemplate.sendEmployeeVerification(
                'employee@example.com',
                'Alice',
                'Johnson',
                'alicej'
            );

            expect(result).toBe(false);
        });
    });
});
