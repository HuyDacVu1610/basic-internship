const express = require('express');
const queueController = require('../controllers/queueController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { createQueueSchema } = require('../validators/queueValidator');

const router = express.Router();

// Publicly accessible queue display endpoint (no auth needed)
router.get('/display', queueController.display);

// All other queue endpoints require authentication
router.use(authMiddleware);

// Publicly read endpoints inside the staff network
router.get('/', queueController.list);
router.get('/stats', queueController.stats);
router.get('/rooms', queueController.rooms);

// Issue ticket endpoint - restricted to Lễ tân (LE_TAN) and Admin roles
router.post(
  '/', 
  roleMiddleware(['LE_TAN', 'ADMIN']), 
  validationMiddleware(createQueueSchema), 
  queueController.issue
);

// Call patient endpoint - restricted to Bác sĩ (BAC_SI) and Admin roles
router.patch(
  '/:maPhieu/call',
  roleMiddleware(['BAC_SI', 'ADMIN']),
  queueController.call
);

module.exports = router;
