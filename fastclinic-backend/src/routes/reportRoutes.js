const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// All reporting endpoints require authentication and ADMIN role
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/patients', reportController.getPatientsReport);
router.get('/revenue', reportController.getRevenueReport);
router.get('/medicines', reportController.getMedicinesReport);

module.exports = router;
