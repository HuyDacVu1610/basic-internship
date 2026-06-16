const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { 
  sequelize, 
  NhanVien, 
  BenhNhan, 
  PhieuKham, 
  LuotKham, 
  PhieuThu, 
  Thuoc, 
  DonThuoc, 
  ChiTietDonThuoc,
  PhongKham
} = require('../../src/models');

describe('Reports & Statistics API (UC-012)', () => {
  let adminToken;
  let doctorToken;

  beforeAll(async () => {
    // Force sync db tables
    await sequelize.sync({ force: true });

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';

    adminToken = jwt.sign(
      { userId: 1, role: 'ADMIN', username: 'admin01' },
      jwtSecret
    );

    doctorToken = jwt.sign(
      { userId: 2, role: 'BAC_SI', username: 'bacsi01' },
      jwtSecret
    );

    // Create staff members
    await NhanVien.create({
      ma_nhan_vien: 1,
      ho_ten: 'Quản Trị Viên',
      vai_tro: 'ADMIN',
      ten_dang_nhap: 'admin01',
      mat_khau_hash: 'hash'
    });

    await NhanVien.create({
      ma_nhan_vien: 2,
      ho_ten: 'Bác Sĩ',
      vai_tro: 'BAC_SI',
      ten_dang_nhap: 'bacsi01',
      mat_khau_hash: 'hash'
    });

    // Create clinic room
    await PhongKham.create({
      ma_phong: 1,
      ten_phong: 'Phòng Nội 1',
      chuyen_khoa: 'Nội',
      trang_thai: 'HOAT_DONG'
    });

    // Create Patients
    await BenhNhan.create({
      ma_benh_nhan: 1,
      ho_ten: 'Bệnh Nhân A',
      so_dien_thoai: '0901234567',
      gioi_tinh: 'NAM',
      nam_sinh: 1990,
      dia_chi: 'Hà Nội'
    });

    await BenhNhan.create({
      ma_benh_nhan: 2,
      ho_ten: 'Bệnh Nhân B',
      so_dien_thoai: '0907654321',
      gioi_tinh: 'NU',
      nam_sinh: 1995,
      dia_chi: 'Đà Nẵng'
    });

    // Seed PhieuKham & LuotKham 1 (Paid) on 2026-06-15
    await PhieuKham.create({
      ma_phieu: 1,
      so_thu_tu: 1,
      ngay_kham: '2026-06-15',
      thoi_gian_lay_so: new Date('2026-06-15T08:00:00Z'),
      trang_thai: 'HOAN_TAT',
      ma_benh_nhan: 1,
      ma_phong: 1,
      ma_nhan_vien_tao: 1
    });

    await LuotKham.create({
      ma_luot_kham: 1,
      ma_phieu: 1,
      ma_benh_nhan: 1,
      ma_phong: 1,
      trang_thai: 'HOAN_TAT',
      thoi_gian_kham: new Date('2026-06-15T08:30:00Z'),
      chan_doan: 'Sốt xuất huyết'
    });

    await PhieuThu.create({
      ma_phieu_thu: 1,
      tien_kham: 150000,
      tong_phi_cls: 200000,
      tong_tien_thuoc: 50000,
      tong_tien: 400000,
      phuong_thuc_tt: 'CHUYEN_KHOAN',
      trang_thai: 'DA_THANH_TOAN',
      thoi_gian_tt: new Date('2026-06-15T09:30:00Z'),
      ma_luot_kham: 1,
      ma_thu_ngan: 1
    });

    // Seed PhieuKham & LuotKham 2 (Paid) on 2026-06-16
    await PhieuKham.create({
      ma_phieu: 2,
      so_thu_tu: 1,
      ngay_kham: '2026-06-16',
      thoi_gian_lay_so: new Date('2026-06-16T08:00:00Z'),
      trang_thai: 'HOAN_TAT',
      ma_benh_nhan: 2,
      ma_phong: 1,
      ma_nhan_vien_tao: 1
    });

    await LuotKham.create({
      ma_luot_kham: 2,
      ma_phieu: 2,
      ma_benh_nhan: 2,
      ma_phong: 1,
      trang_thai: 'HOAN_TAT',
      thoi_gian_kham: new Date('2026-06-16T08:30:00Z'),
      chan_doan: 'Cảm cúm thông thường'
    });

    await PhieuThu.create({
      ma_phieu_thu: 2,
      tien_kham: 150000,
      tong_phi_cls: 0,
      tong_tien_thuoc: 0,
      tong_tien: 150000,
      phuong_thuc_tt: 'TIEN_MAT',
      trang_thai: 'DA_THANH_TOAN',
      thoi_gian_tt: new Date('2026-06-16T09:15:00Z'),
      ma_luot_kham: 2,
      ma_thu_ngan: 1
    });

    // Seed PhieuKham 3 (Cancelled) on 2026-06-16
    await PhieuKham.create({
      ma_phieu: 3,
      so_thu_tu: 2,
      ngay_kham: '2026-06-16',
      thoi_gian_lay_so: new Date('2026-06-16T08:45:00Z'),
      trang_thai: 'HUY',
      ma_benh_nhan: 1,
      ma_phong: 1,
      ma_nhan_vien_tao: 1
    });

    // Seed Medicines & Prescription details
    await Thuoc.create({
      ma_thuoc: 1,
      ten_thuoc: 'Paracetamol 500mg',
      hoat_chat: 'Paracetamol',
      don_vi: 'Viên',
      gia: 2500,
      so_luong_ton: 100,
      is_active: true
    });

    await DonThuoc.create({
      ma_don_thuoc: 1,
      ma_luot_kham: 1,
      tong_tien_thuoc: 50000,
      ngay_ke: new Date('2026-06-15T08:45:00Z')
    });

    await ChiTietDonThuoc.create({
      ma_ct: 1,
      ma_don_thuoc: 1,
      ma_thuoc: 1,
      so_luong: 20,
      don_gia: 2500,
      thanh_tien: 50000
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/reports/patients', () => {
    it('should return 401 if token is missing', async () => {
      await request(app)
        .get('/api/reports/patients?from=2026-06-15&to=2026-06-16')
        .expect(401);
    });

    it('should return 403 for non-ADMIN role', async () => {
      await request(app)
        .get('/api/reports/patients?from=2026-06-15&to=2026-06-16')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('should return 400 if date formats are invalid', async () => {
      await request(app)
        .get('/api/reports/patients?from=15-06-2026&to=2026/06/16')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return patient count per day for ADMIN', async () => {
      const res = await request(app)
        .get('/api/reports/patients?from=2026-06-15&to=2026-06-16')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      
      const dates = res.body.data.map(item => item.date);
      expect(dates).toContain('2026-06-15');
      expect(dates).toContain('2026-06-16');

      const count15 = res.body.data.find(item => item.date === '2026-06-15').count;
      const count16 = res.body.data.find(item => item.date === '2026-06-16').count;
      expect(count15).toBe(1);
      expect(count16).toBe(1); // Excludes the cancelled ticket
    });
  });

  describe('GET /api/reports/revenue', () => {
    it('should aggregate revenue and breakdown details correctly', async () => {
      const res = await request(app)
        .get('/api/reports/revenue?from=2026-06-15&to=2026-06-16')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRevenue).toBe(550000);
      expect(res.body.data.totalTienKham).toBe(300000);
      expect(res.body.data.totalTongPhiCls).toBe(200000);
      expect(res.body.data.totalTongTienThuoc).toBe(50000);
      expect(res.body.data.totalInvoices).toBe(2);

      // Verify payment methods breakdown
      const transferMethod = res.body.data.paymentMethods.find(m => m.method === 'CHUYEN_KHOAN');
      const cashMethod = res.body.data.paymentMethods.find(m => m.method === 'TIEN_MAT');
      expect(transferMethod.count).toBe(1);
      expect(transferMethod.amount).toBe(400000);
      expect(cashMethod.count).toBe(1);
      expect(cashMethod.amount).toBe(150000);

      // Verify daily breakdown details
      expect(res.body.data.breakdown.length).toBe(2);
      const row15 = res.body.data.breakdown.find(row => row.date === '2026-06-15');
      const row16 = res.body.data.breakdown.find(row => row.date === '2026-06-16');
      expect(row15.tongTien).toBe(400000);
      expect(row16.tongTien).toBe(150000);
    });
  });

  describe('GET /api/reports/medicines', () => {
    it('should list top medicines consumption ordered by quantity correctly', async () => {
      const res = await request(app)
        .get('/api/reports/medicines?from=2026-06-15&to=2026-06-16')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].tenThuoc).toBe('Paracetamol 500mg');
      expect(res.body.data[0].totalQuantity).toBe(20);
      expect(res.body.data[0].totalRevenue).toBe(50000);
    });
  });
});
