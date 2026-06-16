const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const helmet = require('helmet');
const cors = require('cors');

const { sequelize, NhanVien } = require('../../src/models');

// Import middlewares to test
const authMiddleware = require('../../src/middlewares/authMiddleware');
const roleMiddleware = require('../../src/middlewares/roleMiddleware');
const validationMiddleware = require('../../src/middlewares/validationMiddleware');
const errorHandler = require('../../src/middlewares/errorMiddleware');
const { successResponse } = require('../../src/utils/response');

const JWT_SECRET = 'test_secret';
process.env.JWT_SECRET = JWT_SECRET;

describe('Middleware Stack & Helpers', () => {
  let app;

  beforeAll(async () => {
    // Sync DB and seed dummy users for authMiddleware queries
    await sequelize.sync({ force: true });

    await NhanVien.create({
      ma_nhan_vien: 1,
      ho_ten: 'BS. Nguyễn Văn A',
      vai_tro: 'BAC_SI',
      ten_dang_nhap: 'bsnguyenvana',
      mat_khau_hash: 'dummy_hash',
      is_active: true
    });

    await NhanVien.create({
      ma_nhan_vien: 2,
      ho_ten: 'Lễ Tân Hoàng',
      vai_tro: 'LE_TAN',
      ten_dang_nhap: 'letanhoang',
      mat_khau_hash: 'dummy_hash',
      is_active: true
    });

    app = express();
    app.use(helmet());
    app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
    app.use(express.json());

    // Test routes
    // 1. Protected route (Auth)
    app.get('/api/test-auth', authMiddleware, (req, res) => {
      res.status(200).json(successResponse(req.user));
    });

    // 2. Protected route (Role-based: BAC_SI only)
    app.get('/api/test-role', authMiddleware, roleMiddleware(['BAC_SI']), (req, res) => {
      res.status(200).json(successResponse({ authorized: true }));
    });

    // 3. Validation route
    const testSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(18).required()
    });
    app.post('/api/test-validation', validationMiddleware(testSchema), (req, res) => {
      res.status(200).json(successResponse(req.body));
    });

    // 4. Error trigger route
    app.get('/api/test-error', (req, res, next) => {
      const err = new Error('Custom Business Error');
      err.statusCode = 400;
      err.code = 'BUSINESS_ERROR';
      next(err);
    });

    // 5. Internal Server Error trigger route
    app.get('/api/test-500', (req, res, next) => {
      next(new Error('DB Connection Failed'));
    });

    // Apply error middleware at the end
    app.use(errorHandler);
  });

  afterAll(async () => {
    await sequelize.close();
  });


  describe('Helmet & CORS Headers', () => {
    it('should set Helmet security headers', async () => {
      const res = await request(app).get('/api/test-error');
      expect(res.headers).toHaveProperty('x-dns-prefetch-control');
      expect(res.headers).toHaveProperty('x-frame-options');
    });

    it('should set CORS headers when origin is matched', async () => {
      const res = await request(app)
        .get('/api/test-error')
        .set('Origin', 'http://localhost:3000');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('authMiddleware', () => {
    it('should return 401 if Authorization header is missing', async () => {
      const res = await request(app).get('/api/test-auth').expect(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 if token is malformed', async () => {
      const res = await request(app)
        .get('/api/test-auth')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 and decode token if valid token is provided', async () => {
      const payload = { userId: 1, role: 'BAC_SI', username: 'bs_a' };
      const token = jwt.sign(payload, JWT_SECRET);

      const res = await request(app)
        .get('/api/test-auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(1);
      expect(res.body.data.role).toBe('BAC_SI');
    });

    it('should return 401 if the user is inactive/locked in database', async () => {
      // Set user with ID 2 to inactive
      const user = await NhanVien.findByPk(2);
      user.is_active = false;
      await user.save();

      const payload = { userId: 2, role: 'LE_TAN', username: 'letanhoang' };
      const token = jwt.sign(payload, JWT_SECRET);

      const res = await request(app)
        .get('/api/test-auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Tài khoản đã bị khóa');

      // Re-activate user 2 for subsequent tests
      user.is_active = true;
      await user.save();
    });
  });

  describe('roleMiddleware', () => {
    it('should return 403 if user role is not allowed', async () => {
      const payload = { userId: 2, role: 'LE_TAN', username: 'lt_hoang' };
      const token = jwt.sign(payload, JWT_SECRET);

      const res = await request(app)
        .get('/api/test-role')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 200 if user role is allowed', async () => {
      const payload = { userId: 1, role: 'BAC_SI', username: 'bs_a' };
      const token = jwt.sign(payload, JWT_SECRET);

      const res = await request(app)
        .get('/api/test-role')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.authorized).toBe(true);
    });
  });

  describe('validationMiddleware', () => {
    it('should return 400 and validation error details if validation fails', async () => {
      const res = await request(app)
        .post('/api/test-validation')
        .send({ name: 'Hoang', age: 15 }) // age < 18
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeDefined();
    });

    it('should return 200 if validation passes', async () => {
      const res = await request(app)
        .post('/api/test-validation')
        .send({ name: 'Hoang', age: 25 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Hoang');
    });
  });

  describe('errorMiddleware (errorHandler)', () => {
    it('should return standardized JSON error formatting for business errors', async () => {
      const res = await request(app).get('/api/test-error').expect(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BUSINESS_ERROR');
      expect(res.body.error.message).toBe('Custom Business Error');
    });

    it('should return 500 and not expose stack trace for unhandled internal errors', async () => {
      const res = await request(app).get('/api/test-500').expect(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(res.body.error.message).toBe('Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.');
      expect(res.body.error.stack).toBeUndefined();
    });
  });
});
