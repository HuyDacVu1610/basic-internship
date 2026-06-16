const bcrypt = require('bcrypt');
const { NhanVien } = require('../models');
const { Op } = require('sequelize');

class StaffService {
  async getStaffList({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (search && search.trim()) {
      const keyword = search.trim();
      whereClause[Op.or] = [
        { ho_ten: { [Op.like]: `%${keyword}%` } },
        { ten_dang_nhap: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { count, rows } = await NhanVien.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['ma_nhan_vien', 'ASC']],
      attributes: { exclude: ['mat_khau_hash'] } // do not expose password hashes
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
      staff: rows
    };
  }

  async createStaff(data) {
    const existing = await NhanVien.findOne({
      where: { ten_dang_nhap: data.tenDangNhap }
    });

    if (existing) {
      const err = new Error('Tên đăng nhập đã tồn tại.');
      err.statusCode = 409;
      err.code = 'USERNAME_ALREADY_EXISTS';
      throw err;
    }

    const matKhauHash = await bcrypt.hash(data.matKhau, 10);

    const staff = await NhanVien.create({
      ho_ten: data.hoTen,
      vai_tro: data.vaiTro,
      ten_dang_nhap: data.tenDangNhap,
      mat_khau_hash: matKhauHash,
      is_active: data.isActive !== undefined ? data.isActive : true
    });

    const result = staff.toJSON();
    delete result.mat_khau_hash;
    return result;
  }

  async updateStaff(id, data, requesterRole) {
    const staff = await NhanVien.findByPk(id);
    if (!staff) {
      const err = new Error('Nhân viên không tồn tại.');
      err.statusCode = 404;
      err.code = 'STAFF_NOT_FOUND';
      throw err;
    }

    // Check if username is already taken by another user
    if (data.tenDangNhap && data.tenDangNhap !== staff.ten_dang_nhap) {
      const duplicate = await NhanVien.findOne({
        where: { ten_dang_nhap: data.tenDangNhap }
      });
      if (duplicate) {
        const err = new Error('Tên đăng nhập đã tồn tại.');
        err.statusCode = 409;
        err.code = 'USERNAME_ALREADY_EXISTS';
        throw err;
      }
    }

    // Role updates are restricted to ADMIN role
    if (data.vaiTro && data.vaiTro !== staff.vai_tro && requesterRole !== 'ADMIN') {
      const err = new Error('Chỉ có Quản trị viên mới được phép thay đổi vai trò.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const updateData = {
      ho_ten: data.hoTen !== undefined ? data.hoTen : staff.ho_ten,
      vai_tro: data.vaiTro !== undefined ? data.vaiTro : staff.vai_tro,
      ten_dang_nhap: data.tenDangNhap !== undefined ? data.tenDangNhap : staff.ten_dang_nhap,
      is_active: data.isActive !== undefined ? data.isActive : staff.is_active
    };

    if (data.matKhau && data.matKhau.trim()) {
      updateData.mat_khau_hash = await bcrypt.hash(data.matKhau, 10);
    }

    await staff.update(updateData);
    
    const result = staff.toJSON();
    delete result.mat_khau_hash;
    return result;
  }

  async toggleLock(id) {
    const staff = await NhanVien.findByPk(id);
    if (!staff) {
      const err = new Error('Nhân viên không tồn tại.');
      err.statusCode = 404;
      err.code = 'STAFF_NOT_FOUND';
      throw err;
    }

    const isTempLocked = staff.khoa_den && new Date(staff.khoa_den) > new Date();
    const updateData = {};

    if (isTempLocked) {
      // Clear temporary lock and failed attempts, make active
      updateData.khoa_den = null;
      updateData.so_lan_dang_nhap_sai = 0;
      updateData.is_active = true;
    } else {
      // Standard active state toggle
      const nextActive = !staff.is_active;
      updateData.is_active = nextActive;
      if (nextActive) {
        updateData.khoa_den = null;
        updateData.so_lan_dang_nhap_sai = 0;
      }
    }

    await staff.update(updateData);

    const result = staff.toJSON();
    delete result.mat_khau_hash;
    return result;
  }
}

module.exports = new StaffService();
