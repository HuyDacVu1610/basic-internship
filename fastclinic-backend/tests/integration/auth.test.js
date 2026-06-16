const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../src/app');
const { sequelize, NhanVien } = require('../../src/models');

describe('Auth REST API Endpoints', () => {
  let testUser;

  beforeAll(async () => {
    // Sync DB
    await sequelize.sync({ force: true });

    // Create a default test user
    const hashedPassword = await bcrypt.hash('Password@123', 12);
    testUser = await NhanVien.create({
      ho_ten: 'BS. Nguyễn Văn A',
      vai_tro: 'BAC_SI',
      ten_dang_nhap: 'bsnguyenvana',
      mat_khau_hash: hashedPassword
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if credentials are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for incorrect username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ tenDangNhap: 'nonexistent', matKhau: 'Password@123' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ tenDangNhap: 'bsnguyenvana', matKhau: 'wrongpassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 200, return accessToken, and set HTTP-only cookie on success', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ tenDangNhap: 'bsnguyenvana', matKhau: 'Password@123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.ho_ten).toBe('BS. Nguyễn Văn A');
      expect(res.body.data.user.vai_tro).toBe('BAC_SI');

      // Check refresh token cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const hasRefreshToken = cookies.some(cookie => cookie.includes('refreshToken='));
      expect(hasRefreshToken).toBe(true);
    });

    it('should lock the account after 5 consecutive failed login attempts', async () => {
      // Create another user specifically for locking test
      const hashedPassword = await bcrypt.hash('LockMe@123', 12);
      const lockUser = await NhanVien.create({
        ho_ten: 'Lễ Tân Khóa',
        vai_tro: 'LE_TAN',
        ten_dang_nhap: 'letankhoa',
        mat_khau_hash: hashedPassword
      });

      // Trigger 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ tenDangNhap: 'letankhoa', matKhau: 'wrong' })
          .expect(401);
      }

      // The 5th failed attempt should trigger account lockout
      const lockRes = await request(app)
        .post('/api/auth/login')
        .send({ tenDangNhap: 'letankhoa', matKhau: 'wrong' })
        .expect(403);

      expect(lockRes.body.success).toBe(false);
      expect(lockRes.body.error.code).toBe('ACCOUNT_LOCKED');

      // Subsequent attempt even with correct password should still fail with 403 ACCOUNT_LOCKED
      const checkRes = await request(app)
        .post('/api/auth/login')
        .send({ tenDangNhap: 'letankhoa', matKhau: 'LockMe@123' })
        .expect(403);

      expect(checkRes.body.success).toBe(false);
      expect(checkRes.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });
});
