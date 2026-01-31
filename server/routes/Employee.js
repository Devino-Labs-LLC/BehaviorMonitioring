require('dotenv').config();
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/EmployeeController');

// Employee profile routes
router.post('/getEmployeeData', employeeController.getEmployeeData.bind(employeeController));
router.post('/updateEmployeeData', employeeController.updateEmployeeData.bind(employeeController));

// Behavior data routes
router.post('/addBehaviorData', employeeController.addBehaviorData.bind(employeeController));

module.exports = router;