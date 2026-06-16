const BenhNhanModel = require('./BenhNhan');
const NhanVienModel = require('./NhanVien');
const PhongKhamModel = require('./PhongKham');
const DichVuCLSModel = require('./DichVuCLS');
const ThuocModel = require('./Thuoc');
const PhieuKhamModel = require('./PhieuKham');
const LuotKhamModel = require('./LuotKham');
const SinhHieuModel = require('./SinhHieu');
const KetQuaCLSModel = require('./KetQuaCLS');
const DonThuocModel = require('./DonThuoc');
const ChiTietDonThuocModel = require('./ChiTietDonThuoc');
const PhieuThuModel = require('./PhieuThu');

function initModels(sequelize) {
  const db = {
    BenhNhan: BenhNhanModel(sequelize),
    NhanVien: NhanVienModel(sequelize),
    PhongKham: PhongKhamModel(sequelize),
    DichVuCLS: DichVuCLSModel(sequelize),
    Thuoc: ThuocModel(sequelize),
    PhieuKham: PhieuKhamModel(sequelize),
    LuotKham: LuotKhamModel(sequelize),
    SinhHieu: SinhHieuModel(sequelize),
    KetQuaCLS: KetQuaCLSModel(sequelize),
    DonThuoc: DonThuocModel(sequelize),
    ChiTietDonThuoc: ChiTietDonThuocModel(sequelize),
    PhieuThu: PhieuThuModel(sequelize),
  };

  // Setup Associations
  
  // 1. PhieuKham relations
  db.BenhNhan.hasMany(db.PhieuKham, { foreignKey: 'ma_benh_nhan', as: 'phieuKhams' });
  db.PhieuKham.belongsTo(db.BenhNhan, { foreignKey: 'ma_benh_nhan', as: 'benhNhan' });

  db.PhongKham.hasMany(db.PhieuKham, { foreignKey: 'ma_phong', as: 'phieuKhams' });
  db.PhieuKham.belongsTo(db.PhongKham, { foreignKey: 'ma_phong', as: 'phongKham' });

  db.NhanVien.hasMany(db.PhieuKham, { foreignKey: 'ma_nhan_vien_tao', as: 'phieuKhamTaos' });
  db.PhieuKham.belongsTo(db.NhanVien, { foreignKey: 'ma_nhan_vien_tao', as: 'nhanVienTao' });

  // 2. LuotKham relations
  db.PhieuKham.hasMany(db.LuotKham, { foreignKey: 'ma_phieu', as: 'luotKhams' });
  db.LuotKham.belongsTo(db.PhieuKham, { foreignKey: 'ma_phieu', as: 'phieuKham' });

  db.BenhNhan.hasMany(db.LuotKham, { foreignKey: 'ma_benh_nhan', as: 'luotKhams' });
  db.LuotKham.belongsTo(db.BenhNhan, { foreignKey: 'ma_benh_nhan', as: 'benhNhan' });

  db.NhanVien.hasMany(db.LuotKham, { foreignKey: 'ma_bac_si', as: 'luotKhamBacSis' });
  db.LuotKham.belongsTo(db.NhanVien, { foreignKey: 'ma_bac_si', as: 'bacSi' });

  db.PhongKham.hasMany(db.LuotKham, { foreignKey: 'ma_phong', as: 'luotKhams' });
  db.LuotKham.belongsTo(db.PhongKham, { foreignKey: 'ma_phong', as: 'phongKham' });

  // 3. SinhHieu relations
  db.LuotKham.hasOne(db.SinhHieu, { foreignKey: 'ma_luot_kham', as: 'sinhHieu' });
  db.SinhHieu.belongsTo(db.LuotKham, { foreignKey: 'ma_luot_kham', as: 'luotKham' });

  db.NhanVien.hasMany(db.SinhHieu, { foreignKey: 'ma_dieu_duong', as: 'sinhHieuDieuDuongs' });
  db.SinhHieu.belongsTo(db.NhanVien, { foreignKey: 'ma_dieu_duong', as: 'dieuDuong' });

  // 4. KetQuaCLS relations
  db.LuotKham.hasMany(db.KetQuaCLS, { foreignKey: 'ma_luot_kham', as: 'ketQuaCLSs' });
  db.KetQuaCLS.belongsTo(db.LuotKham, { foreignKey: 'ma_luot_kham', as: 'luotKham' });

  db.DichVuCLS.hasMany(db.KetQuaCLS, { foreignKey: 'ma_dich_vu', as: 'ketQuaCLSs' });
  db.KetQuaCLS.belongsTo(db.DichVuCLS, { foreignKey: 'ma_dich_vu', as: 'dichVuCLS' });

  db.NhanVien.hasMany(db.KetQuaCLS, { foreignKey: 'ma_nhan_vien_nhap', as: 'ketQuaCLSUpdates' });
  db.KetQuaCLS.belongsTo(db.NhanVien, { foreignKey: 'ma_nhan_vien_nhap', as: 'nhanVienNhap' });

  // 5. DonThuoc relations
  db.LuotKham.hasOne(db.DonThuoc, { foreignKey: 'ma_luot_kham', as: 'donThuoc' });
  db.DonThuoc.belongsTo(db.LuotKham, { foreignKey: 'ma_luot_kham', as: 'luotKham' });

  // 6. ChiTietDonThuoc relations
  db.DonThuoc.hasMany(db.ChiTietDonThuoc, { foreignKey: 'ma_don_thuoc', as: 'chiTietDonThuocs' });
  db.ChiTietDonThuoc.belongsTo(db.DonThuoc, { foreignKey: 'ma_don_thuoc', as: 'donThuoc' });

  db.Thuoc.hasMany(db.ChiTietDonThuoc, { foreignKey: 'ma_thuoc', as: 'chiTietDonThuocs' });
  db.ChiTietDonThuoc.belongsTo(db.Thuoc, { foreignKey: 'ma_thuoc', as: 'thuoc' });

  // 7. PhieuThu relations
  db.LuotKham.hasOne(db.PhieuThu, { foreignKey: 'ma_luot_kham', as: 'phieuThu' });
  db.PhieuThu.belongsTo(db.LuotKham, { foreignKey: 'ma_luot_kham', as: 'luotKham' });

  db.NhanVien.hasMany(db.PhieuThu, { foreignKey: 'ma_thu_ngan', as: 'phieuThuThuNgans' });
  db.PhieuThu.belongsTo(db.NhanVien, { foreignKey: 'ma_thu_ngan', as: 'thuNgan' });

  return db;
}

module.exports = initModels;
