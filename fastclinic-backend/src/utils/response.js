/**
 * Formats a successful response payload.
 * @param {any} data - The response data.
 * @param {string} [message='Thành công'] - Optional status message.
 * @returns {object} Standard success response object.
 */
const successResponse = (data, message = 'Thành công') => {
  return {
    success: true,
    message,
    data
  };
};

/**
 * Formats an error response payload.
 * @param {string} code - Machine-readable error code in UPPER_SNAKE_CASE.
 * @param {string} message - User-friendly error message in Vietnamese.
 * @param {any} [details=null] - Optional error details (e.g., Joi validation details).
 * @returns {object} Standard error response object.
 */
const errorResponse = (code, message, details = null) => {
  return {
    success: false,
    error: {
      code,
      message,
      details: details || undefined
    }
  };
};

module.exports = {
  successResponse,
  errorResponse
};
