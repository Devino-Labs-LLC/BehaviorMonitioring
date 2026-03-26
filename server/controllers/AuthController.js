const logAuthEvent = require('../middleware/helpers/authLog');
const { createAccessToken, createRefreshToken, verifyRefreshToken } = require('../auth/tokens');
const { setRefreshCookie, clearRefreshCookie } = require('../auth/cookies');
const { insertRefreshToken, findRefreshToken, revokeRefreshToken, rotateRefreshToken } = require('../auth/refreshTokenStore');
const { getOrCreateDeviceId } = require('../auth/device');
const employeeQueries = require('../middleware/helpers/EmployeeQueries');
const emailTemplate = require('../middleware/email/emailTemplate');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const saltRounds = 10;

class AuthController {
    /**
     * Employee sign up / registration
     */
    async signUpEmployee(req, res) {
        try {
            const { firstName, lastName, username, email, phoneNumber, password, confirmPassword, companyName } = req.body;

            // Validation
            if (!firstName || !lastName || !username || !email || !password || !confirmPassword || !companyName) {
                return res.json({ 
                    statusCode: 400, 
                    signupSuccess: false, 
                    serverMessage: 'All required fields must be filled out' 
                });
            }

            // Check if passwords match
            if (password !== confirmPassword) {
                return res.json({ 
                    statusCode: 400, 
                    signupSuccess: false, 
                    serverMessage: 'Passwords do not match' 
                });
            }

            // Password strength validation (at least 8 characters, one uppercase, one lowercase, one number)
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,100}$/;
            if (!passwordRegex.test(password)) {
                return res.json({ 
                    statusCode: 400, 
                    signupSuccess: false, 
                    serverMessage: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number' 
                });
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            if (!emailRegex.test(email)) {
                return res.json({ 
                    statusCode: 400, 
                    signupSuccess: false, 
                    serverMessage: 'Invalid email format' 
                });
            }

            // Check if username already exists
            if (await employeeQueries.employeeExistByUsername(username.toLowerCase())) {
                return res.json({ 
                    statusCode: 409, 
                    signupSuccess: false, 
                    serverMessage: 'Username already exists' 
                });
            }

            // Check if email already exists
            const Employee = require('../models/Employee');
            const existingEmail = await Employee.findOne({ where: { email: email.toLowerCase() } });
            if (existingEmail) {
                return res.json({ 
                    statusCode: 409, 
                    signupSuccess: false, 
                    serverMessage: 'Email already registered' 
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Generate verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationExpiry = new Date();
            verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hour expiry

            // Get current date and time
            const now = new Date();
            const dateEntered = now.toISOString().split('T')[0];
            const timeEntered = now.toTimeString().split(' ')[0];

            // Check if company exists
            const CompanyData = require('../models/CompanyData');
            let companyRecord = await CompanyData.findOne({ 
                where: { companyName: companyName.trim() } 
            });

            let role = 'employee';
            let accountStatus = 'Pending';
            let companyID = 0;
            let shouldBootstrapAdmin = false;

            // If company doesn't exist, create it and make this user the admin
            if (!companyRecord) {
                companyRecord = await CompanyData.create({
                    companyName: companyName.trim(),
                    companyStreetAddress: 'To be updated',
                    companyCity: 'To be updated',
                    companyState: 'To be updated',
                    companyZipCode: '00000',
                    companyContact: email.toLowerCase(),
                    companyFinanceContact: email.toLowerCase(),
                    entered_by: username.toLowerCase(),
                    date_entered: dateEntered,
                    time_entered: timeEntered
                });

                // First user of a new company becomes admin.
                shouldBootstrapAdmin = true;
                companyID = companyRecord.companyDataID;
            } else {
                companyID = companyRecord.companyDataID;

                // Safety net: if company exists but has no privileged account yet,
                // elevate the first registrant so the tenant can be managed.
                const existingCompanyUsers = await Employee.findAll({
                    where: { companyID },
                    attributes: ['role']
                });

                const hasPrivilegedUser = existingCompanyUsers.some((employee) =>
                    ['admin', 'root'].includes(String(employee.role || '').toLowerCase())
                );

                if (existingCompanyUsers.length === 0 || !hasPrivilegedUser) {
                    shouldBootstrapAdmin = true;
                }
            }

            if (shouldBootstrapAdmin) {
                role = 'admin';
                accountStatus = 'Active';
            }

            // Create new employee
            const newEmployee = await Employee.create({
                fName: firstName,
                lName: lastName,
                username: username.toLowerCase(),
                email: email.toLowerCase(),
                phone_number: phoneNumber || null,
                role: role,
                password: hashedPassword,
                account_status: accountStatus,
                entered_by: 'self-registration',
                companyID: companyID,
                companyName: companyName.trim(),
                date_entered: dateEntered,
                time_entered: timeEntered,
                email_verified: false,
                verification_token: verificationToken,
                verification_token_expires: verificationExpiry,
                signup_date: now
            });

            await logAuthEvent("EMPLOYEE_SIGNUP", { 
                userId: newEmployee.employeeID,
                email: email.toLowerCase(), 
                ip: req.ip, 
                userAgent: req.headers['user-agent'],
                details: role === 'admin' 
                    ? 'New company registered - user assigned as admin'
                    : 'New employee registration pending approval'
            });

            // Send verification email to user
            const emailSent = await emailTemplate.sendSignupVerification(
                email.toLowerCase(),
                firstName,
                lastName,
                verificationToken
            );

            // Notify admin of new signup (only if joining existing company)
            if (role === 'employee') {
                await emailTemplate.sendNewSignupNotificationToAdmin(
                    firstName,
                    lastName,
                    email.toLowerCase(),
                    companyName
                );
            }

            return res.json({ 
                statusCode: 201, 
                signupSuccess: true,
                userId: newEmployee.employeeID,
                message: role === 'admin' 
                    ? 'Registration successful. You have been assigned as company administrator.'
                    : 'Registration successful. Your account is pending admin approval.',
                emailVerificationSent: emailSent,
                isCompanyAdmin: role === 'admin'
            });
        } catch (error) {
            await logAuthEvent("EMPLOYEE_SIGNUP_ERROR", { 
                email: req.body.email?.toLowerCase(), 
                ip: req.ip, 
                userAgent: req.headers['user-agent'], 
                details: error.message 
            });
            return res.json({ 
                statusCode: 500, 
                signupSuccess: false,
                serverMessage: 'A server error occurred', 
                errorMessage: error.message 
            });
        }
    }

    /**
     * Validate and activate employee account
     */
    async validateEmployeeAccount(req, res) {
        try {
            const uName = req.body.username;
            const password = req.body.password;

            if (await employeeQueries.employeeExistByUsername(uName)) {
                const employeeData = await employeeQueries.employeeDataByUsername(uName.toLowerCase());

                if (employeeData.account_status === "In Verification") {
                    bcrypt.hash(password, saltRounds, async function (err, hash) {
                        if (err) {
                            return res.json({ statusCode: 403, accountVerified: false, serverMessage: 'A server error occurred', errorMessage: err.message });
                        }
                        else if (await employeeQueries.employeeSetEmployeeCredentialsByUsername(hash, uName)) {
                            if (await employeeQueries.employeeUpdateEmployeeAccountStatusByUsername("Active", uName)) {
                                return res.json({ statusCode: 200, accountVerified: true });
                            }
                            else {
                                return res.json({ statusCode: 403, accountVerified: false, serverMessage: 'A server error occurred', errorMessage: 'Unable to activate account' });
                            }
                        }
                    });
                }
                return res.json({ statusCode: 401, locatedAccount: false });
            }
        } catch (error) {
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Verify employee login credentials
     */
    async verifyEmployeeLogin(req, res) {
        try {
            const uName = req.body.username;
            const password = req.body.password;

            if (await employeeQueries.employeeExistByUsername(uName.toLowerCase())) {
                const employeePassword = await employeeQueries.employeePasswordByUsername(uName.toLowerCase());

                if (employeePassword?.password && employeePassword.password.length > 0) {
                    const bcryptResult = await new Promise((resolve, reject) => {
                        bcrypt.compare(password, employeePassword.password, (err, result) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(result);
                            }
                        });
                    });

                    if (bcryptResult) {
                        const employeeData = await employeeQueries.employeeDataByUsername(uName.toLowerCase());
                        
                        // Check if email is verified
                        if (!employeeData.email_verified) {
                            // Generate new verification token
                            const verificationToken = crypto.randomBytes(32).toString('hex');
                            const verificationExpiry = new Date();
                            verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hour expiry

                            // Update verification token
                            const Employee = require('../models/Employee');
                            await Employee.update(
                                {
                                    verification_token: verificationToken,
                                    verification_token_expires: verificationExpiry
                                },
                                { where: { employeeID: employeeData.employeeID } }
                            );

                            // Resend verification email
                            await emailTemplate.sendSignupVerification(
                                employeeData.email,
                                employeeData.fName,
                                employeeData.lName,
                                verificationToken
                            );

                            await logAuthEvent("EMPLOYEE_LOGIN_BLOCKED_UNVERIFIED", { 
                                userId: employeeData.employeeID, 
                                email: employeeData.email, 
                                ip: req.ip, 
                                userAgent: req.headers['user-agent'],
                                details: 'Login blocked - email not verified. Verification email resent.' 
                            });

                            return res.json({ 
                                statusCode: 403, 
                                loginStatus: false,
                                emailNotVerified: true,
                                serverMessage: 'Please verify your email address before logging in. A new verification email has been sent to your inbox.' 
                            });
                        }

                        if (employeeData.account_status !== 'Active') {
                            await logAuthEvent("EMPLOYEE_LOGIN_BLOCKED_PENDING_APPROVAL", {
                                userId: employeeData.employeeID,
                                email: employeeData.email,
                                ip: req.ip,
                                userAgent: req.headers['user-agent'],
                                details: `Login blocked - account status is ${employeeData.account_status}`
                            });

                            return res.json({
                                statusCode: 403,
                                loginStatus: false,
                                serverMessage: 'Your account is pending approval. Please contact your company administrator.'
                            });
                        }

                        const accessPayload = {
                            sub: employeeData.employeeID,
                            email: employeeData.email,
                            companyID: employeeData.companyID,
                            roles: [employeeData.role],
                        };
                        const accessToken = createAccessToken(accessPayload);
                        const refreshToken = createRefreshToken(employeeData.employeeID);
                        const deviceId = getOrCreateDeviceId(req, res);

                        await insertRefreshToken({ 
                            userId: employeeData.employeeID, 
                            token: refreshToken, 
                            ttlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7), 
                            userAgent: req.headers['user-agent'], 
                            ipAddress: req.ip, 
                            deviceId, 
                            lastUsedAt: new Date() 
                        });

                        setRefreshCookie(res, refreshToken);
                        await logAuthEvent("EMPLOYEE_LOGIN_SUCCESS", { 
                            userId: employeeData.employeeID, 
                            email: employeeData.email, 
                            ip: req.ip, 
                            userAgent: req.headers['user-agent'] 
                        });
                        
                        return res.json({ 
                            statusCode: 200, 
                            loginStatus: true, 
                            accessToken: accessToken, 
                            user: { 
                                uName: uName.toLowerCase(), 
                                compName: employeeData.companyName, 
                                compID: employeeData.companyID, 
                                isAdmin: ["root", "admin"].includes(String(employeeData.role).toLowerCase()) 
                            } 
                        });
                    }
                    else {
                        await logAuthEvent("EMPLOYEE_LOGIN_FAILED", { 
                            email: uName.toLowerCase(), 
                            ip: req.ip, 
                            userAgent: req.headers['user-agent'], 
                            details: 'Incorrect password' 
                        });
                        return res.json({ statusCode: 401, serverMessage: 'Password is incorrect' });
                    }
                }
                else {
                    await logAuthEvent("EMPLOYEE_LOGIN_FAILED", { 
                        email: uName.toLowerCase(), 
                        ip: req.ip, 
                        userAgent: req.headers['user-agent'], 
                        details: 'User needs to authenticate their account' 
                    });
                    return res.json({ statusCode: 401, serverMessage: 'User needs to authenticate their account' });
                }
            }
            else {
                await logAuthEvent("EMPLOYEE_LOGIN_FAILED", { 
                    email: uName.toLowerCase(), 
                    ip: req.ip, 
                    userAgent: req.headers['user-agent'], 
                    details: 'Unauthorized user' 
                });
                return res.json({ statusCode: 401, serverMessage: 'Unauthorized user' });
            }
        } catch (error) {
            await logAuthEvent("EMPLOYEE_LOGIN_ERROR", { 
                email: req.body.username.toLowerCase(), 
                ip: req.ip, 
                userAgent: req.headers['user-agent'], 
                details: error.message 
            });
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Handle employee logout
     */
    async verifyEmployeeLogout(req, res) {
        try {
            const cookieName = process.env.COOKIE_NAME || "bmRefreshToken";
            const refreshToken = req.cookies?.[cookieName];

            if (refreshToken) {
                await revokeRefreshToken(refreshToken);
            }

            clearRefreshCookie(res);

            await logAuthEvent("EMPLOYEE_LOGOUT", { 
                email: req.body.username?.toLowerCase(), 
                ip: req.ip, 
                userAgent: req.headers['user-agent'] 
            });
            return res.json({ statusCode: 200, loginStatus: false, isAdmin: false });
        } catch (error) {
            await logAuthEvent("EMPLOYEE_LOGOUT_ERROR", { 
                email: req.body.username?.toLowerCase(), 
                ip: req.ip, 
                userAgent: req.headers['user-agent'], 
                details: error.message 
            });
            return res.json({ statusCode: 500, serverMessage: 'A server error occurred', errorMessage: error.message });
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refresh(req, res) {
        const cookieName = process.env.COOKIE_NAME || "bmRefreshToken";
        const refreshToken = req.cookies?.[cookieName];

        if (!refreshToken) {
            return res.status(401).json({ error: "Missing refresh token" });
        }

        try {
            const decoded = verifyRefreshToken(refreshToken);

            const rows = await findRefreshToken(refreshToken);
            if (!rows || rows.length === 0) return res.status(401).json({ error: "Refresh token not recognized" });
            const row = rows[0];

            const isExpired = new Date(row.expires_at).getTime() <= Date.now();
            if (row.revoked || isExpired) {
                clearRefreshCookie(res);
                return res.status(401).json({ error: "Invalid refresh token" });
            }

            const employeeData = await employeeQueries.employeeDataById(decoded.sub);

            if (!employeeData) {
                clearRefreshCookie(res);
                return res.status(401).json({ error: "User not found" });
            }

            const newAccessToken = createAccessToken({
                sub: employeeData.employeeID,
                email: employeeData.email,
                companyID: employeeData.companyID,
                roles: [employeeData.role]
            });

            const newRefreshToken = createRefreshToken(employeeData.employeeID);
            
            // Revoke old token
            await rotateRefreshToken(refreshToken, newRefreshToken);
            
            // Insert new token (catch duplicate error in case of concurrent requests)
            try {
                await insertRefreshToken({
                    userId: employeeData.employeeID,
                    token: newRefreshToken,
                    ttlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
                    userAgent: req.headers['user-agent'],
                    ipAddress: req.ip,
                    deviceId: row.device_id,
                    lastUsedAt: new Date()
                });
            } catch (insertError) {
                if (insertError.name !== 'SequelizeUniqueConstraintError') {
                    throw insertError;
                }
                // Token already exists (concurrent request), continue anyway
            }

            setRefreshCookie(res, newRefreshToken);

            return res.json({ accessToken: newAccessToken });
        } catch (err) {
            clearRefreshCookie(res);
            return res.status(401).json({ error: "Invalid refresh token" });
        }
    }

    /**
     * Request password reset - generates token and sends email
     */
    async requestPasswordReset(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.json({ 
                    statusCode: 400, 
                    success: false, 
                    message: 'Email is required' 
                });
            }

            // Check if user exists
            const employee = await employeeQueries.employeeDataByEmail(email.toLowerCase());
            
            if (!employee) {
                // Don't reveal if email exists for security
                return res.json({ 
                    statusCode: 200, 
                    success: true, 
                    message: 'If an account with that email exists, a password reset link has been sent.' 
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Update employee with reset token
            await employeeQueries.employeeSetPasswordResetToken(
                employee.employeeID,
                resetToken,
                resetTokenExpiry
            );

            // Send password recovery email
            const emailSent = await emailTemplate.sendPasswordRecovery(
                employee.email,
                employee.fName,
                employee.lName,
                employee.username,
                resetToken
            );

            await logAuthEvent("PASSWORD_RESET_REQUESTED", { 
                userId: employee.employeeID,
                email: employee.email, 
                ip: req.ip, 
                userAgent: req.headers['user-agent'],
                details: 'Password reset token generated'
            });

            return res.json({ 
                statusCode: 200, 
                success: true, 
                message: 'If an account with that email exists, a password reset link has been sent.',
                emailSent: emailSent
            });
        } catch (error) {
            await logAuthEvent("PASSWORD_RESET_ERROR", { 
                email: req.body.email?.toLowerCase(), 
                ip: req.ip, 
                userAgent: req.headers['user-agent'], 
                details: error.message 
            });
            return res.json({ 
                statusCode: 500, 
                success: false,
                message: 'A server error occurred', 
                errorMessage: error.message 
            });
        }
    }

    /**
     * Reset password using token
     */
    async resetPassword(req, res) {
        try {
            const { token, newPassword, confirmPassword } = req.body;

            if (!token || !newPassword || !confirmPassword) {
                return res.json({ 
                    statusCode: 400, 
                    success: false, 
                    message: 'All fields are required' 
                });
            }

            if (newPassword !== confirmPassword) {
                return res.json({ 
                    statusCode: 400, 
                    success: false, 
                    message: 'Passwords do not match' 
                });
            }

            // Password strength validation
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,100}$/;
            if (!passwordRegex.test(newPassword)) {
                return res.json({ 
                    statusCode: 400, 
                    success: false, 
                    message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number' 
                });
            }

            // Find employee by reset token
            const employee = await employeeQueries.employeeDataByResetToken(token);

            if (!employee) {
                return res.json({ 
                    statusCode: 400, 
                    success: false, 
                    message: 'Invalid or expired reset token' 
                });
            }

            // Check if token is expired
            if (new Date() > new Date(employee.password_reset_expires)) {
                return res.json({ 
                    statusCode: 400, 
                    success: false, 
                    message: 'Reset token has expired. Please request a new one.' 
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

            // Update password and clear reset token
            await employeeQueries.employeeResetPassword(
                employee.employeeID,
                hashedPassword
            );

            await logAuthEvent("PASSWORD_RESET_SUCCESS", { 
                userId: employee.employeeID,
                email: employee.email, 
                ip: req.ip, 
                userAgent: req.headers['user-agent'],
                details: 'Password successfully reset'
            });

            return res.json({ 
                statusCode: 200, 
                success: true, 
                message: 'Password successfully reset. You can now log in with your new password.' 
            });
        } catch (error) {
            await logAuthEvent("PASSWORD_RESET_ERROR", { 
                ip: req.ip, 
                userAgent: req.headers['user-agent'], 
                details: error.message 
            });
            return res.json({ 
                statusCode: 500, 
                success: false,
                message: 'A server error occurred', 
                errorMessage: error.message 
            });
        }
    }

    async verifyEmail(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.json({ 
                    statusCode: 400, 
                    success: false, 
                    message: 'Verification token is required' 
                });
            }

            const Employee = require('../models/Employee');
            const employee = await Employee.findOne({ 
                where: { verification_token: token } 
            });

            if (!employee) {
                await logAuthEvent("EMAIL_VERIFICATION_FAILED", { 
                    ip: req.ip, 
                    userAgent: req.headers['user-agent'],
                    details: 'Invalid verification token'
                });
                return res.json({ 
                    statusCode: 400, 
                    success: false, 
                    message: 'Invalid verification token' 
                });
            }

            // Check if token has expired
            if (new Date() > new Date(employee.verification_token_expires)) {
                await logAuthEvent("EMAIL_VERIFICATION_EXPIRED", { 
                    userId: employee.employeeID,
                    email: employee.email,
                    ip: req.ip, 
                    userAgent: req.headers['user-agent'],
                    details: 'Verification token expired'
                });
                return res.json({ 
                    statusCode: 400, 
                    success: false, 
                    message: 'Verification token has expired. Please request a new one.' 
                });
            }

            // Check if already verified
            if (employee.email_verified) {
                return res.json({ 
                    statusCode: 200, 
                    success: true, 
                    message: 'Email is already verified. You can now log in.' 
                });
            }

            // Verify the email
            const shouldActivateAccount =
                ['admin', 'root'].includes(String(employee.role || '').toLowerCase()) ||
                String(employee.account_status || '').toLowerCase() === 'in verification';

            const updatePayload = {
                email_verified: true,
                verification_token: null,
                verification_token_expires: null
            };

            if (shouldActivateAccount) {
                updatePayload.account_status = 'Active';
            }

            await Employee.update(updatePayload, {
                where: { employeeID: employee.employeeID }
            });

            await logAuthEvent("EMAIL_VERIFICATION_SUCCESS", { 
                userId: employee.employeeID,
                email: employee.email,
                ip: req.ip, 
                userAgent: req.headers['user-agent'],
                details: 'Email successfully verified'
            });

            return res.json({ 
                statusCode: 200, 
                success: true, 
                message: 'Email successfully verified! You can now log in.' 
            });
        } catch (error) {
            await logAuthEvent("EMAIL_VERIFICATION_ERROR", { 
                ip: req.ip, 
                userAgent: req.headers['user-agent'], 
                details: error.message 
            });
            return res.json({ 
                statusCode: 500, 
                success: false,
                message: 'A server error occurred', 
                errorMessage: error.message 
            });
        }
    }
}

module.exports = new AuthController();
