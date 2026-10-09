/**
 * Centralized Error Handler Middleware
 * Normalizes all uncaught errors into clean, informative JSON responses
 */
function errorHandler(err, req, res, next) {
  console.error(`[Error Handler] ${req.method} ${req.url} - Error:`, err.message);

  let statusCode = 500;
  if (err.message.includes('not found') || err.message.includes('does not exist')) {
    statusCode = 404;
  } else if (
    err.message.includes('required') ||
    err.message.includes('Invalid') ||
    err.message.includes('empty') ||
    err.message.includes('Insufficient') ||
    err.message.includes('shortage')
  ) {
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message,
      statusCode,
      requestId: req.requestId || null,
      timestamp: new Date().toISOString()
    }
  });
}

module.exports = errorHandler;
