const express = require('express');
const authRoutes = require('./authRoutes');
const patientRoutes = require('./patientRoutes');
const queueRoutes = require('./queueRoutes');
const visitRoutes = require('./visitRoutes');
const medicineRoutes = require('./medicineRoutes');
const staffRoutes = require('./staffRoutes');
const reportRoutes = require('./reportRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/queue', queueRoutes);
router.use('/visits', visitRoutes);
router.use('/medicines', medicineRoutes);
router.use('/staff', staffRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
