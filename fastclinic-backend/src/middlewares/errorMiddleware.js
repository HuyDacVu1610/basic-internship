const logger = require('../utils/logger');
const { errorResponse } = require('../utils/response');

// Centralized error handler middleware
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  // Log the internal error details on the server side
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user ? req.user.userId : 'anonymous'
  });

  // Determine HTTP status code
  const statusCode = err.statusCode || 500;
  
  // Format standard error response
  const errorCode = err.code || 'INTERNAL_ERROR';
  const errorMessage = statusCode === 500
    ? 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
    : err.message;
  
  res.status(statusCode).json(
    errorResponse(errorCode, errorMessage, err.details)
  );
};

module.exports = errorMiddleware;
