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
}

module.exports = new AuthController();
