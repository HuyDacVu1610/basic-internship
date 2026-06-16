const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { NhanVien } = require('../models');
const logger = require('../utils/logger');

class AuthService {
  async login(tenDangNhap, matKhau) {
    const user = await NhanVien.findOne({
      where: { ten_dang_nhap: tenDangNhap }
    });

    if (!user) {
      logger.warn(`Login failed: Username ${tenDangNhap} not found`);
      const err = new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
      err.statusCode = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    if (!user.is_active) {
      logger.warn(`Login failed: Account ${tenDangNhap} is locked/disabled`);
      const err = new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
      err.statusCode = 403;
      err.code = 'ACCOUNT_LOCKED';
      throw err;
    }

    // Check if account is currently locked
    if (user.khoa_den && new Date(user.khoa_den) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.khoa_den) - new Date()) / 60000);
      logger.warn(`Login blocked: Account ${tenDangNhap} is locked. Remaining: ${remainingTime}m`);
      const err = new Error(`Tài khoản bị khóa tạm thời. Vui lòng thử lại sau ${remainingTime} phút.`);
      err.statusCode = 403;
      err.code = 'ACCOUNT_LOCKED';
      throw err;
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(matKhau, user.mat_khau_hash);

    if (!isPasswordMatch) {
      // Increment failed attempts
      user.so_lan_dang_nhap_sai += 1;
      logger.warn(`Login failed: Wrong password for ${tenDangNhap}. Attempt: ${user.so_lan_dang_nhap_sai}`);

      if (user.so_lan_dang_nhap_sai >= 5) {
        user.khoa_den = new Date(Date.now() + 15 * 60 * 1000); // lock 15 mins
        logger.warn(`Account locked: ${tenDangNhap} locked for 15 minutes`);
      }

      await user.save();

      const err = new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
      err.statusCode = 401;
      err.code = 'INVALID_CREDENTIALS';
      
      if (user.so_lan_dang_nhap_sai >= 5) {
        const lockErr = new Error('Tài khoản bị khóa tạm thời. Vui lòng thử lại sau 15 phút.');
        lockErr.statusCode = 403;
        lockErr.code = 'ACCOUNT_LOCKED';
        throw lockErr;
      }
      
      throw err;
    }

    // Reset failed login count and unlock time
    user.so_lan_dang_nhap_sai = 0;
    user.khoa_den = null;
    await user.save();

    // Generate JWT Access Token (expires in 1h)
    const accessToken = jwt.sign(
      { userId: user.ma_nhan_vien, role: user.vai_tro, username: user.ten_dang_nhap },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '1h' }
    );

    // Generate JWT Refresh Token (expires in 7d)
    const refreshToken = jwt.sign(
      { userId: user.ma_nhan_vien },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
    );

    logger.info(`Login success: User ${tenDangNhap} (Role: ${user.vai_tro}) logged in successfully`);

    return {
      accessToken,
      refreshToken,
      user: {
        ma_nhan_vien: user.ma_nhan_vien,
        ho_ten: user.ho_ten,
        vai_tro: user.vai_tro,
        ten_dang_nhap: user.ten_dang_nhap
      }
    };
  }
}

module.exports = new AuthService();
