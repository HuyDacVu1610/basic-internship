const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { sequelize, BenhNhan, PhongKham, PhieuKham, LuotKham, NhanVien, Thuoc, DonThuoc, ChiTietDonThuoc } = require('../../src/models');

describe('Prescription & Medicine REST API Endpoints', () => {
  let doctorToken;
  let receptionistToken;
  let testPatient;
  let testRoom;
  let testPhieuKham;
  let testLuotKham;
  
  let medParacetamol;
  let medIbuprofen;
  let medAmoxicillin;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });

    // Generate JWT tokens for testing
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    
    doctorToken = jwt.sign(
      { userId: 3, role: 'BAC_SI', username: 'bacsi01' },
      jwtSecret
    );

    receptionistToken = jwt.sign(
      { userId: 2, role: 'LE_TAN', username: 'letan01' },
      jwtSecret
    );

    // Seed test staff
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

    // Seed test patient
    testPatient = await BenhNhan.create({
      ho_ten: 'Nguyễn Văn Đơn',
      so_dien_thoai: '0977666555',
      cccd: '123123123123',
      ngay_sinh: '1985-05-20',
      gioi_tinh: 'Nam',
      dia_chi: 'Hồ Chí Minh'
    });

    // Seed test room
    testRoom = await PhongKham.create({
      ten_phong: 'Phòng Nội 1',
      chuyen_khoa: 'Nội khoa',
      trang_thai: 'HOAT_DONG'
    });

    // Expiry date calculations for drugs
    const dateFar = new Date();
    dateFar.setDate(dateFar.getDate() + 30); // 30 days out -> safe

    const dateExpiring = new Date();
    dateExpiring.setDate(dateExpiring.getDate() + 3); // 3 days out -> expiring (BR-014 < 7 days)

    // Seed test medicines
    medParacetamol = await Thuoc.create({
      ten_thuoc: 'Paracetamol 500mg',
      hoat_chat: 'Paracetamol',
      don_vi: 'Viên',
      gia: 1500,
      so_luong_ton: 100,
      han_dung: dateFar.toISOString().split('T')[0],
      is_active: true
    });

    medIbuprofen = await Thuoc.create({
      ten_thuoc: 'Ibuprofen 400mg',
      hoat_chat: 'Ibuprofen',
      don_vi: 'Viên',
      gia: 3000,
      so_luong_ton: 5,
      han_dung: dateFar.toISOString().split('T')[0],
      is_active: true
    });

    medAmoxicillin = await Thuoc.create({
      ten_thuoc: 'Amoxicillin 500mg',
      hoat_chat: 'Amoxicillin',
      don_vi: 'Viên',
      gia: 2500,
      so_luong_ton: 50,
      han_dung: dateExpiring.toISOString().split('T')[0],
      is_active: true
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean visit tables and recreate fresh active visit for each test case
    await ChiTietDonThuoc.destroy({ where: {} });
    await DonThuoc.destroy({ where: {} });
    await LuotKham.destroy({ where: {} });
    await PhieuKham.destroy({ where: {} });

    testPhieuKham = await PhieuKham.create({
      so_thu_tu: 1,
      ngay_kham: new Date().toISOString().split('T')[0],
      trang_thai: 'DANG_KHAM',
      ma_benh_nhan: testPatient.ma_benh_nhan,
      ma_phong: testRoom.ma_phong,
      ma_nhan_vien_tao: 2
    });

    testLuotKham = await LuotKham.create({
      thoi_gian_kham: new Date(),
      trang_thai: 'DANG_KHAM',
      ma_phieu: testPhieuKham.ma_phieu,
      ma_phong: testRoom.ma_phong,
      ma_benh_nhan: testPatient.ma_benh_nhan,
      ma_bac_si: 3
    });
  });

  describe('GET /api/medicines/search', () => {
    it('should return matching medicines for valid search query (length >= 2)', async () => {
      const res = await request(app)
        .get('/api/medicines/search?q=Para')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].ten_thuoc).toContain('Paracetamol');
    });

    it('should return empty list if search query length is less than 2', async () => {
      const res = await request(app)
        .get('/api/medicines/search?q=P')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should reject requests without authorization token', async () => {
      const res = await request(app)
        .get('/api/medicines/search?q=Para');

      expect(res.statusCode).toBe(401);
    });

    it('should reject unauthorized roles (e.g. LE_TAN is allowed or blocked? Let us verify role permissions. LE_TAN is authorized, but another role like NV_CLS is blocked)', async () => {
      const unauthorizedToken = jwt.sign(
        { userId: 5, role: 'DIEU_DUONG', username: 'nurse01' },
        process.env.JWT_SECRET || 'fallback_secret'
      );
      
      const res = await request(app)
        .get('/api/medicines/search?q=Para')
        .set('Authorization', `Bearer ${unauthorizedToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /api/visits/:maLuotKham/prescription', () => {
    it('UT-09 / IT-09: should successfully create a prescription when medicine stock is sufficient', async () => {
      const payload = {
        ghiChu: 'Uống thuốc đều đặn',
        thuocs: [
          {
            maThuoc: medParacetamol.ma_thuoc,
            soLuong: 10,
            lieuDung: 'Sáng 1, tối 1',
            cachDung: 'Sau ăn'
          }
        ]
      };

      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/prescription`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prescription).toBeDefined();
      expect(parseFloat(res.body.data.prescription.tong_tien_thuoc)).toBe(15000); // 1500 * 10
      expect(res.body.data.prescription.chiTietDonThuocs.length).toBe(1);

      // Verify visit state transition
      const updatedVisit = await LuotKham.findByPk(testLuotKham.ma_luot_kham);
      expect(updatedVisit.trang_thai).toBe('CHO_THANH_TOAN');
      
      const updatedPhieu = await PhieuKham.findByPk(testPhieuKham.ma_phieu);
      expect(updatedPhieu.trang_thai).toBe('CHO_THANH_TOAN');
    });

    it('UT-10 / IT-10: should return 400 with INSUFFICIENT_STOCK code when requested quantity exceeds stock', async () => {
      const payload = {
        ghiChu: 'Gặp lỗi tồn kho',
        thuocs: [
          {
            maThuoc: medIbuprofen.ma_thuoc,
            soLuong: 10, // Available stock is only 5
            lieuDung: 'Sáng 1',
            cachDung: 'Sau ăn'
          }
        ]
      };

      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/prescription`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
      expect(res.body.error.details.length).toBe(1);
      expect(res.body.error.details[0].maThuoc.toString()).toBe(medIbuprofen.ma_thuoc.toString());
    });

    it('UT-11: should create prescription successfully but return warnings when medicine expires within 7 days', async () => {
      const payload = {
        ghiChu: 'Thuốc sắp hết hạn',
        thuocs: [
          {
            maThuoc: medAmoxicillin.ma_thuoc, // Expires in 3 days
            soLuong: 5,
            lieuDung: 'Sáng 1',
            cachDung: 'Sau ăn'
          }
        ]
      };

      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/prescription`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.warnings.length).toBe(1);
      expect(res.body.data.warnings[0]).toContain('sắp hết hạn');
    });

    it('should overwrite existing prescription if doctor prescribes again for the same visit', async () => {
      // First prescription
      await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/prescription`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          ghiChu: 'Đơn thứ nhất',
          thuocs: [{ maThuoc: medParacetamol.ma_thuoc, soLuong: 5 }]
        });

      // Second prescription for the same visit
      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/prescription`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          ghiChu: 'Đơn thứ hai đè đơn một',
          thuocs: [{ maThuoc: medParacetamol.ma_thuoc, soLuong: 8 }]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      
      const countPrescriptions = await DonThuoc.count({
        where: { ma_luot_kham: testLuotKham.ma_luot_kham }
      });
      expect(countPrescriptions).toBe(1); // Old one was destroyed, only new one remains

      const activePrescription = await DonThuoc.findOne({
        where: { ma_luot_kham: testLuotKham.ma_luot_kham },
        include: [{ model: ChiTietDonThuoc, as: 'chiTietDonThuocs' }]
      });
      expect(activePrescription.ghi_chu).toBe('Đơn thứ hai đè đơn một');
      expect(activePrescription.chiTietDonThuocs[0].so_luong).toBe(8);
    });
  });
});
