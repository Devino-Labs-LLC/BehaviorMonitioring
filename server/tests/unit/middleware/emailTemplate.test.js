const sgMail = require('@sendgrid/mail');
const emailTemplate = require('../../../middleware/email/emailTemplate');

// Mock SendGrid
jest.mock('@sendgrid/mail');

describe('Email Template Unit Tests', () => {
    const mockSend = jest.fn();
    
    beforeAll(() => {
        // Tests will use actual environment variables from .env
        sgMail.send = mockSend;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('sendSignupVerification', () => {
        it('should send signup verification email with correct parameters', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const result = await emailTemplate.sendSignupVerification(
                'user@example.com',
                'John',
                'Doe',
                'test-token-123'
            );

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user@example.com',
                    from: expect.objectContaining({ name: 'BMetrics' }),
                    subject: 'BMetrics - Verify Your Account'
                })
            );
        });

        it('should include user name in email body', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            await emailTemplate.sendSignupVerification(
                'user@example.com',
                'Jane',
                'Smith',
                'token-456'
            );

            const emailCall = mockSend.mock.calls[0][0];
            expect(emailCall.html).toContain('Hello Jane Smith');
            expect(emailCall.html).toContain('pending admin approval');
        });

        it('should return false when email sending fails', async () => {
            mockSend.mockRejectedValue(new Error('SendGrid error'));

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
        it('should send account approval email with correct parameters', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const result = await emailTemplate.sendAccountApprovalNotification(
                'user@example.com',
                'John',
                'Doe',
                'johndoe'
            );

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user@example.com',
                    subject: 'BMetrics - Account Approved'
                })
            );
        });

        it('should include username and login link in email', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            await emailTemplate.sendAccountApprovalNotification(
                'user@example.com',
                'John',
                'Doe',
                'johndoe'
            );

            const emailCall = mockSend.mock.calls[0][0];
            expect(emailCall.html).toContain('johndoe');
            expect(emailCall.html).toContain('http://localhost:3000/Login');
        });

        it('should handle sending errors gracefully', async () => {
            mockSend.mockRejectedValue(new Error('Network error'));

            const result = await emailTemplate.sendAccountApprovalNotification(
                'user@example.com',
                'John',
                'Doe',
                'johndoe'
            );

            expect(result).toBe(false);
        });
    });

    describe('sendEmployeeVerification', () => {
        it('should send employee verification email', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const result = await emailTemplate.sendEmployeeVerification(
                'employee@example.com',
                'Alice',
                'Johnson',
                'alicej'
            );

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'employee@example.com',
                    subject: 'BMetrics - Activate Your Account'
                })
            );
        });

        it('should include activation link with username', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            await emailTemplate.sendEmployeeVerification(
                'employee@example.com',
                'Alice',
                'Johnson',
                'AliceJ'
            );

            const emailCall = mockSend.mock.calls[0][0];
            expect(emailCall.html).toContain('alicej'); // lowercase
            expect(emailCall.html).toContain('AccountVerification/alicej');
        });
    });

    describe('sendAdminVerification', () => {
        it('should send admin verification email', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const result = await emailTemplate.sendAdminVerification(
                'admin@example.com',
                'Bob',
                'Admin',
                'bobadmin'
            );

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'admin@example.com',
                    from: expect.objectContaining({ name: 'BMetrics Admin' }),
                    subject: 'BMetrics - Admin Account Activation'
                })
            );
        });

        it('should include admin verification link', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            await emailTemplate.sendAdminVerification(
                'admin@example.com',
                'Bob',
                'Admin',
                'BobAdmin'
            );

            const emailCall = mockSend.mock.calls[0][0];
            expect(emailCall.html).toContain('Admin/Verification/bobadmin');
        });
    });

    describe('sendPasswordRecovery', () => {
        it('should send password recovery email with reset token', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const result = await emailTemplate.sendPasswordRecovery(
                'user@example.com',
                'John',
                'Doe',
                'johndoe',
                'reset-token-123'
            );

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user@example.com',
                    subject: 'BMetrics - Password Recovery'
                })
            );
        });

        it('should include reset link with token', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            await emailTemplate.sendPasswordRecovery(
                'user@example.com',
                'John',
                'Doe',
                'johndoe',
                'reset-token-xyz'
            );

            const emailCall = mockSend.mock.calls[0][0];
            expect(emailCall.html).toContain('ResetPassword/reset-token-xyz');
            expect(emailCall.html).toContain('24 hours');
        });
    });

    describe('sendNewSignupNotificationToAdmin', () => {
        it('should send notification to admin about new signup', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const result = await emailTemplate.sendNewSignupNotificationToAdmin(
                'John',
                'Doe',
                'john@example.com',
                'Acme Corp'
            );

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: expect.any(String), // Will use POC_Email from env
                    subject: 'BMetrics - New User Signup Pending Approval'
                })
            );
        });

        it('should include user details in admin notification', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            await emailTemplate.sendNewSignupNotificationToAdmin(
                'Jane',
                'Smith',
                'jane@company.com',
                'Tech Industries'
            );

            const emailCall = mockSend.mock.calls[0][0];
            expect(emailCall.html).toContain('Jane Smith');
            expect(emailCall.html).toContain('jane@company.com');
            expect(emailCall.html).toContain('Tech Industries');
        });
    });

    describe('sendDatabaseBackupNotification', () => {
        it('should send backup notification to admin', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const result = await emailTemplate.sendDatabaseBackupNotification();

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: expect.any(String), // Will use POC_Email from env
                    subject: 'BMetrics - Database Backup Started'
                })
            );
        });
    });

    describe('sendDatabaseBackupResults', () => {
        it('should send backup results with success status', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const result = await emailTemplate.sendDatabaseBackupResults(
                'Success',
                'Backup completed in 2.5 seconds'
            );

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'BMetrics - Database Backup Success'
                })
            );
        });

        it('should include status and logs in email', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            await emailTemplate.sendDatabaseBackupResults(
                'Failed',
                'Error: Connection timeout'
            );

            const emailCall = mockSend.mock.calls[0][0];
            expect(emailCall.html).toContain('Failed');
            expect(emailCall.html).toContain('Error: Connection timeout');
        });
    });

    describe('Error Handling', () => {
        it('should handle SendGrid API errors', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockSend.mockRejectedValue(new Error('API key invalid'));

            const result = await emailTemplate.sendSignupVerification(
                'user@example.com',
                'John',
                'Doe',
                'token'
            );

            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });

        it('should handle network errors', async () => {
            mockSend.mockRejectedValue(new Error('Network timeout'));

            const result = await emailTemplate.sendAccountApprovalNotification(
                'user@example.com',
                'John',
                'Doe',
                'johndoe'
            );

            expect(result).toBe(false);
        });
    });
});
