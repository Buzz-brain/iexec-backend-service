/**
 * Standardized response handlers for iExec API
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export function respondSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    statusCode,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {*} details - Additional error details (optional)
 */
export function respondError(res, message, statusCode = 500, details = null) {
  const errorResponse = {
    success: false,
    statusCode,
    error: {
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  };

  // Log error server-side
  if (statusCode >= 500) {
    console.error(`[ERROR ${statusCode}] ${message}`, details);
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Response wrapper for try-catch blocks
 * Provides convenience for endpoint handlers
 */
export class ApiResponse {
  static success(data, statusCode = 200) {
    return { success: true, statusCode, data };
  }

  static error(message, statusCode = 500, details = null) {
    return {
      success: false,
      statusCode,
      error: { message, details },
    };
  }

  static async handle(req, res, asyncFn) {
    try {
      const result = await asyncFn();
      respondSuccess(res, result);
    } catch (error) {
      respondError(res, error.message, 500, error);
    }
  }
}
