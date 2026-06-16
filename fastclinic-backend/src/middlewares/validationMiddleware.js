const { errorResponse } = require('../utils/response');

/**
 * Middleware to validate request body against a Joi schema.
 * @param {object} schema - Joi schema object.
 */
const validationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.', details)
      );
    }

    req.body = value; // Replace with validated & coerced values
    next();
  };
};

module.exports = validationMiddleware;
