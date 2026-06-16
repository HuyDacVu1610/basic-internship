const express = require('express');
const medicineController = require('../controllers/medicineController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { createMedicineSchema, updateMedicineSchema } = require('../validators/medicineValidator');

const router = express.Router();

// All medicine routes require authentication
router.use(authMiddleware);

// Search suggestions - restricted to BAC_SI, THU_NGAN, and ADMIN
router.get(
  '/search',
  roleMiddleware(['BAC_SI', 'THU_NGAN', 'ADMIN']),
  medicineController.search
);

// Admin-only management endpoints
router.get(
  '/alerts',
  roleMiddleware(['ADMIN']),
  medicineController.getAlerts
);

router.get(
  '/',
  roleMiddleware(['ADMIN']),
  medicineController.list
);

router.post(
  '/',
  roleMiddleware(['ADMIN']),
  validationMiddleware(createMedicineSchema),
  medicineController.create
);

router.put(
  '/:id',
  roleMiddleware(['ADMIN']),
  validationMiddleware(updateMedicineSchema),
  medicineController.update
);

router.delete(
  '/:id',
  roleMiddleware(['ADMIN']),
  medicineController.delete
);

module.exports = router;
