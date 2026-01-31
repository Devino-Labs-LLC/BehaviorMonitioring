require('dotenv').config();
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/AdminController');

// Employee management routes
router.post('/addNewEmployee', adminController.addNewEmployee.bind(adminController));
router.post('/deleteAnEmployee', adminController.deleteAnEmployee.bind(adminController));
router.post('/updateAnEmployeeDetail', adminController.updateAnEmployeeDetail.bind(adminController));
router.post('/updateAnEmployeeAccountStatus', adminController.updateAnEmployeeAccountStatus.bind(adminController));
router.post('/getAllAdmins', adminController.getAllAdmins.bind(adminController));

// Home management routes
router.post('/addNewHome', adminController.addNewHome.bind(adminController));
router.post('/deleteAHome', adminController.deleteAHome.bind(adminController));
router.post('/deleteHome', adminController.deleteAHome.bind(adminController)); // Alias for frontend consistency
router.post('/updateAHome', adminController.updateAHome.bind(adminController));
router.post('/getAllHomes', adminController.getAllHomes.bind(adminController));

// Client management routes
router.post('/createClient', adminController.createClient.bind(adminController));
router.post('/updateClient', adminController.updateClient.bind(adminController));
router.post('/deleteClient', adminController.deleteClient.bind(adminController));

// Client archive routes
router.post('/archiveClient', adminController.archiveClient.bind(adminController));
router.post('/getArchivedClients', adminController.getArchivedClients.bind(adminController));
router.post('/getArchivedClient', adminController.getArchivedClient.bind(adminController));
router.post('/unarchiveClient', adminController.unarchiveClient.bind(adminController));
router.post('/deleteArchivedClient', adminController.deleteArchivedClient.bind(adminController));

module.exports = router;