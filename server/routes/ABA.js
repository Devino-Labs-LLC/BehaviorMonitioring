require('dotenv').config();
const express = require('express');
const router = express.Router();
const abaController = require('../controllers/ABAController');

// Client management routes
router.post('/addNewClient', abaController.addNewClient.bind(abaController));
router.post('/getClientInfo', abaController.getClientInfo.bind(abaController));
router.post('/updateClientInfo', abaController.updateClientInfo.bind(abaController));
router.post('/deleteClientInfo', abaController.deleteClientInfo.bind(abaController));
router.post('/getAllClientInfo', abaController.getAllClientInfo.bind(abaController));

// Target behavior management routes
router.post('/addNewTargetBehavior', abaController.addNewTargetBehavior.bind(abaController));
router.post('/updateTargetBehavior', abaController.updateTargetBehavior.bind(abaController));
router.post('/deleteTargetBehavior', abaController.deleteTargetBehavior.bind(abaController));
router.post('/getTargetBehavior', abaController.getTargetBehavior.bind(abaController));
router.post('/getClientTargetBehavior', abaController.getClientTargetBehavior.bind(abaController));
router.post('/getAClientTargetBehavior', abaController.getAClientTargetBehavior.bind(abaController));

// Archived behavior routes
router.post('/getArchivedBehavior', abaController.getArchivedBehavior.bind(abaController));
router.post('/getClientArchivedBehavior', abaController.getClientArchivedBehavior.bind(abaController));
router.post('/getAClientArchivedBehavior', abaController.getAClientArchivedBehavior.bind(abaController));
router.post('/getAArchivedBehaviorData', abaController.getAArchivedBehaviorData.bind(abaController));

// Behavior data operations
router.post('/submitTargetBehavior', abaController.submitTargetBehavior.bind(abaController));
router.post('/mergeBehaviors', abaController.mergeBehaviors.bind(abaController));
router.post('/archiveBehavior', abaController.archiveBehavior.bind(abaController));
router.post('/deleteBehavior', abaController.deleteBehavior.bind(abaController));
router.post('/deleteBehaviorData', abaController.deleteBehaviorData.bind(abaController));
router.post('/activateBehavior', abaController.activateBehavior.bind(abaController));
router.post('/deleteArchivedBehavior', abaController.deleteArchivedBehavior.bind(abaController));
router.post('/deleteArchivedBehaviorData', abaController.deleteArchivedBehaviorData.bind(abaController));

// Session notes routes
router.post('/submitSessionNotes', abaController.submitSessionNotes.bind(abaController));
router.post('/getSessionNotes', abaController.getSessionNotes.bind(abaController));
router.post('/getASessionNote', abaController.getASessionNote.bind(abaController));
router.post('/deleteSessionNote', abaController.deleteSessionNote.bind(abaController));

// Archived session notes routes
router.post('/getArchivedSessionNotes', abaController.getArchivedSessionNotes.bind(abaController));
router.post('/getAArchivedSessionNote', abaController.getAArchivedSessionNote.bind(abaController));
router.post('/activateSessionNote', abaController.activateSessionNote.bind(abaController));
router.post('/archiveSessionNote', abaController.archiveSessionNote.bind(abaController));
router.post('/deleteArchivedSessionNote', abaController.deleteArchivedSessionNote.bind(abaController));
router.post('/deleteSessionNote', abaController.deleteSessionNote.bind(abaController));

// Skill acquisition routes
router.post('/getClientSkillAquisition', abaController.getClientSkillAquisition.bind(abaController));
router.post('/submitSkillAquisition', abaController.submitSkillAquisition.bind(abaController));

module.exports = router;