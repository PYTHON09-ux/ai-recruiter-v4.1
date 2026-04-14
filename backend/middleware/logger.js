const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-recruiter-platform' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production, log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// HTTP request logging middleware
const httpLogger = (req, res, next) => {
  // Skip logging for health checks and static files
  if (req.path === '/api/health' || req.path.startsWith('/uploads/')) {
    return next();
  }

  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to request object for tracking
  req.requestId = requestId;
  
  // Log request details
  logger.info('HTTP Request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Log request body for non-GET requests (excluding sensitive info)
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body };
    
    // Mask sensitive fields
    const sensitiveFields = ['password', 'passwordHash', 'refreshToken', 'token', 'apiKey', 'secret'];
    sensitiveFields.forEach(field => {
      if (logBody[field]) logBody[field] = '********';
    });
    
    logger.debug('Request Body', { requestId, body: logBody });
  }

  // Capture response data for logging
  const originalSend = res.send;
  res.send = function(body) {
    res.responseBody = body;
    return originalSend.call(this, body);
  };

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const size = res.get('Content-Length') || 0;
    
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      responseSize: size,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
    
    if (res.statusCode >= 400) {
      let responseBody = res.responseBody;
      
      // Parse JSON response if it's a string
      if (typeof responseBody === 'string' && responseBody.startsWith('{')) {
        try {
          responseBody = JSON.parse(responseBody);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      
      logger.error('HTTP Error Response', {
        ...logData,
        errorResponse: responseBody
      });
    } else {
      logger.info('HTTP Response', logData);
    }
  });

  next();
};

// Create logs directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = {
  logger,
  httpLogger
};