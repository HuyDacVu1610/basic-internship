const express = require('express');
const staffController = require('../controllers/staffController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { createStaffSchema, updateStaffSchema } = require('../validators/staffValidator');

const router = express.Router();

// All staff management routes require authentication and ADMIN role
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', staffController.list);

router.post(
  '/',
  validationMiddleware(createStaffSchema),
  staffController.create
);

router.put(
  '/:id',
  validationMiddleware(updateStaffSchema),
  staffController.update
);

router.patch(
  '/:id/lock',
  staffController.toggleLock
);

module.exports = router;
