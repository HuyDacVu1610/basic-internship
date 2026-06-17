const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { sequelize, BenhNhan, PhongKham, PhieuKham, LuotKham, NhanVien, SinhHieu, DichVuCLS, KetQuaCLS } = require('../../src/models');

describe('Visit REST API Endpoints (Vital Signs)', () => {
  let nurseToken;
  let doctorToken;
  let receptionistToken;
  let clsToken;
  let testPatient;
  let testRoom;
  let testPhieuKham;
  let testLuotKham;
  let testDichVu;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });

    // Generate JWT tokens for testing
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    
    nurseToken = jwt.sign(
      { userId: 4, role: 'DIEU_DUONG', username: 'dieuduong01' },
      jwtSecret
    );
    
    doctorToken = jwt.sign(
      { userId: 3, role: 'BAC_SI', username: 'bacsi01' },
      jwtSecret
    );

    receptionistToken = jwt.sign(
      { userId: 2, role: 'LE_TAN', username: 'letan01' },
      jwtSecret
    );

    clsToken = jwt.sign(
      { userId: 6, role: 'NV_CLS', username: 'cls01' },
      jwtSecret
    );

    // Seed test staff to satisfy foreign keys
    await NhanVien.create({
      ma_nhan_vien: 4,
      ho_ten: 'Điều Dưỡng Thử Nghiệm',
      vai_tro: 'DIEU_DUONG',
      ten_dang_nhap: 'dieuduong01',
      mat_khau_hash: 'hash'
    });

    await NhanVien.create({
      ma_nhan_vien: 3,
      ho_ten: 'Bác Sĩ Thử Nghiệm',
      vai_tro: 'BAC_SI',
      ten_dang_nhap: 'bacsi01',
      mat_khau_hash: 'hash'
    });

    await NhanVien.create({
      ma_nhan_vien: 2,
      ho_ten: 'Lễ Tân Thử Nghiệm',
      vai_tro: 'LE_TAN',
      ten_dang_nhap: 'letan01',
      mat_khau_hash: 'hash'
    });

    await NhanVien.create({
      ma_nhan_vien: 6,
      ho_ten: 'Kỹ Thuật Viên Thử Nghiệm',
      vai_tro: 'NV_CLS',
      ten_dang_nhap: 'cls01',
      mat_khau_hash: 'hash'
    });

    // Seed active clinic room
    testRoom = await PhongKham.create({
      ten_phong: 'Phòng Nhi',
      chuyen_khoa: 'Nhi',
      trang_thai: 'HOAT_DONG'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear and reset tables before each test to guarantee fresh state
    await KetQuaCLS.destroy({ where: {} });
    await DichVuCLS.destroy({ where: {} });
    await SinhHieu.destroy({ where: {} });
    await LuotKham.destroy({ where: {} });
    await PhieuKham.destroy({ where: {} });
    await BenhNhan.destroy({ where: {} });

    testDichVu = await DichVuCLS.create({
      ten_dich_vu: 'Xét nghiệm máu',
      gia: 100000,
      is_active: true
    });

    // Seed test patient
    testPatient = await BenhNhan.create({
      ho_ten: 'Bệnh Nhân Nhi',
      so_dien_thoai: '0123456789',
      ngay_sinh: '2020-01-01',
      dia_chi: 'Hà Nội',
      is_active: true
    });

    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }) + '-' +
                     new Date().toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) + '-' +
                     new Date().toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

    // Create a ticket and active visit waiting for vitals
    testPhieuKham = await PhieuKham.create({
      so_thu_tu: 1,
      ngay_kham: todayStr,
      trang_thai: 'CHO_DO_SINH_HIEU',
      ma_benh_nhan: testPatient.ma_benh_nhan,
      ma_phong: testRoom.ma_phong,
      ma_nhan_vien_tao: 2
    });

    testLuotKham = await LuotKham.create({
      ma_benh_nhan: testPatient.ma_benh_nhan,
      ma_phong: testRoom.ma_phong,
      ma_phieu: testPhieuKham.ma_phieu,
      trang_thai: 'CHO_DO'
    });
  });

  describe('GET /api/visits/waiting', () => {
    it('should block requests without authentication token', async () => {
      await request(app)
        .get('/api/visits/waiting?role=DIEU_DUONG')
        .expect(401);
    });

    it('should block role LE_TAN from viewing waiting list and return 403', async () => {
      await request(app)
        .get('/api/visits/waiting?role=DIEU_DUONG')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(403);
    });

    it('should return waiting list for DIEU_DUONG', async () => {
      const res = await request(app)
        .get('/api/visits/waiting?role=DIEU_DUONG')
        .set('Authorization', `Bearer ${nurseToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(Number(res.body.data[0].ma_luot_kham)).toBe(Number(testLuotKham.ma_luot_kham));
      expect(res.body.data[0].benhNhan.ho_ten).toBe('Bệnh Nhân Nhi');
      expect(res.body.data[0].phongKham.ten_phong).toBe('Phòng Nhi');
      expect(res.body.data[0].phieuKham.so_thu_tu).toBe(1);
    });

    it('should return empty waiting list for BAC_SI since there are no patients waiting for BAC_SI yet', async () => {
      const res = await request(app)
        .get('/api/visits/waiting?role=BAC_SI')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('POST /api/visits/:maLuotKham/vital-signs', () => {
    it('should block requests without authentication token', async () => {
      await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/vital-signs`)
        .send({
          huyetAp: '120/80',
          nhipTim: 80,
          nhietDo: 36.5,
          chieuCao: 165.0,
          canNang: 55.0
        })
        .expect(401);
    });

    it('should block BAC_SI from recording vitals and return 403', async () => {
      await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/vital-signs`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          huyetAp: '120/80',
          nhipTim: 80,
          nhietDo: 36.5,
          chieuCao: 165.0,
          canNang: 55.0
        })
        .expect(403);
    });

    it('should validate vital signs formats and return 400', async () => {
      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/vital-signs`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          huyetAp: '120-80', // invalid format (slash expected)
          nhipTim: 250, // invalid heart rate (too high)
          nhietDo: 28.0, // invalid temperature (too low)
          chieuCao: 165.0,
          canNang: 55.0
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject requests with missing/blank vital signs fields and return 400', async () => {
      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/vital-signs`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          huyetAp: '',
          nhipTim: null,
          nhietDo: 36.5,
          chieuCao: 165.0,
          canNang: null
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should successfully record vital signs and transition states to CHO_BAC_SI', async () => {
      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/vital-signs`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          huyetAp: '120/80',
          nhipTim: 80,
          nhietDo: 36.5,
          chieuCao: 165.5,
          canNang: 55.2
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.huyet_ap).toBe('120/80');
      expect(Number(res.body.data.ma_dieu_duong)).toBe(4);

      // Verify records are updated in DB
      const dbLuot = await LuotKham.findByPk(testLuotKham.ma_luot_kham);
      expect(dbLuot.trang_thai).toBe('CHO_BAC_SI');

      const dbPhieu = await PhieuKham.findByPk(testPhieuKham.ma_phieu);
      expect(dbPhieu.trang_thai).toBe('CHO_BAC_SI');

      const dbVitals = await SinhHieu.findOne({ where: { ma_luot_kham: testLuotKham.ma_luot_kham } });
      expect(dbVitals).toBeDefined();
      expect(dbVitals.huyet_ap).toBe('120/80');
    });

    it('should block recording vitals for a visit already in CHO_BAC_SI state', async () => {
      // First save
      await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/vital-signs`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          huyetAp: '120/80',
          nhipTim: 80,
          nhietDo: 36.5,
          chieuCao: 165.5,
          canNang: 55.2
        })
        .expect(200);

      // Second save (should block because state changed to CHO_BAC_SI)
      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/vital-signs`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          huyetAp: '120/80',
          nhipTim: 80,
          nhietDo: 36.5,
          chieuCao: 165.5,
          canNang: 55.2
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_VISIT_STATUS');
    });
  });

  describe('GET /api/visits/:maLuotKham', () => {
    it('should block requests without authentication token', async () => {
      await request(app)
        .get(`/api/visits/${testLuotKham.ma_luot_kham}`)
        .expect(401);
    });

    it('should retrieve visit details including patient info and history', async () => {
      const res = await request(app)
        .get(`/api/visits/${testLuotKham.ma_luot_kham}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.visit.ma_luot_kham)).toBe(Number(testLuotKham.ma_luot_kham));
      expect(res.body.data.visit.benhNhan.ho_ten).toBe('Bệnh Nhân Nhi');
      expect(res.body.data.history).toBeDefined();
      expect(res.body.data.history.length).toBe(0); // No history yet
    });
  });

  describe('PUT /api/visits/:maLuotKham/examine', () => {
    it('should block requests without authentication token', async () => {
      await request(app)
        .put(`/api/visits/${testLuotKham.ma_luot_kham}/examine`)
        .send({
          trieuChung: 'Sốt nhẹ',
          chanDoan: 'Cảm cúm',
          ghiChu: 'Nghỉ ngơi'
        })
        .expect(401);
    });

    it('should successfully save examination progress', async () => {
      const res = await request(app)
        .put(`/api/visits/${testLuotKham.ma_luot_kham}/examine`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          trieuChung: 'Sốt nhẹ, ho khản tiếng',
          chanDoan: 'Viêm họng cấp',
          ghiChu: 'Uống nhiều nước ấm'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.trieu_chung).toBe('Sốt nhẹ, ho khản tiếng');
      expect(res.body.data.chan_doan).toBe('Viêm họng cấp');
      expect(res.body.data.trang_thai).toBe('CHO_DO'); // Should remain CHO_DO unless status parameter is passed
    });

    it('should update state to CHO_CLS if status is explicitly specified', async () => {
      const res = await request(app)
        .put(`/api/visits/${testLuotKham.ma_luot_kham}/examine`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          trieuChung: 'Đau bụng âm ỉ',
          chanDoan: 'Nghi viêm ruột thừa',
          ghiChu: 'Theo dõi sát',
          trangThai: 'CHO_CLS'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.trang_thai).toBe('CHO_CLS');

      // Verify db state updated
      const dbLuot = await LuotKham.findByPk(testLuotKham.ma_luot_kham);
      expect(dbLuot.trang_thai).toBe('CHO_CLS');
    });
  });

  describe('GET /api/visits/dich-vu-cls/list', () => {
    it('should successfully retrieve active CLS services list', async () => {
      const res = await request(app)
        .get('/api/visits/dich-vu-cls/list')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].ten_dich_vu).toBe('Xét nghiệm máu');
    });
  });

  describe('POST /api/visits/:maLuotKham/lab-orders', () => {
    it('should successfully place a lab order and update visit status to CHO_CLS', async () => {
      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/lab-orders`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          maDichVus: [testDichVu.ma_dich_vu]
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].loai_cls).toBe('Xét nghiệm máu');

      const dbLuot = await LuotKham.findByPk(testLuotKham.ma_luot_kham);
      expect(dbLuot.trang_thai).toBe('CHO_CLS');
    });
  });

  describe('PUT /api/visits/lab-results/:maKetQua', () => {
    let testOrder;

    beforeEach(async () => {
      // Setup a pending lab order for the test
      testOrder = await KetQuaCLS.create({
        ma_luot_kham: testLuotKham.ma_luot_kham,
        ma_dich_vu: testDichVu.ma_dich_vu,
        loai_cls: testDichVu.ten_dich_vu,
        noi_dung: null,
        file_dinh_kem: null,
        thoi_gian_nhap: new Date()
      });
      // Set visit status to CHO_CLS
      await testLuotKham.update({ trang_thai: 'CHO_CLS' });
    });

    it('should successfully enter results and transition visit back to CHO_BAC_SI if all results are done', async () => {
      const res = await request(app)
        .put(`/api/visits/lab-results/${testOrder.ma_ket_qua}`)
        .set('Authorization', `Bearer ${clsToken}`)
        .field('noiDung', 'Chỉ số bình thường')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.noi_dung).toBe('Chỉ số bình thường');

      const dbLuot = await LuotKham.findByPk(testLuotKham.ma_luot_kham);
      expect(dbLuot.trang_thai).toBe('CHO_BAC_SI'); // Transition back to doctor since all completed
    });

    it('should fail if result description (noiDung) is empty', async () => {
      await request(app)
        .put(`/api/visits/lab-results/${testOrder.ma_ket_qua}`)
        .set('Authorization', `Bearer ${clsToken}`)
        .field('noiDung', '')
        .expect(400);
    });
  });
});
