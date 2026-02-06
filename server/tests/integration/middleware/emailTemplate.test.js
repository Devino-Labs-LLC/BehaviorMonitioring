jest.mock('resend');

// We'll require emailTemplate after setting up mocks in beforeEach
let emailTemplate;

describe('Email Template Integration Tests - Resend with Brevo Fallback', () => {
    let mockResendEmails;

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
        
        // Now import emailTemplate AFTER setting up the mock
        emailTemplate = require('../../../middleware/email/emailTemplate');
    });

    afterEach(() => {
        delete global.fetch;
        jest.resetModules();
    });

    describe('Signup Flow Integration', () => {
        it('should send signup verification and admin notification in sequence using Resend', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-123' }
            });

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
            expect(mockResendEmails.send).toHaveBeenCalledTimes(2);

            // Verify user email
            expect(mockResendEmails.send.mock.calls[0][0]).toMatchObject({
                to: 'newuser@example.com',
                subject: 'BMetrics - Verify Your Account'
            });

            // Verify admin notification
            expect(mockResendEmails.send.mock.calls[1][0]).toMatchObject({
                subject: 'BMetrics - New User Signup Pending Approval'
            });
        });

        it('should fallback to Brevo when Resend fails during signup', async () => {
            // Resend fails, Brevo succeeds
            mockResendEmails.send.mockResolvedValue({
                error: new Error('Resend rate limited'),
                data: null
            });
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ messageId: 'brevo-123' })
            });

            const result = await emailTemplate.sendSignupVerification(
                'newuser@example.com',
                'New',
                'User',
                'token'
            );

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalled();
        });

        it('should send approval notification after admin approves', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-456' }
            });

            const result = await emailTemplate.sendAccountApprovalNotification(
                'newuser@example.com',
                'New',
                'User',
                'newuser'
            );

            expect(result).toBe(true);
            expect(mockResendEmails.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'newuser@example.com',
                    subject: 'BMetrics - Account Approved'
                })
            );

            const emailBody = mockResendEmails.send.mock.calls[0][0].html;
            const clientHost = process.env.ClientHost;
            expect(emailBody).toContain(`${clientHost}/Login`);
        });
    });

    describe('Password Recovery Flow Integration', () => {
        it('should send password recovery email with valid reset link', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-reset' }
            });

            const resetToken = 'reset-token-abc123';
            const result = await emailTemplate.sendPasswordRecovery(
                'user@example.com',
                'Test',
                'User',
                'testuser',
                resetToken
            );

            expect(result).toBe(true);
            
            const emailCall = mockResendEmails.send.mock.calls[0][0];
            const clientHost = process.env.ClientHost;
            expect(emailCall.to).toBe('user@example.com');
            expect(emailCall.html).toContain(`${clientHost}/ResetPassword/${resetToken}`);
            expect(emailCall.html).toContain('24 hours');
        });
    });

    describe('Employee Onboarding Flow Integration', () => {
        it('should send verification email for new employee', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-emp' }
            });

            const result = await emailTemplate.sendEmployeeVerification(
                'employee@company.com',
                'Jane',
                'Employee',
                'JaneE'
            );

            expect(result).toBe(true);

            const emailCall = mockResendEmails.send.mock.calls[0][0];
            expect(emailCall.to).toBe('employee@company.com');
            expect(emailCall.subject).toBe('BMetrics - Activate Your Account');
            expect(emailCall.html).toContain('janee'); // Lowercased
            expect(emailCall.html).toContain('AccountVerification/janee');
        });

        it('should send verification email for new admin', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-admin' }
            });

            const result = await emailTemplate.sendAdminVerification(
                'admin@company.com',
                'John',
                'Admin',
                'JohnA'
            );

            expect(result).toBe(true);

            const emailCall = mockResendEmails.send.mock.calls[0][0];
            expect(emailCall.to).toBe('admin@company.com');
            expect(emailCall.from.name).toBe('BMetrics Admin');
            expect(emailCall.html).toContain('Admin/Verification/johna');
        });
    });

    describe('Database Operations Integration', () => {
        it('should send backup notification and results in sequence', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-backup' }
            });

            // Start backup
            const startResult = await emailTemplate.sendDatabaseBackupNotification();
            
            // Simulate backup completion
            const resultsResult = await emailTemplate.sendDatabaseBackupResults(
                'Success',
                'Backup completed\nSize: 45.2 MB\nTime: 3.8 seconds'
            );

            expect(startResult).toBe(true);
            expect(resultsResult).toBe(true);
            expect(mockResendEmails.send).toHaveBeenCalledTimes(2);

            // Verify both emails went to admin
            const pocEmail = process.env.POC_Email;
            expect(mockResendEmails.send.mock.calls[0][0].to).toBe(pocEmail);
            expect(mockResendEmails.send.mock.calls[1][0].to).toBe(pocEmail);

            // Verify subjects
            expect(mockResendEmails.send.mock.calls[0][0].subject).toContain('Started');
            expect(mockResendEmails.send.mock.calls[1][0].subject).toContain('Success');
        });
    });

    describe('Email Content Validation', () => {
        it('should properly format HTML in all emails', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-123' }
            });

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
                const emailCall = mockResendEmails.send.mock.calls[mockResendEmails.send.mock.calls.length - 1][0];
                
                // Check HTML structure
                expect(emailCall.html).toContain('<h1');
                expect(emailCall.html).toContain('<p');
                expect(emailCall.html).toContain('font-family');
                expect(emailCall.html).toContain('font-size');
            }

            expect(mockResendEmails.send).toHaveBeenCalledTimes(functions.length);
        });

        it('should include proper sender information in all emails', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-123' }
            });

            await emailTemplate.sendSignupVerification('test@test.com', 'Test', 'User', 'token');
            await emailTemplate.sendAdminVerification('test@test.com', 'Test', 'User', 'testuser');

            // Regular email from BMetrics
            expect(mockResendEmails.send.mock.calls[0][0].from).toEqual(
                expect.objectContaining({
                    name: 'BMetrics'
                })
            );

            // Admin email from BMetrics Admin
            expect(mockResendEmails.send.mock.calls[1][0].from).toEqual(
                expect.objectContaining({
                    name: 'BMetrics Admin'
                })
            );
        });
    });

    describe('Error Recovery Integration', () => {
        it('should handle Resend failure and fallback to Brevo in sequence', async () => {
            // First email succeeds with Resend
            mockResendEmails.send.mockResolvedValueOnce({
                error: null,
                data: { id: 'email-123' }
            });
            // Second email fails on Resend, succeeds on Brevo fallback
            mockResendEmails.send.mockResolvedValueOnce({
                error: new Error('Rate limit exceeded'),
                data: null
            });
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ messageId: 'brevo-msg' })
            });

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
            expect(result2).toBe(true);
            expect(global.fetch).toHaveBeenCalled();
        });

        it('should handle both provider failures gracefully', async () => {
            mockResendEmails.send.mockRejectedValue(new Error('Resend timeout'));
            global.fetch.mockRejectedValue(new Error('Brevo timeout'));

            const result = await emailTemplate.sendSignupVerification(
                'test@test.com',
                'Test',
                'User',
                'token'
            );

            expect(result).toBe(false);
        });

        it('should handle various SendGrid-like error scenarios', async () => {
            const errorScenarios = [
                { error: new Error('Invalid API key'), shouldFallback: true },
                { error: new Error('Network timeout'), shouldFallback: true },
                { error: new Error('Rate limit exceeded'), shouldFallback: true },
            ];

            for (const scenario of errorScenarios) {
                jest.clearAllMocks();
                global.fetch = jest.fn();
                
                mockResendEmails.send.mockRejectedValue(scenario.error);
                global.fetch.mockResolvedValue({
                    ok: true,
                    json: async () => ({ messageId: 'brevo-msg' })
                });

                const result = await emailTemplate.sendSignupVerification(
                    'test@test.com',
                    'Test',
                    'User',
                    'token'
                );

                expect(result).toBe(true);
            }
        });
    });

    describe('Environment Configuration Integration', () => {
        it('should use correct ClientHost in all email links', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-123' }
            });

            await emailTemplate.sendAccountApprovalNotification('test@test.com', 'Test', 'User', 'testuser');
            await emailTemplate.sendEmployeeVerification('test@test.com', 'Test', 'User', 'testuser');
            await emailTemplate.sendPasswordRecovery('test@test.com', 'Test', 'User', 'testuser', 'token');

            // Check all emails use the ClientHost from env
            const clientHost = process.env.ClientHost;
            mockResendEmails.send.mock.calls.forEach(call => {
                expect(call[0].html).toContain(clientHost);
            });
        });

        it('should send admin notifications to correct POC email', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-123' }
            });

            await emailTemplate.sendNewSignupNotificationToAdmin('Test', 'User', 'test@test.com', 'Company');
            await emailTemplate.sendDatabaseBackupNotification();
            await emailTemplate.sendDatabaseBackupResults('Success', 'logs');

            // All admin emails should go to POC
            const pocEmail = process.env.POC_Email;
            mockResendEmails.send.mock.calls.forEach(call => {
                expect(call[0].to).toBe(pocEmail);
            });
        });
    });

    describe('Real-world Scenarios', () => {
        it('should handle complete user registration workflow using Resend', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-123' }
            });

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
            expect(mockResendEmails.send).toHaveBeenCalledTimes(3);
        });

        it('should handle employee onboarding by admin', async () => {
            mockResendEmails.send.mockResolvedValue({
                error: null,
                data: { id: 'email-emp' }
            });

            // Admin creates employee account
            const result = await emailTemplate.sendEmployeeVerification(
                'newemployee@company.com',
                'New',
                'Employee',
                'NewEmployee123'
            );

            expect(result).toBe(true);
            
            const emailCall = mockResendEmails.send.mock.calls[0][0];
            expect(emailCall.to).toBe('newemployee@company.com');
            expect(emailCall.html).toContain('newemployee123'); // Lowercase
        });

        it('should handle complete workflow with fallback when Resend fails', async () => {
            // First email: Resend succeeds
            mockResendEmails.send.mockResolvedValueOnce({
                error: null,
                data: { id: 'email-1' }
            });
            // Second email: Resend fails, Brevo succeeds
            mockResendEmails.send.mockResolvedValueOnce({
                error: new Error('Service unavailable'),
                data: null
            });
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ messageId: 'brevo-1' })
            });
            // Third email: Resend succeeds
            mockResendEmails.send.mockResolvedValueOnce({
                error: null,
                data: { id: 'email-3' }
            });

            const result1 = await emailTemplate.sendSignupVerification('user@test.com', 'Test', 'User', 'token');
            const result2 = await emailTemplate.sendNewSignupNotificationToAdmin('Test', 'User', 'user@test.com', 'Company');
            const result3 = await emailTemplate.sendAccountApprovalNotification('user@test.com', 'Test', 'User', 'testuser');

            expect(result1).toBe(true);
            expect(result2).toBe(true);
            expect(result3).toBe(true);
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });
});
