const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { sequelize, BenhNhan, PhongKham, PhieuKham, LuotKham, NhanVien } = require('../../src/models');

describe('Queue REST API Endpoints', () => {
  let receptionistToken;
  let doctorToken;
  let testPatient1;
  let testPatient2;
  let testRoom;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });

    // Generate JWT tokens for testing
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    
    receptionistToken = jwt.sign(
      { userId: 2, role: 'LE_TAN', username: 'letan01' },
      jwtSecret
    );
    
    doctorToken = jwt.sign(
      { userId: 3, role: 'BAC_SI', username: 'bacsi01' },
      jwtSecret
    );

    // Seed test staff to satisfy foreign keys
    await NhanVien.create({
      ma_nhan_vien: 2,
      ho_ten: 'Lễ Tân Thử Nghiệm',
      vai_tro: 'LE_TAN',
      ten_dang_nhap: 'letan01',
      mat_khau_hash: 'hash'
    });

    await NhanVien.create({
      ma_nhan_vien: 3,
      ho_ten: 'Bác Sĩ Thử Nghiệm',
      vai_tro: 'BAC_SI',
      ten_dang_nhap: 'bacsi01',
      mat_khau_hash: 'hash'
    });

    // Seed test patients
    testPatient1 = await BenhNhan.create({
      ho_ten: 'Bệnh Nhân Một',
      so_dien_thoai: '0987654321',
      is_active: true
    });

    testPatient2 = await BenhNhan.create({
      ho_ten: 'Bệnh Nhân Hai',
      so_dien_thoai: '0912345678',
      is_active: true
    });

    // Seed active clinic room
    testRoom = await PhongKham.create({
      ten_phong: 'Phòng Nội Tổng Quát',
      chuyen_khoa: 'Nội',
      trang_thai: 'HOAT_DONG'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/queue', () => {
    it('should block requests without authentication token', async () => {
      await request(app)
        .post('/api/queue')
        .send({
          maBenhNhan: testPatient1.ma_benh_nhan,
          maPhong: testRoom.ma_phong
        })
        .expect(401);
    });

    it('should validate inputs and return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          maBenhNhan: testPatient1.ma_benh_nhan
          // missing maPhong
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should successfully issue a ticket with STT = 1 for the first patient', async () => {
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          maBenhNhan: testPatient1.ma_benh_nhan,
          maPhong: testRoom.ma_phong
        })
        .expect(251);

      expect(res.body.success).toBe(true);
      expect(res.body.data.so_thu_tu).toBe(1);
      expect(res.body.data.trang_thai).toBe('CHO_DO_SINH_HIEU');
      expect(res.body.data.benhNhan.ho_ten).toBe('Bệnh Nhân Một');
      expect(res.body.data.phongKham.ten_phong).toBe('Phòng Nội Tổng Quát');
      
      // Verify both PhieuKham and LuotKham records exist
      const phieu = await PhieuKham.findByPk(res.body.data.ma_phieu);
      expect(phieu).toBeDefined();
      const luot = await LuotKham.findOne({ where: { ma_phieu: phieu.ma_phieu } });
      expect(luot).toBeDefined();
      expect(luot.trang_thai).toBe('CHO_DO');
    });

    it('should block duplicate active ticket for same patient today and return 400', async () => {
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          maBenhNhan: testPatient1.ma_benh_nhan,
          maPhong: testRoom.ma_phong
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_ACTIVE_TICKET');
    });

    it('should increment STT to 2 for a different patient in same room', async () => {
      const res = await request(app)
        .post('/api/queue')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          maBenhNhan: testPatient2.ma_benh_nhan,
          maPhong: testRoom.ma_phong
        })
        .expect(251);

      expect(res.body.success).toBe(true);
      expect(res.body.data.so_thu_tu).toBe(2);
      expect(res.body.data.benhNhan.ho_ten).toBe('Bệnh Nhân Hai');
    });
  });

  describe('GET /api/queue', () => {
    it('should retrieve queue list for today successfully', async () => {
      const res = await request(app)
        .get('/api/queue')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].so_thu_tu).toBe(1);
      expect(res.body.data[1].so_thu_tu).toBe(2);
    });

    it('should filter queue list by room maPhong', async () => {
      const res = await request(app)
        .get(`/api/queue?maPhong=${testRoom.ma_phong}`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('GET /api/queue/stats', () => {
    it('should fetch today queue statistics', async () => {
      const res = await request(app)
        .get('/api/queue/stats')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRegistered).toBe(2);
      expect(res.body.data.waitingVitals).toBe(2);
      expect(res.body.data.waitingDoctor).toBe(0);
    });
  });

  describe('GET /api/queue/rooms', () => {
    it('should fetch active rooms list', async () => {
      const res = await request(app)
        .get('/api/queue/rooms')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].ten_phong).toBe('Phòng Nội Tổng Quát');
    });
  });

  describe('GET /api/queue/display', () => {
    it('should retrieve queue display data without authorization header', async () => {
      const res = await request(app)
        .get('/api/queue/display')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      const roomData = res.body.data.find(r => r.ma_phong === testRoom.ma_phong);
      expect(roomData).toBeDefined();
      expect(roomData.dang_kham).toBeNull(); // No patient currently status DANG_KHAM
      expect(roomData.hang_cho.length).toBe(2);
      expect(roomData.hang_cho[0].so_thu_tu).toBe(1);
      expect(roomData.hang_cho[0].ho_ten).toBe('Bệnh Nhân Một');
    });
  });

  describe('PATCH /api/queue/:maPhieu/call', () => {
    let testPhieu;
    let testLuot;

    beforeEach(async () => {
      const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }) + '-' +
                       new Date().toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) + '-' +
                       new Date().toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

      testPhieu = await PhieuKham.create({
        so_thu_tu: 5,
        ngay_kham: todayStr,
        trang_thai: 'CHO_BAC_SI',
        ma_benh_nhan: testPatient1.ma_benh_nhan,
        ma_phong: testRoom.ma_phong,
        ma_nhan_vien_tao: 2
      });

      testLuot = await LuotKham.create({
        ma_benh_nhan: testPatient1.ma_benh_nhan,
        ma_phong: testRoom.ma_phong,
        ma_phieu: testPhieu.ma_phieu,
        trang_thai: 'CHO_BAC_SI'
      });
    });

    afterEach(async () => {
      if (testLuot) await testLuot.destroy();
      if (testPhieu) await testPhieu.destroy();
    });

    it('should block requests without authentication token', async () => {
      await request(app)
        .patch(`/api/queue/${testPhieu.ma_phieu}/call`)
        .expect(401);
    });

    it('should block role LE_TAN from calling patients and return 403', async () => {
      await request(app)
        .patch(`/api/queue/${testPhieu.ma_phieu}/call`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(403);
    });

    it('should successfully call patient, update status, and set thoi_gian_kham', async () => {
      const res = await request(app)
        .patch(`/api/queue/${testPhieu.ma_phieu}/call`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.trang_thai).toBe('DANG_KHAM');
      expect(Number(res.body.data.ma_luot_kham)).toBe(Number(testLuot.ma_luot_kham));

      // Verify db changes
      const dbPhieu = await PhieuKham.findByPk(testPhieu.ma_phieu);
      expect(dbPhieu.trang_thai).toBe('DANG_KHAM');

      const dbLuot = await LuotKham.findByPk(testLuot.ma_luot_kham);
      expect(dbLuot.trang_thai).toBe('DANG_KHAM');
      expect(dbLuot.thoi_gian_kham).not.toBeNull();
      expect(Number(dbLuot.ma_bac_si)).toBe(3); // Called by doctorToken (userId = 3)
    });

    it('should implement recall: calling again does not overwrite thoi_gian_kham', async () => {
      // First call
      const firstRes = await request(app)
        .patch(`/api/queue/${testPhieu.ma_phieu}/call`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      const firstTimeKham = new Date(firstRes.body.data.thoi_gian_kham || Date.now());

      // Wait 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Recall
      const secondRes = await request(app)
        .patch(`/api/queue/${testPhieu.ma_phieu}/call`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      // Verify DB record thoi_gian_kham has NOT changed
      const dbLuot = await LuotKham.findByPk(testLuot.ma_luot_kham);
      const dbTimeKham = new Date(dbLuot.thoi_gian_kham);
      
      // Compare timestamps
      expect(dbTimeKham.getTime()).toBeLessThanOrEqual(firstTimeKham.getTime() + 100);
    });
  });
});
