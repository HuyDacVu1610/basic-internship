const express = require('express');
const authController = require('../controllers/authController');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { loginSchema } = require('../validators/authValidator');

const router = express.Router();

router.post('/login', validationMiddleware(loginSchema), authController.login);

module.exports = router;
