const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { sequelize, BenhNhan, PhongKham, PhieuKham, LuotKham, NhanVien, SinhHieu, DichVuCLS, KetQuaCLS, DonThuoc, ChiTietDonThuoc, Thuoc, PhieuThu } = require('../../src/models');

describe('Checkout & Payment API (UC-007)', () => {
  let cashierToken;
  let doctorToken;
  let patientToken;
  let testPatient;
  let testRoom;
  let testPhieuKham;
  let testLuotKham;
  let testMedicine1;
  let testMedicine2;
  let testDichVu;

  beforeAll(async () => {
    // Force sync db tables
    await sequelize.sync({ force: true });

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';

    cashierToken = jwt.sign(
      { userId: 5, role: 'THU_NGAN', username: 'thungan01' },
      jwtSecret
    );

    doctorToken = jwt.sign(
      { userId: 3, role: 'BAC_SI', username: 'bacsi01' },
      jwtSecret
    );

    patientToken = jwt.sign(
      { userId: 10, role: 'DIEU_DUONG', username: 'dieuduong01' },
      jwtSecret
    );

    // Seed receptionist staff
    await NhanVien.create({
      ma_nhan_vien: 2,
      ho_ten: 'Lễ Tân Thử Nghiệm',
      vai_tro: 'LE_TAN',
      ten_dang_nhap: 'letan01',
      mat_khau_hash: 'hash'
    });

    // Seed doctor staff
    await NhanVien.create({
      ma_nhan_vien: 3,
      ho_ten: 'Bác Sĩ Thử Nghiệm',
      vai_tro: 'BAC_SI',
      ten_dang_nhap: 'bacsi01',
      mat_khau_hash: 'hash'
    });

    // Seed cashier staff
    await NhanVien.create({
      ma_nhan_vien: 5,
      ho_ten: 'Thu Ngân Thử Nghiệm',
      vai_tro: 'THU_NGAN',
      ten_dang_nhap: 'thungan01',
      mat_khau_hash: 'hash'
    });

    // Seed clinic room
    testRoom = await PhongKham.create({
      ten_phong: 'Phòng Nội 1',
      chuyen_khoa: 'Nội',
      trang_thai: 'HOAT_DONG'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear dynamic tables
    await PhieuThu.destroy({ where: {} });
    await ChiTietDonThuoc.destroy({ where: {} });
    await DonThuoc.destroy({ where: {} });
    await Thuoc.destroy({ where: {} });
    await KetQuaCLS.destroy({ where: {} });
    await DichVuCLS.destroy({ where: {} });
    await SinhHieu.destroy({ where: {} });
    await LuotKham.destroy({ where: {} });
    await PhieuKham.destroy({ where: {} });
    await BenhNhan.destroy({ where: {} });

    // Seed patient
    testPatient = await BenhNhan.create({
      ho_ten: 'Lâm Thanh Hải',
      so_dien_thoai: '0981122334',
      cccd: '123456789012',
      ngay_sinh: '1995-05-10',
      gioi_tinh: 'Nam',
      dia_chi: 'Hà Nội'
    });

    // Helper for Vietnam timezone date string
    const getVietnamDateStr = () => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    };

    // Seed ticket and visit
    testPhieuKham = await PhieuKham.create({
      so_thu_tu: 1,
      ngay_kham: getVietnamDateStr(),
      thoi_gian_lay_so: new Date(),
      trang_thai: 'CHO_THANH_TOAN',
      ma_benh_nhan: testPatient.ma_benh_nhan,
      ma_phong: testRoom.ma_phong,
      ma_nhan_vien_tao: 2
    });

    testLuotKham = await LuotKham.create({
      thoi_gian_kham: new Date(),
      trang_thai: 'CHO_THANH_TOAN',
      trieu_chung: 'Đau đầu, mỏi mắt',
      chan_doan: 'Suy nhược cơ thể',
      ma_phieu: testPhieuKham.ma_phieu,
      ma_phong: testRoom.ma_phong,
      ma_benh_nhan: testPatient.ma_benh_nhan,
      ma_bac_si: 3
    });

    // Seed active CLS service and ordered result
    testDichVu = await DichVuCLS.create({
      ten_dich_vu: 'Điện tâm đồ',
      gia: 120000,
      is_active: true
    });

    await KetQuaCLS.create({
      ma_luot_kham: testLuotKham.ma_luot_kham,
      ma_dich_vu: testDichVu.ma_dich_vu,
      loai_cls: testDichVu.ten_dich_vu,
      noi_dung: 'Bình thường',
      file_dinh_kem: null,
      thoi_gian_nhap: new Date()
    });

    // Seed medicines
    testMedicine1 = await Thuoc.create({
      ten_thuoc: 'Paracetamol 500mg',
      don_vi: 'Viên',
      gia: 2000,
      so_luong_ton: 100,
      is_active: true
    });

    testMedicine2 = await Thuoc.create({
      ten_thuoc: 'Vitamin C 1000mg',
      don_vi: 'Viên',
      gia: 5000,
      so_luong_ton: 20,
      is_active: true
    });
  });

  describe('GET /api/visits/waiting (Cashier queue)', () => {
    it('should return visits with CHO_THANH_TOAN status for THU_NGAN', async () => {
      const res = await request(app)
        .get('/api/visits/waiting?role=THU_NGAN')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].ma_luot_kham.toString()).toBe(testLuotKham.ma_luot_kham.toString());
      expect(res.body.data[0].trang_thai).toBe('CHO_THANH_TOAN');
    });
  });

  describe('POST /api/visits/:maLuotKham/checkout', () => {
    it('should successfully checkout, deduct stock and update statuses to HOAN_TAT', async () => {
      // 1. Create a prescription
      const donThuoc = await DonThuoc.create({
        ma_luot_kham: testLuotKham.ma_luot_kham,
        tong_tien_thuoc: 70000, // 10 * 2000 + 10 * 5000
        ngay_ke: new Date()
      });

      await ChiTietDonThuoc.create({
        ma_don_thuoc: donThuoc.ma_don_thuoc,
        ma_thuoc: testMedicine1.ma_thuoc,
        so_luong: 10,
        don_gia: 2000,
        thanh_tien: 20000
      });

      await ChiTietDonThuoc.create({
        ma_don_thuoc: donThuoc.ma_don_thuoc,
        ma_thuoc: testMedicine2.ma_thuoc,
        so_luong: 10,
        don_gia: 5000,
        thanh_tien: 50000
      });

      // 2. Perform checkout
      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/checkout`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          phuongThucTT: 'CHUYEN_KHOAN',
          tienKham: 150000
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const phieuThu = res.body.data;
      expect(parseFloat(phieuThu.tien_kham)).toBe(150000);
      expect(parseFloat(phieuThu.tong_phi_cls)).toBe(120000);
      expect(parseFloat(phieuThu.tong_tien_thuoc)).toBe(70000);
      expect(parseFloat(phieuThu.tong_tien)).toBe(340000);
      expect(phieuThu.phuong_thuc_tt).toBe('CHUYEN_KHOAN');
      expect(phieuThu.trang_thai).toBe('DA_THANH_TOAN');

      // 3. Verify visit status
      const updatedVisit = await LuotKham.findByPk(testLuotKham.ma_luot_kham);
      expect(updatedVisit.trang_thai).toBe('HOAN_TAT');

      const updatedTicket = await PhieuKham.findByPk(testPhieuKham.ma_phieu);
      expect(updatedTicket.trang_thai).toBe('HOAN_TAT');

      // 4. Verify stocks deducted
      const med1 = await Thuoc.findByPk(testMedicine1.ma_thuoc);
      expect(med1.so_luong_ton).toBe(90);

      const med2 = await Thuoc.findByPk(testMedicine2.ma_thuoc);
      expect(med2.so_luong_ton).toBe(10);
    });

    it('should reject with 400 and rollback transaction if any medicine has insufficient stock', async () => {
      // 1. Create a prescription with quantity exceeding stock of testMedicine2
      const donThuoc = await DonThuoc.create({
        ma_luot_kham: testLuotKham.ma_luot_kham,
        tong_tien_thuoc: 125000, // 25 * 5000
        ngay_ke: new Date()
      });

      await ChiTietDonThuoc.create({
        ma_don_thuoc: donThuoc.ma_don_thuoc,
        ma_thuoc: testMedicine2.ma_thuoc,
        so_luong: 25, // Stock is only 20
        don_gia: 5000,
        thanh_tien: 125000
      });

      // 2. Perform checkout
      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/checkout`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          phuongThucTT: 'TIEN_MAT',
          tienKham: 150000
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

      // 3. Verify transaction rollback: status still CHO_THANH_TOAN
      const visitAfter = await LuotKham.findByPk(testLuotKham.ma_luot_kham);
      expect(visitAfter.trang_thai).toBe('CHO_THANH_TOAN');

      // 4. Verify stocks remain unchanged
      const med2 = await Thuoc.findByPk(testMedicine2.ma_thuoc);
      expect(med2.so_luong_ton).toBe(20);

      // 5. Verify no PhieuThu was created
      const phieuThuCount = await PhieuThu.count({
        where: { ma_luot_kham: testLuotKham.ma_luot_kham }
      });
      expect(phieuThuCount).toBe(0);
    });

    it('should restrict checkout to THU_NGAN and ADMIN role', async () => {
      const res = await request(app)
        .post(`/api/visits/${testLuotKham.ma_luot_kham}/checkout`)
        .set('Authorization', `Bearer ${doctorToken}`) // doctor role
        .send({
          phuongThucTT: 'TIEN_MAT'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
