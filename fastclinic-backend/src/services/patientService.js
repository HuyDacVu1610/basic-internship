const { Op } = require('sequelize');
const { BenhNhan, LuotKham, NhanVien, PhongKham } = require('../models');
const logger = require('../utils/logger');

class PatientService {
  async searchPatients(q) {
    if (!q) return [];
    
    logger.info(`Searching patients with query: "${q}"`);
    
    return await BenhNhan.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          { so_dien_thoai: { [Op.like]: `%${q}%` } },
          { cccd: { [Op.like]: `%${q}%` } },
          { ho_ten: { [Op.like]: `%${q}%` } }
        ]
      },
      limit: 10
    });
  }

  async getPatientById(id) {
    const patient = await BenhNhan.findOne({
      where: { ma_benh_nhan: id, is_active: true }
    });

    if (!patient) {
      const err = new Error('Bệnh nhân không tồn tại hoặc đã bị ẩn.');
      err.statusCode = 404;
      err.code = 'PATIENT_NOT_FOUND';
      throw err;
    }

    return patient;
  }

  async createPatient(data) {
    // Check duplicate phone number
    const existingPhone = await BenhNhan.findOne({
      where: { so_dien_thoai: data.soDienThoai }
    });

    if (existingPhone) {
      if (existingPhone.is_active) {
        const err = new Error('Số điện thoại này đã được đăng ký bởi bệnh nhân khác.');
        err.statusCode = 409;
        err.code = 'DUPLICATE_PHONE';
        throw err;
      } else {
        // Reactivate soft-deleted patient with updated details
        logger.info(`Reactivating soft-deleted patient with phone: ${data.soDienThoai}`);
        existingPhone.is_active = true;
        existingPhone.ho_ten = data.hoTen;
        existingPhone.cccd = data.cccd || existingPhone.cccd;
        existingPhone.ngay_sinh = data.ngaySinh || existingPhone.ngay_sinh;
        existingPhone.gioi_tinh = data.gioiTinh || existingPhone.gioi_tinh;
        existingPhone.dia_chi = data.diaChi || existingPhone.dia_chi;
        existingPhone.tien_su_di_ung = data.tienSuDiUng || existingPhone.tien_su_di_ung;
        await existingPhone.save();
        return existingPhone;
      }
    }

    // Check duplicate CCCD if provided
    if (data.cccd) {
      const existingCccd = await BenhNhan.findOne({
        where: { cccd: data.cccd, is_active: true }
      });

      if (existingCccd) {
        const err = new Error('Số CCCD này đã được đăng ký bởi bệnh nhân khác.');
        err.statusCode = 409;
        err.code = 'DUPLICATE_CCCD';
        throw err;
      }
    }

    logger.info(`Creating new patient: ${data.hoTen}`);
    
    return await BenhNhan.create({
      ho_ten: data.hoTen,
      so_dien_thoai: data.soDienThoai,
      cccd: data.cccd || null,
      ngay_sinh: data.ngaySinh || null,
      gioi_tinh: data.gioiTinh || null,
      dia_chi: data.diaChi || null,
      tien_su_di_ung: data.tienSuDiUng || null,
      is_active: true
    });
  }

  async updatePatient(id, data) {
    const patient = await this.getPatientById(id);

    // If phone number is updated, check uniqueness
    if (data.soDienThoai && data.soDienThoai !== patient.so_dien_thoai) {
      const existingPhone = await BenhNhan.findOne({
        where: { so_dien_thoai: data.soDienThoai, is_active: true }
      });

      if (existingPhone) {
        const err = new Error('Số điện thoại này đã được đăng ký bởi bệnh nhân khác.');
        err.statusCode = 409;
        err.code = 'DUPLICATE_PHONE';
        throw err;
      }
    }

    // If CCCD is updated, check uniqueness
    if (data.cccd && data.cccd !== patient.cccd) {
      const existingCccd = await BenhNhan.findOne({
        where: { cccd: data.cccd, is_active: true }
      });

      if (existingCccd) {
        const err = new Error('Số CCCD này đã được đăng ký bởi bệnh nhân khác.');
        err.statusCode = 409;
        err.code = 'DUPLICATE_CCCD';
        throw err;
      }
    }

    logger.info(`Updating patient profile ID ${id}: ${data.hoTen || patient.ho_ten}`);

    await patient.update({
      ho_ten: data.hoTen !== undefined ? data.hoTen : patient.ho_ten,
      so_dien_thoai: data.soDienThoai !== undefined ? data.soDienThoai : patient.so_dien_thoai,
      cccd: data.cccd !== undefined ? (data.cccd || null) : patient.cccd,
      ngay_sinh: data.ngaySinh !== undefined ? (data.ngaySinh || null) : patient.ngay_sinh,
      gioi_tinh: data.gioiTinh !== undefined ? (data.gioiTinh || null) : patient.gioi_tinh,
      dia_chi: data.diaChi !== undefined ? (data.diaChi || null) : patient.dia_chi,
      tien_su_di_ung: data.tienSuDiUng !== undefined ? (data.tienSuDiUng || null) : patient.tien_su_di_ung
    });

    return patient;
  }

  async getPatientHistory(id, page = 1, limit = 5) {
    // Confirm patient exists
    await this.getPatientById(id);

    const offset = (page - 1) * limit;

    logger.info(`Fetching encounter history for patient ID ${id} (Page ${page}, Limit ${limit})`);

    const { count, rows } = await LuotKham.findAndCountAll({
      where: { ma_benh_nhan: id },
      include: [
        {
          model: NhanVien,
          as: 'bacSi',
          attributes: ['ma_nhan_vien', 'ho_ten']
        },
        {
          model: PhongKham,
          as: 'phongKham',
          attributes: ['ma_phong', 'ten_phong']
        }
      ],
      order: [['ma_luot_kham', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Structure CamelCase for frontend ease
    const formattedHistory = rows.map(item => ({
      maLuotKham: item.ma_luot_kham,
      thoiGianKham: item.thoi_gian_kham,
      trieuChung: item.trieu_chung,
      chanDoan: item.chan_doan,
      ghiChu: item.ghi_chu,
      trangThai: item.trang_thai,
      maPhieu: item.ma_phieu,
      maPhong: item.ma_phong,
      phongKham: item.phongKham ? {
        maPhong: item.phongKham.ma_phong,
        tenPhong: item.phongKham.ten_phong
      } : null,
      bacSi: item.bacSi ? {
        maNhanVien: item.bacSi.ma_nhan_vien,
        hoTen: item.bacSi.ho_ten
      } : null
    }));

    return {
      total: count,
      history: formattedHistory,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    };
  }
}

module.exports = new PatientService();
