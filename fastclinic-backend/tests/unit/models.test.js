const { Sequelize } = require('sequelize');

// Set up in-memory SQLite for unit tests
const testSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

describe('Sequelize Database Models', () => {
  let db = {};

  beforeAll(async () => {
    // Import index.js which initializes models and associations
    // We pass our test sequelize instance so we don't need a running MySQL
    const initModels = require('../../src/models/index.init');
    db = initModels(testSequelize);
    await testSequelize.sync({ force: true });
  });

  afterAll(async () => {
    await testSequelize.close();
  });

  it('should have all 12 models registered', () => {
    const expectedModels = [
      'BenhNhan', 'NhanVien', 'PhongKham', 'DichVuCLS', 'Thuoc',
      'PhieuKham', 'LuotKham', 'SinhHieu', 'KetQuaCLS', 'DonThuoc',
      'ChiTietDonThuoc', 'PhieuThu'
    ];
    
    expectedModels.forEach(modelName => {
      expect(db).toHaveProperty(modelName);
      expect(testSequelize.models[modelName]).toBeDefined();
    });
  });

  it('should successfully enforce model validation and associations', async () => {
    // 1. Create PhongKham
    const phong = await db.PhongKham.create({
      ten_phong: 'Phòng Nội 1',
      chuyen_khoa: 'Nội tổng quát',
      trang_thai: 'HOAT_DONG'
    });
    expect(phong.ma_phong).toBeDefined();

    // 2. Create NhanVien
    const nv = await db.NhanVien.create({
      ho_ten: 'Lê Văn Lễ Tân',
      vai_tro: 'LE_TAN',
      ten_dang_nhap: 'letan01',
      mat_khau_hash: 'hashedpassword'
    });
    expect(nv.ma_nhan_vien).toBeDefined();

    // 3. Create BenhNhan
    const bn = await db.BenhNhan.create({
      ho_ten: 'Trần Văn B',
      so_dien_thoai: '0912345678',
      cccd: '123456789012',
      ngay_sinh: '1990-01-01',
      gioi_tinh: 'Nam',
      dia_chi: 'Hà Nội'
    });
    expect(bn.ma_benh_nhan).toBeDefined();

    // 4. Create PhieuKham
    const phieu = await db.PhieuKham.create({
      so_thu_tu: 1,
      ngay_kham: new Date().toISOString().split('T')[0],
      ma_benh_nhan: bn.ma_benh_nhan,
      ma_phong: phong.ma_phong,
      ma_nhan_vien_tao: nv.ma_nhan_vien
    });
    expect(phieu.ma_phieu).toBeDefined();

    // 5. Test Associations
    const fetchedPhieu = await db.PhieuKham.findByPk(phieu.ma_phieu, {
      include: [
        { model: db.BenhNhan, as: 'benhNhan' },
        { model: db.PhongKham, as: 'phongKham' },
        { model: db.NhanVien, as: 'nhanVienTao' }
      ]
    });
    
    expect(fetchedPhieu.benhNhan.ho_ten).toBe('Trần Văn B');
    expect(fetchedPhieu.phongKham.ten_phong).toBe('Phòng Nội 1');
    expect(fetchedPhieu.nhanVienTao.ho_ten).toBe('Lê Văn Lễ Tân');
  });

  it('should enforce unique constraint on phieu_kham for (ngay_kham, ma_phong, so_thu_tu)', async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const p1 = await db.PhongKham.create({ ten_phong: 'P01', trang_thai: 'HOAT_DONG' });
    const n1 = await db.NhanVien.create({ ho_ten: 'NV', vai_tro: 'LE_TAN', ten_dang_nhap: 'nv1', mat_khau_hash: 'pwd' });
    const b1 = await db.BenhNhan.create({ ho_ten: 'BN1', so_dien_thoai: '0111111111' });
    const b2 = await db.BenhNhan.create({ ho_ten: 'BN2', so_dien_thoai: '0222222222' });

    // First ticket: STT 1
    await db.PhieuKham.create({
      so_thu_tu: 1,
      ngay_kham: today,
      ma_benh_nhan: b1.ma_benh_nhan,
      ma_phong: p1.ma_phong,
      ma_nhan_vien_tao: n1.ma_nhan_vien
    });

    // Second ticket: duplicate STT 1 for same day and room should fail
    await expect(db.PhieuKham.create({
      so_thu_tu: 1,
      ngay_kham: today,
      ma_benh_nhan: b2.ma_benh_nhan,
      ma_phong: p1.ma_phong,
      ma_nhan_vien_tao: n1.ma_nhan_vien
    })).rejects.toThrow();
  });
});
