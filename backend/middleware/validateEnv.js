const { logger } = require('./logger');

const validateEnv = () => {
  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error('Environment Validation Failed', { 
      missingVariables: missingVars,
      error: errorMessage 
    });
    throw new Error(errorMessage);
  }

  // Validate JWT secrets are strong enough
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    const warningMessage = 'JWT_SECRET should be at least 32 characters long for security';
    logger.warn('Weak JWT Secret', { message: warningMessage });
  }

  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    const warningMessage = 'JWT_REFRESH_SECRET should be at least 32 characters long for security';
    logger.warn('Weak JWT Refresh Secret', { message: warningMessage });
  }

  // Validate MongoDB URI format
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
    const errorMessage = 'MONGODB_URI must be a valid MongoDB connection string';
    logger.error('Invalid MongoDB URI', { error: errorMessage });
    throw new Error(errorMessage);
  }

  // Log successful validation
  logger.info('Environment validation passed', {
    requiredVariables: requiredVars,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
};

module.exports = validateEnv;