const express = require('express');
const visitController = require('../controllers/visitController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { vitalSignsSchema, examineSchema, checkoutSchema } = require('../validators/visitValidator');
const { prescriptionSchema } = require('../validators/prescriptionValidator');
const upload = require('../config/multer');

const router = express.Router();

// All visit routes require authentication
router.use(authMiddleware);

// Get waiting visits - restricted to DIEU_DUONG, BAC_SI, NV_CLS, THU_NGAN, and ADMIN
router.get(
  '/waiting',
  roleMiddleware(['DIEU_DUONG', 'BAC_SI', 'NV_CLS', 'THU_NGAN', 'ADMIN']),
  visitController.waiting
);

// Get list of active CLS services - restricted to BAC_SI, NV_CLS, and ADMIN
router.get(
  '/dich-vu-cls/list',
  roleMiddleware(['BAC_SI', 'NV_CLS', 'ADMIN']),
  visitController.getServices
);

// Get list of payments created today - restricted to THU_NGAN and ADMIN
router.get(
  '/payments/today',
  roleMiddleware(['THU_NGAN', 'ADMIN']),
  visitController.getTodayPayments
);

// Record vital signs - restricted to DIEU_DUONG and ADMIN
router.post(
  '/:maLuotKham/vital-signs',
  roleMiddleware(['DIEU_DUONG', 'ADMIN']),
  validationMiddleware(vitalSignsSchema),
  visitController.saveVitals
);

// Get visit details - restricted to BAC_SI, DIEU_DUONG, NV_CLS, THU_NGAN, and ADMIN
router.get(
  '/:maLuotKham',
  roleMiddleware(['BAC_SI', 'DIEU_DUONG', 'NV_CLS', 'THU_NGAN', 'ADMIN']),
  visitController.detail
);

// Save examination progress (Symptoms, Diagnosis, Notes) - restricted to BAC_SI and ADMIN
router.put(
  '/:maLuotKham/examine',
  roleMiddleware(['BAC_SI', 'ADMIN']),
  validationMiddleware(examineSchema),
  visitController.examine
);

// Create lab orders (request diagnostic tests) - restricted to BAC_SI and ADMIN
router.post(
  '/:maLuotKham/lab-orders',
  roleMiddleware(['BAC_SI', 'ADMIN']),
  visitController.createLabOrders
);

// Enter lab test result - restricted to NV_CLS and ADMIN
router.put(
  '/lab-results/:maKetQua',
  roleMiddleware(['NV_CLS', 'ADMIN']),
  upload.single('file'),
  visitController.updateLabResult
);

// Create electronic prescription - restricted to BAC_SI and ADMIN
router.post(
  '/:maLuotKham/prescription',
  roleMiddleware(['BAC_SI', 'ADMIN']),
  validationMiddleware(prescriptionSchema),
  visitController.createPrescription
);

// Confirm payment and finalize visit - restricted to THU_NGAN and ADMIN
router.post(
  '/:maLuotKham/checkout',
  roleMiddleware(['THU_NGAN', 'ADMIN']),
  validationMiddleware(checkoutSchema),
  visitController.checkout
);

module.exports = router;
