const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { sequelize, BenhNhan, LuotKham, PhongKham, NhanVien, PhieuKham } = require('../../src/models');

describe('Patient REST API Endpoints', () => {
  let adminToken;
  let receptionistToken;
  let doctorToken;
  let testPatient;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });

    // Generate JWT tokens for testing
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    
    adminToken = jwt.sign(
      { userId: 1, role: 'ADMIN', username: 'admin01' },
      jwtSecret
    );
    
    receptionistToken = jwt.sign(
      { userId: 2, role: 'LE_TAN', username: 'letan01' },
      jwtSecret
    );
    
    doctorToken = jwt.sign(
      { userId: 3, role: 'BAC_SI', username: 'bacsi01' },
      jwtSecret
    );

    // Seed test patient
    testPatient = await BenhNhan.create({
      ho_ten: 'Nguyễn Văn A',
      so_dien_thoai: '0987654321',
      cccd: '123456789012',
      ngay_sinh: '1990-05-15',
      gioi_tinh: 'Nam',
      dia_chi: 'Hà Nội',
      is_active: true
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Authentication and RBAC Guards', () => {
    it('should block requests without authentication token', async () => {
      await request(app)
        .get('/api/patients/search')
        .expect(401);
    });

    it('should block non-receptionist/non-admin roles from creating a patient', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          hoTen: 'Bệnh Nhân Mới',
          soDienThoai: '0123456789'
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow receptionist to create a patient', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          hoTen: 'Bệnh Nhân Mới',
          soDienThoai: '0911222333',
          cccd: '999888777666',
          ngaySinh: '1985-10-20',
          gioiTinh: 'Nu',
          diaChi: 'Hải Phòng'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.ho_ten).toBe('Bệnh Nhân Mới');
      expect(res.body.data.ma_benh_nhan).toBeDefined();
    });
  });

  describe('GET /api/patients/search', () => {
    it('should search patient by phone number', async () => {
      const res = await request(app)
        .get('/api/patients/search?q=0987654321')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].ho_ten).toBe('Nguyễn Văn A');
    });

    it('should search patient by CCCD', async () => {
      const res = await request(app)
        .get('/api/patients/search?q=123456789012')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].ho_ten).toBe('Nguyễn Văn A');
    });

    it('should return empty list if no patient matches', async () => {
      const res = await request(app)
        .get('/api/patients/search?q=nonexistent')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('POST /api/patients', () => {
    it('should validate request body and return 400 if fields are invalid', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          hoTen: '',
          soDienThoai: 'invalid-phone'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent duplicate phone numbers and return 409', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          hoTen: 'Trùng Điện Thoại',
          soDienThoai: '0987654321'
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_PHONE');
    });
  });

  describe('GET /api/patients/:id', () => {
    it('should fetch patient by ID successfully', async () => {
      const res = await request(app)
        .get(`/api/patients/${testPatient.ma_benh_nhan}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.ho_ten).toBe('Nguyễn Văn A');
    });

    it('should return 404 for non-existent patient ID', async () => {
      const res = await request(app)
        .get('/api/patients/999999')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PATIENT_NOT_FOUND');
    });
  });

  describe('PUT /api/patients/:id', () => {
    it('should update patient details successfully', async () => {
      const res = await request(app)
        .put(`/api/patients/${testPatient.ma_benh_nhan}`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          hoTen: 'Nguyễn Văn A Updated',
          diaChi: 'Đà Nẵng'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.ho_ten).toBe('Nguyễn Văn A Updated');
      expect(res.body.data.dia_chi).toBe('Đà Nẵng');
    });
  });

  describe('GET /api/patients/:id/history', () => {
    it('should fetch paginated clinical history', async () => {
      // Create a clinic room and a doctor to support clinical encounter associations
      const room = await PhongKham.create({ ten_phong: 'P. Ngoại 1', chuyen_khoa: 'Ngoại', trang_thai: 'HOAT_DONG' });
      const doctor = await NhanVien.create({ ho_ten: 'BS. Tuấn', vai_tro: 'BAC_SI', ten_dang_nhap: 'bstuan01', mat_khau_hash: 'hash' });

      // Create PhieuKham
      const ticket = await PhieuKham.create({
        so_thu_tu: 1,
        ngay_kham: new Date().toISOString().split('T')[0],
        ma_benh_nhan: testPatient.ma_benh_nhan,
        ma_phong: room.ma_phong,
        ma_nhan_vien_tao: doctor.ma_nhan_vien
      });

      // Add dummy visits
      await LuotKham.create({
        ma_benh_nhan: testPatient.ma_benh_nhan,
        ma_phong: room.ma_phong,
        ma_phieu: ticket.ma_phieu,
        trang_thai: 'HOAN_TAT',
        chan_doan: 'Đau khớp gối',
        ma_bac_si: doctor.ma_nhan_vien
      });

      const res = await request(app)
        .get(`/api/patients/${testPatient.ma_benh_nhan}/history?page=1&limit=5`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('history');
      expect(res.body.data.history.length).toBeGreaterThan(0);
      expect(res.body.data.history[0].chanDoan).toBe('Đau khớp gối');
      expect(res.body.data.history[0].bacSi.hoTen).toBe('BS. Tuấn');
      expect(res.body.data.history[0].phongKham.tenPhong).toBe('P. Ngoại 1');
      expect(res.body.data.page).toBe(1);
    });
  });
});
