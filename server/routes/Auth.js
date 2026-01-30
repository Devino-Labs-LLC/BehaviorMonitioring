require('dotenv').config();
const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');

// Authentication routes
router.post('/signup', authController.signUpEmployee.bind(authController));
router.post('/validateEmployeeAccount', authController.validateEmployeeAccount.bind(authController));
router.post('/verifyEmployeeLogin', authController.verifyEmployeeLogin.bind(authController));
router.post('/verifyEmployeeLogout', authController.verifyEmployeeLogout.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.post('/request-password-reset', authController.requestPasswordReset.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));

module.exports = router;