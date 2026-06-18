const authService = require('../services/authService');
const { successResponse } = require('../utils/response');

class AuthController {
  async login(req, res, next) {
    try {
      const { tenDangNhap, matKhau } = req.body;
      const { accessToken, refreshToken, user } = await authService.login(tenDangNhap, matKhau);

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json(
        successResponse({ accessToken, user }, 'Đăng nhập thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        const err = new Error('Không tìm thấy refresh token.');
        err.statusCode = 401;
        err.code = 'UNAUTHORIZED';
        throw err;
      }

      const { accessToken, refreshToken: newRefreshToken, user } = await authService.refresh(refreshToken);

      // Set new refresh token in HTTP-only cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json(
        successResponse({ accessToken, user }, 'Làm mới token thành công')
      );
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      res.status(200).json(
        successResponse(null, 'Đăng xuất thành công')
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
