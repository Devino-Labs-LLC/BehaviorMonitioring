const sgMail = require('@sendgrid/mail');
const emailTemplate = require('../../../middleware/email/emailTemplate');

// Mock SendGrid
jest.mock('@sendgrid/mail');

describe('Email Template Integration Tests', () => {
    const mockSend = jest.fn();

    beforeAll(() => {
        // Tests will use actual environment variables from .env
        sgMail.send = mockSend;
        sgMail.setApiKey = jest.fn();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Signup Flow Integration', () => {
        it('should send signup verification and admin notification in sequence', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            // User signs up
            const userEmailResult = await emailTemplate.sendSignupVerification(
                'newuser@example.com',
                'New',
                'User',
                'verification-token-123'
            );

            // Admin gets notified
            const adminEmailResult = await emailTemplate.sendNewSignupNotificationToAdmin(
                'New',
                'User',
                'newuser@example.com',
                'New Company Inc'
            );

            expect(userEmailResult).toBe(true);
            expect(adminEmailResult).toBe(true);
            expect(mockSend).toHaveBeenCalledTimes(2);

            // Verify user email
            expect(mockSend.mock.calls[0][0]).toMatchObject({
                to: 'newuser@example.com',
                subject: 'BMetrics - Verify Your Account'
            });

            // Verify admin notification
            expect(mockSend.mock.calls[1][0]).toMatchObject({
                to: expect.any(String), // POC_Email from env
                subject: 'BMetrics - New User Signup Pending Approval'
            });
        });

        it('should send approval notification after admin approves', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const result = await emailTemplate.sendAccountApprovalNotification(
                'newuser@example.com',
                'New',
                'User',
                'newuser'
            );

            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'newuser@example.com',
                    subject: 'BMetrics - Account Approved'
                })
            );

            const emailBody = mockSend.mock.calls[0][0].html;
            const clientHost = process.env.ClientHost;
            expect(emailBody).toContain(`${clientHost}/Login`);
        });
    });

    describe('Password Recovery Flow Integration', () => {
        it('should send password recovery email with valid reset link', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const resetToken = 'reset-token-abc123';
            const result = await emailTemplate.sendPasswordRecovery(
                'user@example.com',
                'Test',
                'User',
                'testuser',
                resetToken
            );

            expect(result).toBe(true);
            
            const emailCall = mockSend.mock.calls[0][0];
            const clientHost = process.env.ClientHost;
            expect(emailCall.to).toBe('user@example.com');
            expect(emailCall.html).toContain(`${clientHost}/ResetPassword/${resetToken}`);
            expect(emailCall.html).toContain('24 hours');
        });
    });

    describe('Employee Onboarding Flow Integration', () => {
        it('should send verification email for new employee', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const result = await emailTemplate.sendEmployeeVerification(
                'employee@company.com',
                'Jane',
                'Employee',
                'JaneE'
            );

            expect(result).toBe(true);

            const emailCall = mockSend.mock.calls[0][0];
            expect(emailCall.to).toBe('employee@company.com');
            expect(emailCall.subject).toBe('BMetrics - Activate Your Account');
            expect(emailCall.html).toContain('janee'); // Lowercased
            expect(emailCall.html).toContain('AccountVerification/janee');
        });

        it('should send verification email for new admin', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const result = await emailTemplate.sendAdminVerification(
                'admin@company.com',
                'John',
                'Admin',
                'JohnA'
            );

            expect(result).toBe(true);

            const emailCall = mockSend.mock.calls[0][0];
            expect(emailCall.to).toBe('admin@company.com');
            expect(emailCall.from.name).toBe('BMetrics Admin');
            expect(emailCall.html).toContain('Admin/Verification/johna');
        });
    });

    describe('Database Operations Integration', () => {
        it('should send backup notification and results in sequence', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            // Start backup
            const startResult = await emailTemplate.sendDatabaseBackupNotification();
            
            // Simulate backup completion
            const resultsResult = await emailTemplate.sendDatabaseBackupResults(
                'Success',
                'Backup completed\nSize: 45.2 MB\nTime: 3.8 seconds'
            );

            expect(startResult).toBe(true);
            expect(resultsResult).toBe(true);
            expect(mockSend).toHaveBeenCalledTimes(2);

            // Verify both emails went to admin
            const pocEmail = process.env.POC_Email;
            expect(mockSend.mock.calls[0][0].to).toBe(pocEmail);
            expect(mockSend.mock.calls[1][0].to).toBe(pocEmail);

            // Verify subjects
            expect(mockSend.mock.calls[0][0].subject).toContain('Started');
            expect(mockSend.mock.calls[1][0].subject).toContain('Success');
        });
    });

    describe('Email Content Validation', () => {
        it('should properly format HTML in all emails', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            const functions = [
                () => emailTemplate.sendSignupVerification('test@test.com', 'Test', 'User', 'token'),
                () => emailTemplate.sendAccountApprovalNotification('test@test.com', 'Test', 'User', 'testuser'),
                () => emailTemplate.sendEmployeeVerification('test@test.com', 'Test', 'User', 'testuser'),
                () => emailTemplate.sendAdminVerification('test@test.com', 'Test', 'User', 'testuser'),
                () => emailTemplate.sendPasswordRecovery('test@test.com', 'Test', 'User', 'testuser', 'token'),
                () => emailTemplate.sendNewSignupNotificationToAdmin('Test', 'User', 'test@test.com', 'Company'),
            ];

            for (const fn of functions) {
                await fn();
                const emailCall = mockSend.mock.calls[mockSend.mock.calls.length - 1][0];
                
                // Check HTML structure
                expect(emailCall.html).toContain('<h1');
                expect(emailCall.html).toContain('<p');
                expect(emailCall.html).toContain('font-family');
                expect(emailCall.html).toContain('font-size');
            }

            expect(mockSend).toHaveBeenCalledTimes(functions.length);
        });

        it('should include proper sender information in all emails', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            await emailTemplate.sendSignupVerification('test@test.com', 'Test', 'User', 'token');
            await emailTemplate.sendAdminVerification('test@test.com', 'Test', 'User', 'testuser');

            // Regular email from BMetrics
            expect(mockSend.mock.calls[0][0].from).toEqual(
                expect.objectContaining({
                    name: 'BMetrics'
                })
            );

            // Admin email from BMetrics Admin
            expect(mockSend.mock.calls[1][0].from).toEqual(
                expect.objectContaining({
                    name: 'BMetrics Admin'
                })
            );
        });
    });

    describe('Error Recovery Integration', () => {
        it('should handle partial failure in email sequence', async () => {
            // First email succeeds
            mockSend.mockResolvedValueOnce([{ statusCode: 202 }]);
            // Second email fails
            mockSend.mockRejectedValueOnce(new Error('Rate limit exceeded'));

            const result1 = await emailTemplate.sendSignupVerification(
                'user@example.com',
                'Test',
                'User',
                'token'
            );

            const result2 = await emailTemplate.sendNewSignupNotificationToAdmin(
                'Test',
                'User',
                'user@example.com',
                'Company'
            );

            expect(result1).toBe(true);
            expect(result2).toBe(false);
            expect(mockSend).toHaveBeenCalledTimes(2);
        });

        it('should handle SendGrid API errors gracefully', async () => {
            const errors = [
                new Error('Invalid API key'),
                new Error('Network timeout'),
                new Error('Rate limit exceeded'),
                { code: 401, message: 'Unauthorized' }
            ];

            for (const error of errors) {
                mockSend.mockRejectedValueOnce(error);

                const result = await emailTemplate.sendSignupVerification(
                    'test@test.com',
                    'Test',
                    'User',
                    'token'
                );

                expect(result).toBe(false);
            }
        });
    });

    describe('Environment Configuration Integration', () => {
        it('should use correct ClientHost in all email links', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            await emailTemplate.sendAccountApprovalNotification('test@test.com', 'Test', 'User', 'testuser');
            await emailTemplate.sendEmployeeVerification('test@test.com', 'Test', 'User', 'testuser');
            await emailTemplate.sendPasswordRecovery('test@test.com', 'Test', 'User', 'testuser', 'token');

            // Check all emails use the ClientHost from env
            const clientHost = process.env.ClientHost;
            mockSend.mock.calls.forEach(call => {
                expect(call[0].html).toContain(clientHost);
            });
        });

        it('should send admin notifications to correct POC email', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            await emailTemplate.sendNewSignupNotificationToAdmin('Test', 'User', 'test@test.com', 'Company');
            await emailTemplate.sendDatabaseBackupNotification();
            await emailTemplate.sendDatabaseBackupResults('Success', 'logs');

            // All admin emails should go to POC
            const pocEmail = process.env.POC_Email;
            mockSend.mock.calls.forEach(call => {
                expect(call[0].to).toBe(pocEmail);
            });
        });
    });

    describe('Real-world Scenarios', () => {
        it('should handle complete user registration workflow', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            // Step 1: User signs up
            const signupResult = await emailTemplate.sendSignupVerification(
                'realuser@company.com',
                'Real',
                'User',
                'verification-token'
            );

            // Step 2: Admin gets notification
            const adminNotifyResult = await emailTemplate.sendNewSignupNotificationToAdmin(
                'Real',
                'User',
                'realuser@company.com',
                'Real Company LLC'
            );

            // Step 3: Admin approves
            const approvalResult = await emailTemplate.sendAccountApprovalNotification(
                'realuser@company.com',
                'Real',
                'User',
                'realuser'
            );

            expect(signupResult).toBe(true);
            expect(adminNotifyResult).toBe(true);
            expect(approvalResult).toBe(true);
            expect(mockSend).toHaveBeenCalledTimes(3);
        });

        it('should handle employee onboarding by admin', async () => {
            mockSend.mockResolvedValue([{ statusCode: 202 }]);

            // Admin creates employee account
            const result = await emailTemplate.sendEmployeeVerification(
                'newemployee@company.com',
                'New',
                'Employee',
                'NewEmployee123'
            );

            expect(result).toBe(true);
            
            const emailCall = mockSend.mock.calls[0][0];
            expect(emailCall.to).toBe('newemployee@company.com');
            expect(emailCall.html).toContain('newemployee123'); // Lowercase
        });
    });
});
