const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Common validation rules
const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  mongoId: param('id')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid ID format');
      }
      return true;
    }),
  
  phoneNumber: body('phoneNumber')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  url: body('url')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL')
};

// Auth validation rules
const authValidations = {
  register: [
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('First name must be between 2 and 30 characters')
      .matches(/^[a-zA-Z]+$/)
      .withMessage('First name can only contain letters'),
    
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Last name must be between 2 and 30 characters')
      .matches(/^[a-zA-Z]+$/)
      .withMessage('Last name can only contain letters'),
    
    commonValidations.email,
    commonValidations.password,
    
    body('role')
      .isIn(['recruiter', 'candidate'])
      .withMessage('Role must be either recruiter or candidate'),
    
    body('company')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Company name must be between 2 and 100 characters'),
    
    handleValidationErrors
  ],
  
  login: [
    commonValidations.email,
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ],
  
  forgotPassword: [
    commonValidations.email,
    handleValidationErrors
  ],
  
  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    commonValidations.password,
    handleValidationErrors
  ]
};

// Job validation rules - Fixed to match frontend data structure
const jobValidations = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Job title must be between 3 and 100 characters'),
    
    body('description')
      .trim()
      .isLength({ min: 50, max: 5000 })
      .withMessage('Job description must be between 50 and 5000 characters'),
    
    body('requirements')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Requirements must be between 10 and 2000 characters'),
    
    body('location')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Location must be between 2 and 100 characters'),
    
    // Fixed: jobType -> type
    body('jobType')
      .optional()
      .isIn(['full-time', 'part-time', 'contract', 'internship'])
      .withMessage('Job type must be full-time, part-time, contract, or internship'),
    
    body('type')
      .optional()
      .isIn(['full-time', 'part-time', 'contract', 'internship'])
      .withMessage('Job type must be full-time, part-time, contract, or internship'),
    
    body('experienceLevel')
      .isIn(['entry', 'mid', 'senior', 'lead'])
      .withMessage('Experience level must be entry, mid, senior, or lead'),
    
    // Fixed: Handle salaryRange object structure
    body('salaryRange')
      .optional()
      .isObject()
      .withMessage('Salary range must be an object'),
    
    body('salaryRange.min')
      .optional()
      .isNumeric()
      .withMessage('Minimum salary must be a number'),
    
    body('salaryRange.max')
      .optional()
      .isNumeric()
      .withMessage('Maximum salary must be a number'),
    
    body('salaryRange.currency')
      .optional()
      .isIn(['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'INR'])
      .withMessage('Currency must be USD, EUR, or GBP'),
    
    // Fixed: Handle skills array
    body('skills')
      .optional()
      .isArray()
      .withMessage('Skills must be an array'),
    
    body('skills.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Each skill must be between 2 and 50 characters'),
    
    // Fixed: Handle benefits array
    body('benefits')
      .optional()
      .isArray()
      .withMessage('Benefits must be an array'),
    
    body('benefits.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Each benefit must be between 2 and 100 characters'),
    
    // Fixed: Handle company object structure
    body('company.name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Company name must be between 2 and 100 characters'),
    
    body('company.website')
      .optional()
      .isURL()
      .withMessage('Company website must be a valid URL'),
    
    body('company.industry')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Industry must be between 2 and 50 characters'),
    
    // Fixed: Handle applicationDeadline
    body('applicationDeadline')
      .isISO8601()
      .toDate()
      .withMessage('Please provide a valid application deadline')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Application deadline must be in the future');
        }
        return true;
      }),

      body('interviewDuration')
      .optional()
      .isNumeric()
      .withMessage('Interview duration must be a number representing minutes'),
    
    // Fixed: Handle interviewQuestions array
    body('interviewQuestions')
      .optional()
      .isArray()
      .withMessage('Interview questions must be an array'),
    
    body('interviewQuestions.*.question')
      .optional()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Each interview question must be between 10 and 500 characters'),
    
    body('interviewQuestions.*.type')
      .optional()
      .isIn(['technical', 'behavioral', 'situational' , 'general', 'cultural'])
      .withMessage('Question type must be technical, behavioral, or situational'),
    
    handleValidationErrors
  ],
  
  update: [
    commonValidations.mongoId,
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Job title must be between 3 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ min: 50, max: 5000 })
      .withMessage('Job description must be between 50 and 5000 characters'),
    
    handleValidationErrors
  ]
};

// Application validation rules
const applicationValidations = {
  create: [
    body('jobId')
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid job ID format');
        }
        return true;
      }),
    
    body('coverLetter')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Cover letter must not exceed 2000 characters'),

      // body('resume')
      // .optional()
      // .trim()
      // .isLength({ max: 2000 })
      // .withMessage('Resume must not exceed 2000 characters'),

    handleValidationErrors
  ],
  
  updateStatus: [
    commonValidations.mongoId,
    body('status')
      .isIn(['pending', 'reviewing', 'interview_scheduled', 'interview_completed', 'rejected', 'hired'])
      .withMessage('Invalid application status'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes must not exceed 1000 characters'),
    
    handleValidationErrors
  ]
};

// Interview validation rules
const interviewValidations = {
  create: [
    body('applicationId')
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid application ID format');
        }
        return true;
      }),
    
    body('scheduledAt')
    .optional()
      .isISO8601()
      .toDate()
      .withMessage('Please provide a valid date and time for the interview')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Interview must be scheduled for a future date');
        }
        return true;
      }),
    
    body('type')
    .optional()
      .isIn(['phone', 'video', 'in-person', 'ai'])
      .withMessage('Interview type must be phone, video, in-person, or ai'),
    
    body('duration')
      .optional()
      .isInt({ min: 15, max: 180 })
      .withMessage('Interview duration must be between 15 and 180 minutes'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes must not exceed 1000 characters'),
    
    handleValidationErrors
  ]
};

// Query parameter validations
const queryValidations = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    handleValidationErrors
  ],
  
  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    
    handleValidationErrors
  ]
};

// File upload validations
const fileValidations = {
  resume: [
    body('file')
      .custom((value, { req }) => {
        if (!req.file) {
          throw new Error('Resume file is required');
        }
        
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(req.file.mimetype)) {
          throw new Error('Only PDF and Word documents are allowed');
        }
        
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSize) {
          throw new Error('File size must not exceed 5MB');
        }
        
        return true;
      }),
    
    handleValidationErrors
  ]
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential script tags or dangerous HTML
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        } else {
          obj[key] = sanitizeValue(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

module.exports = {
  handleValidationErrors,
  commonValidations,
  authValidations,
  jobValidations,
  applicationValidations,
  interviewValidations,
  queryValidations,
  fileValidations,
  sanitizeInput
};