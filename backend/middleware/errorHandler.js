const { logger } = require('./logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with request context
  const errorLog = {
    message: error.message,
    stack: error.stack,
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
    logger.warn('Cast Error', errorLog);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
    logger.warn('Duplicate Key Error', errorLog);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
    logger.warn('Validation Error', errorLog);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
    logger.warn('JWT Error', errorLog);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
    logger.warn('Token Expired', errorLog);
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { message, statusCode: 400 };
    logger.warn('File Size Error', errorLog);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = { message, statusCode: 400 };
    logger.warn('Unexpected File Error', errorLog);
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
    logger.warn('Rate Limit Exceeded', errorLog);
  }

  // Log severe errors
  if (!error.statusCode || error.statusCode >= 500) {
    logger.error('Server Error', errorLog);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Don't expose internal error details in production
  const response = {
    success: false,
    message: message,
    ...(req.requestId && { requestId: req.requestId })
  };

  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error = {
      name: err.name,
      stack: err.stack,
      ...(err.errors && { validationErrors: err.errors })
    };
  }

  res.status(statusCode).json(response);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection', {
    error: err.message,
    stack: err.stack,
    promise: promise
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

module.exports = errorHandler;