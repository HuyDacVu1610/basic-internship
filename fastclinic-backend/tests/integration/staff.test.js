const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../../src/app');
const { sequelize, NhanVien } = require('../../src/models');

describe('Staff CRUD & Locking API (UC-011)', () => {
  let adminToken;
  let receptionistToken;
  let testAdminUser;
  let testStaffUser;

  beforeAll(async () => {
    // Force sync db tables
    await sequelize.sync({ force: true });

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';

    adminToken = jwt.sign(
      { userId: 1, role: 'ADMIN', username: 'admin01' },
      jwtSecret
    );

    receptionistToken = jwt.sign(
      { userId: 2, role: 'LE_TAN', username: 'letan01' },
      jwtSecret
    );

    // Seed admin staff
    testAdminUser = await NhanVien.create({
      ma_nhan_vien: 1,
      ho_ten: 'Quản Trị Viên',
      vai_tro: 'ADMIN',
      ten_dang_nhap: 'admin01',
      mat_khau_hash: await bcrypt.hash('Admin@123', 10),
      is_active: true
    });

    // Seed receptionist staff
    testStaffUser = await NhanVien.create({
      ma_nhan_vien: 2,
      ho_ten: 'Nguyễn Lễ Tân',
      vai_tro: 'LE_TAN',
      ten_dang_nhap: 'letan01',
      mat_khau_hash: await bcrypt.hash('Staff@123', 10),
      is_active: true
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/staff (List Staff)', () => {
    it('should return paginated list of staff members for ADMIN, excluding passwords', async () => {
      const res = await request(app)
        .get('/api/staff?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.staff.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.staff[0]).not.toHaveProperty('mat_khau_hash');
      expect(res.body.data.staff[0]).not.toHaveProperty('matKhau');
    });

    it('should search staff by name or username', async () => {
      const res = await request(app)
        .get(`/api/staff?search=${encodeURIComponent('Nguyễn')}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.staff.length).toBe(1);
      expect(res.body.data.staff[0].ho_ten).toBe('Nguyễn Lễ Tân');
    });

    it('should block non-ADMIN from accessing staff listing', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/staff (Create Staff)', () => {
    it('should successfully create staff for ADMIN with valid data', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          hoTen: 'Bác Sĩ Nam',
          vaiTro: 'BAC_SI',
          tenDangNhap: 'bacsinam',
          matKhau: 'Nam@123',
          isActive: true
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.ten_dang_nhap).toBe('bacsinam');
      expect(res.body.data).not.toHaveProperty('mat_khau_hash');

      // Verify DB entry
      const dbUser = await NhanVien.findOne({ where: { ten_dang_nhap: 'bacsinam' } });
      expect(dbUser).not.toBeNull();
      expect(dbUser.ho_ten).toBe('Bác Sĩ Nam');
      expect(dbUser.vai_tro).toBe('BAC_SI');
      expect(dbUser.is_active).toBe(true);
    });

    it('should reject duplicate usernames with 409', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          hoTen: 'Bác Sĩ Trùng',
          vaiTro: 'BAC_SI',
          tenDangNhap: 'bacsinam', // Already created
          matKhau: 'Nam@123'
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USERNAME_ALREADY_EXISTS');
    });

    it('should validate inputs using Joi schema', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          hoTen: '', // Empty
          vaiTro: 'INVALID_ROLE', // Invalid role
          tenDangNhap: 'user1',
          matKhau: '123' // Too short (min 4)
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should block non-ADMIN from creating staff', async () => {
      await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          hoTen: 'Điều Dưỡng Nữ',
          vaiTro: 'DIEU_DUONG',
          tenDangNhap: 'dieuduongnu',
          matKhau: 'Nu@123'
        })
        .expect(403);
    });
  });

  describe('PUT /api/staff/:id (Update Staff)', () => {
    it('should update staff details successfully', async () => {
      const res = await request(app)
        .put(`/api/staff/${testStaffUser.ma_nhan_vien}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          hoTen: 'Nguyễn Lễ Tân Cập Nhật',
          matKhau: 'NewPass@123'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.ho_ten).toBe('Nguyễn Lễ Tân Cập Nhật');

      // Verify login works with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ tenDangNhap: 'letan01', matKhau: 'NewPass@123' })
        .expect(200);

      expect(loginRes.body.success).toBe(true);
    });

    it('should reject duplicate username on update', async () => {
      const res = await request(app)
        .put(`/api/staff/${testStaffUser.ma_nhan_vien}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tenDangNhap: 'bacsinam' // already taken by other user
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USERNAME_ALREADY_EXISTS');
    });
  });

  describe('PATCH /api/staff/:id/lock (Toggle Lock User)', () => {
    it('should toggle locking status and block authentication', async () => {
      // Create user to lock
      const userToLock = await NhanVien.create({
        ho_ten: 'Nhân Viên Khóa',
        vai_tro: 'NV_CLS',
        ten_dang_nhap: 'nvkhoa',
        mat_khau_hash: await bcrypt.hash('Lock@123', 10),
        is_active: true
      });

      // Verify user can login before locking
      await request(app)
        .post('/api/auth/login')
        .send({ tenDangNhap: 'nvkhoa', matKhau: 'Lock@123' })
        .expect(200);

      // Lock user
      const lockRes = await request(app)
        .patch(`/api/staff/${userToLock.ma_nhan_vien}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(lockRes.body.success).toBe(true);
      expect(lockRes.body.data.is_active).toBe(false);

      // Verify login fails with 403 (ACCOUNT_LOCKED) because user is not active
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ tenDangNhap: 'nvkhoa', matKhau: 'Lock@123' })
        .expect(403);

      expect(loginRes.body.success).toBe(false);
      expect(loginRes.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(loginRes.body.error.message).toContain('Tài khoản đã bị khóa');

      // Unlock user
      const unlockRes = await request(app)
        .patch(`/api/staff/${userToLock.ma_nhan_vien}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(unlockRes.body.data.is_active).toBe(true);

      // Verify login works again
      await request(app)
        .post('/api/auth/login')
        .send({ tenDangNhap: 'nvkhoa', matKhau: 'Lock@123' })
        .expect(200);
    });

    it('should allow admin to unlock a user who is temporarily locked due to failed login attempts', async () => {
      // Create user
      const user = await NhanVien.create({
        ho_ten: 'Khóa Tạm Thời',
        vai_tro: 'DIEU_DUONG',
        ten_dang_nhap: 'temp_locked_user',
        mat_khau_hash: await bcrypt.hash('TempPass@123', 10),
        is_active: true,
        so_lan_dang_nhap_sai: 5,
        khoa_den: new Date(Date.now() + 15 * 60 * 1000) // locked for 15 mins
      });

      // Verify login fails with 403 because they are temporarily locked
      await request(app)
        .post('/api/auth/login')
        .send({ tenDangNhap: 'temp_locked_user', matKhau: 'TempPass@123' })
        .expect(403);

      // Admin unlocks this user
      const unlockRes = await request(app)
        .patch(`/api/staff/${user.ma_nhan_vien}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(unlockRes.body.success).toBe(true);
      expect(unlockRes.body.data.is_active).toBe(true);
      expect(unlockRes.body.data.khoa_den).toBeNull();
      expect(unlockRes.body.data.so_lan_dang_nhap_sai).toBe(0);

      // Verify user can now login successfully
      await request(app)
        .post('/api/auth/login')
        .send({ tenDangNhap: 'temp_locked_user', matKhau: 'TempPass@123' })
        .expect(200);
    });
  });
});
