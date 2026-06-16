const { errorResponse } = require('../utils/response');

/**
 * Middleware to restrict access by user roles (RBAC).
 * @param {string[]} allowedRoles - List of roles permitted to access the route.
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json(
        errorResponse('FORBIDDEN', 'Bạn không có quyền truy cập chức năng này.')
      );
    }
    next();
  };
};

module.exports = roleMiddleware;
