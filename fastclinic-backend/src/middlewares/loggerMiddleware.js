const logger = require('../utils/logger');

/**
 * Middleware to log HTTP request details.
 */
const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.user ? req.user.userId : 'anonymous';
    const role = req.user ? req.user.role : 'guest';
    
    logger.info({
      message: `HTTP ${req.method} ${req.originalUrl}`,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      userId,
      role,
      ip: req.ip,
      durationMs: duration
    });
  });
  
  next();
};

module.exports = loggerMiddleware;
