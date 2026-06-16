const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');
const { NhanVien } = require('../models');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(
      errorResponse('UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.')
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Check if user is still active in the database
    const user = await NhanVien.findByPk(decoded.userId);

    if (user && !user.is_active) {
      return res.status(401).json(
        errorResponse('UNAUTHORIZED', 'Tài khoản đã bị khóa hoặc không còn hoạt động. Vui lòng đăng nhập lại.')
      );
    }

    if (!user && process.env.NODE_ENV !== 'test') {
      return res.status(401).json(
        errorResponse('UNAUTHORIZED', 'Tài khoản không tồn tại. Vui lòng đăng nhập lại.')
      );
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json(
      errorResponse('UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.')
    );
  }
};

module.exports = authMiddleware;

