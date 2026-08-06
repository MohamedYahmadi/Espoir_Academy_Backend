import { body, param, query } from 'express-validator';

// ===================== Auth Validators =====================

export const registerValidator = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9+\-\s()]{8,20}$/)
    .withMessage('Invalid phone number format'),
];

export const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const updateProfileValidator = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]{8,20}$/)
    .withMessage('Invalid phone number format'),
  body('currentPassword')
    .optional()
    .notEmpty()
    .withMessage('Current password is required when changing password'),
  body('newPassword')
    .optional()
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

export const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
];

export const resetPasswordValidator = [
  param('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// ===================== Sport Validators =====================

export const createSportValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Sport name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Sport name must be between 2 and 100 characters'),
  body('nameLatin')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Latin name must be at most 100 characters'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('description').optional().trim(),
  body('maxCapacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max capacity must be at least 1'),
  body('minAge')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min age must be at least 1'),
  body('maxAge')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max age must be at least 1'),
  body('scheduleInfo').optional().trim(),
];

export const updateSportValidator = [
  param('id').isMongoId().withMessage('Invalid sport ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Sport name must be between 2 and 100 characters'),
  body('nameLatin')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Latin name must be at most 100 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('description').optional().trim(),
  body('maxCapacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max capacity must be at least 1'),
  body('minAge')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min age must be at least 1'),
  body('maxAge')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max age must be at least 1'),
  body('scheduleInfo').optional().trim(),
];

export const sportIdValidator = [
  param('id').isMongoId().withMessage('Invalid sport ID'),
];

// ===================== Child Validators =====================

export const createChildValidator = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Invalid date format. Use ISO8601 (YYYY-MM-DD)'),
  body('gender')
    .trim()
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['Male', 'Female'])
    .withMessage('Gender must be Male or Female'),
  body('medicalNotes').optional().trim(),
];

export const updateChildValidator = [
  param('id').isMongoId().withMessage('Invalid child ID'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format. Use ISO8601 (YYYY-MM-DD)'),
  body('gender')
    .optional()
    .trim()
    .isIn(['Male', 'Female'])
    .withMessage('Gender must be Male or Female'),
  body('medicalNotes').optional().trim(),
];

export const childIdValidator = [
  param('id').isMongoId().withMessage('Invalid child ID'),
];

// ===================== Enrollment Validators =====================

export const createEnrollmentValidator = [
  body('childId')
    .notEmpty()
    .withMessage('Child ID is required')
    .isMongoId()
    .withMessage('Invalid child ID'),
  body('sportId')
    .notEmpty()
    .withMessage('Sport ID is required')
    .isMongoId()
    .withMessage('Invalid sport ID'),
  body('parentNotes').optional().trim(),
  body('schedule').optional().isObject().withMessage('Schedule must be an object'),
  body('schedule.day')
    .optional()
    .trim()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Schedule day must be a valid day'),
  body('schedule.startTime')
    .optional()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format (24h)'),
  body('schedule.endTime')
    .optional()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format (24h)'),
];

export const enrollmentStatusValidator = [
  param('id').isMongoId().withMessage('Invalid enrollment ID'),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['APPROVED', 'REJECTED'])
    .withMessage('Status must be APPROVED or REJECTED'),
];

export const statusQueryValidator = [
  query('status')
    .optional()
    .isIn(['PENDING', 'APPROVED', 'REJECTED'])
    .withMessage('Status filter must be PENDING, APPROVED, or REJECTED'),
];

// ===================== User Management Validators =====================

export const updateUserValidator = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]{8,20}$/)
    .withMessage('Invalid phone number format'),
  body('role')
    .optional()
    .isIn(['admin', 'parent'])
    .withMessage('Role must be admin or parent'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

export const userIdValidator = [
  param('id').isMongoId().withMessage('Invalid user ID'),
];

// ===================== Payment Validators =====================

export const createPaymentValidator = [
  body('childId')
    .notEmpty()
    .withMessage('Child ID is required')
    .isMongoId()
    .withMessage('Invalid child ID'),
  body('enrollmentId')
    .notEmpty()
    .withMessage('Enrollment ID is required')
    .isMongoId()
    .withMessage('Invalid enrollment ID'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date format'),
  body('notes').optional().trim(),
];

export const updatePaymentStatusValidator = [
  param('id').isMongoId().withMessage('Invalid payment ID'),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PAID', 'UNPAID', 'PENDING'])
    .withMessage('Status must be PAID, UNPAID, or PENDING'),
];

export const paymentStatusQueryValidator = [
  query('status')
    .optional()
    .isIn(['PAID', 'UNPAID', 'PENDING'])
    .withMessage('Status filter must be PAID, UNPAID, or PENDING'),
];

// ===================== Schedule Validators =====================

export const createScheduleValidator = [
  body('sportId')
    .notEmpty()
    .withMessage('Sport ID is required')
    .isMongoId()
    .withMessage('Invalid sport ID'),
  body('dayOfWeek')
    .trim()
    .notEmpty()
    .withMessage('Day of week is required')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Day of week must be a valid day'),
  body('startTime')
    .trim()
    .notEmpty()
    .withMessage('Start time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format (24h)'),
  body('endTime')
    .trim()
    .notEmpty()
    .withMessage('End time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format (24h)'),
  body('groupName').optional().trim(),
  body('minAge')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min age must be at least 1'),
  body('maxAge')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max age must be at least 1'),
  body('maxCapacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max capacity must be at least 1'),
  body('coachName').optional().trim(),
  body('location').optional().trim(),
];

export const updateScheduleValidator = [
  param('id').isMongoId().withMessage('Invalid schedule ID'),
  body('sportId')
    .optional()
    .isMongoId()
    .withMessage('Invalid sport ID'),
  body('dayOfWeek')
    .optional()
    .trim()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Day of week must be a valid day'),
  body('startTime')
    .optional()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format (24h)'),
  body('endTime')
    .optional()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format (24h)'),
  body('groupName').optional().trim(),
  body('minAge')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min age must be at least 1'),
  body('maxAge')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max age must be at least 1'),
  body('maxCapacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max capacity must be at least 1'),
  body('coachName').optional().trim(),
  body('location').optional().trim(),
];

export const scheduleIdValidator = [
  param('id').isMongoId().withMessage('Invalid schedule ID'),
];