const express = require('express');
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { createPatientSchema, updatePatientSchema } = require('../validators/patientValidator');

const router = express.Router();

// Protect all patient routes with authMiddleware
router.use(authMiddleware);

// Search and read endpoints - accessible by all authenticated clinic staff
router.get('/search', patientController.search);
router.get('/:id', patientController.getById);
router.get('/:id/history', patientController.getHistory);

// Write and update endpoints - restricted to Lễ tân (LE_TAN) and Admin roles
router.post(
  '/', 
  roleMiddleware(['LE_TAN', 'ADMIN']), 
  validationMiddleware(createPatientSchema), 
  patientController.create
);

router.put(
  '/:id', 
  roleMiddleware(['LE_TAN', 'ADMIN']), 
  validationMiddleware(updatePatientSchema), 
  patientController.update
);

module.exports = router;
