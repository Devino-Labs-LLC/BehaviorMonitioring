require('dotenv').config();
const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

// Authentication routes with rate limiting
router.post('/signup', authLimiter, authController.signUpEmployee.bind(authController));
router.post('/validateEmployeeAccount', authLimiter, authController.validateEmployeeAccount.bind(authController));
router.post('/verifyEmployeeLogin', authLimiter, authController.verifyEmployeeLogin.bind(authController));
router.post('/verifyEmployeeLogout', authController.verifyEmployeeLogout.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.post('/request-password-reset', passwordResetLimiter, authController.requestPasswordReset.bind(authController));
router.post('/reset-password', passwordResetLimiter, authController.resetPassword.bind(authController));

module.exports = router;