require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, PhongKham, NhanVien, DichVuCLS, Thuoc } = require('./models');

async function seed() {
  try {
    // Force sync database to create tables if they don't exist
    await sequelize.sync({ force: true });
    console.log('Database synced successfully.');

    // 1. Seed PhongKham
    const clinics = [
      { ten_phong: 'Phòng Nội 1', chuyen_khoa: 'Nội tổng quát', trang_thai: 'HOAT_DONG' },
      { ten_phong: 'Phòng Nội 2', chuyen_khoa: 'Nội tổng quát', trang_thai: 'HOAT_DONG' },
      { ten_phong: 'Phòng Nhi', chuyen_khoa: 'Nhi khoa', trang_thai: 'HOAT_DONG' },
      { ten_phong: 'Phòng Tai Mũi Họng', chuyen_khoa: 'TMH', trang_thai: 'HOAT_DONG' },
      { ten_phong: 'Phòng Da Liễu', chuyen_khoa: 'Da liễu', trang_thai: 'TAM_NGUNG' }
    ];
    await PhongKham.bulkCreate(clinics);
    console.log('PhongKham seeded.');

    // Helper to hash password
    const hashPassword = async (pwd) => {
      return await bcrypt.hash(pwd, 12);
    };

    // 2. Seed NhanVien
    const staff = [
      {
        ho_ten: 'Admin Hệ Thống',
        vai_tro: 'ADMIN',
        ten_dang_nhap: 'admin',
        mat_khau_hash: await hashPassword('Admin@123')
      },
      {
        ho_ten: 'Nguyễn Thị Hoàng',
        vai_tro: 'LE_TAN',
        ten_dang_nhap: 'letanhoang',
        mat_khau_hash: await hashPassword('LeTan@123')
      },
      {
        ho_ten: 'BS. Nguyễn Văn A',
        vai_tro: 'BAC_SI',
        ten_dang_nhap: 'bsnguyenvana',
        mat_khau_hash: await hashPassword('BacSi@123')
      },
      {
        ho_ten: 'Đinh Thị B',
        vai_tro: 'DIEU_DUONG',
        ten_dang_nhap: 'ddinhthib',
        mat_khau_hash: await hashPassword('DieuDuong@123')
      },
      {
        ho_ten: 'Lê Văn C',
        vai_tro: 'THU_NGAN',
        ten_dang_nhap: 'tnlevanc',
        mat_khau_hash: await hashPassword('ThuNgan@123')
      },
      {
        ho_ten: 'Trần Văn D',
        vai_tro: 'NV_CLS',
        ten_dang_nhap: 'clstranvand',
        mat_khau_hash: await hashPassword('ClsTran@123')
      }
    ];
    await NhanVien.bulkCreate(staff);
    console.log('NhanVien seeded.');

    // 3. Seed DichVuCLS
    const services = [
      { ten_dich_vu: 'Xét nghiệm máu tổng quát', gia: 120000 },
      { ten_dich_vu: 'Xét nghiệm nước tiểu', gia: 80000 },
      { ten_dich_vu: 'Siêu âm bụng', gia: 200000 },
      { ten_dich_vu: 'X-quang ngực', gia: 150000 },
      { ten_dich_vu: 'Điện tâm đồ (ECG)', gia: 100000 },
      { ten_dich_vu: 'Xét nghiệm đường huyết', gia: 50000 }
    ];
    await DichVuCLS.bulkCreate(services);
    console.log('DichVuCLS seeded.');

    // 4. Seed Thuoc
    const medicines = [
      { ten_thuoc: 'Amoxicillin 500mg', hoat_chat: 'Amoxicillin', don_vi: 'Viên', gia: 2500, so_luong_ton: 500, han_dung: '2025-12-31' },
      { ten_thuoc: 'Amoxicillin 250mg', hoat_chat: 'Amoxicillin', don_vi: 'Viên', gia: 1800, so_luong_ton: 3, han_dung: '2025-10-15' },
      { ten_thuoc: 'Paracetamol 500mg', hoat_chat: 'Paracetamol', don_vi: 'Viên', gia: 1000, so_luong_ton: 1000, han_dung: '2026-06-30' },
      { ten_thuoc: 'Ibuprofen 400mg', hoat_chat: 'Ibuprofen', don_vi: 'Viên', gia: 2000, so_luong_ton: 200, han_dung: '2025-08-20' },
      { ten_thuoc: 'Omeprazole 20mg', hoat_chat: 'Omeprazole', don_vi: 'Viên', gia: 3500, so_luong_ton: 150, han_dung: '2025-11-30' },
      { ten_thuoc: 'Cetirizine 10mg', hoat_chat: 'Cetirizine', don_vi: 'Viên', gia: 1500, so_luong_ton: 400, han_dung: '2026-03-15' },
      { ten_thuoc: 'Metformin 500mg', hoat_chat: 'Metformin', don_vi: 'Viên', gia: 2000, so_luong_ton: 8, han_dung: '2025-09-30' },
      { ten_thuoc: 'Amlodipine 5mg', hoat_chat: 'Amlodipine', don_vi: 'Viên', gia: 3000, so_luong_ton: 100, han_dung: '2024-05-15' },
      { ten_thuoc: 'Azithromycin 250mg', hoat_chat: 'Azithromycin', don_vi: 'Viên', gia: 5000, so_luong_ton: 80, han_dung: '2025-07-20' },
      { ten_thuoc: 'Dexamethasone 0.5mg', hoat_chat: 'Dexamethasone', don_vi: 'Viên', gia: 1200, so_luong_ton: 250, han_dung: '2026-01-10' }
    ];
    await Thuoc.bulkCreate(medicines);
    console.log('Thuoc seeded.');

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
