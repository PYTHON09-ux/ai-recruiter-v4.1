const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { checkProfileCompletion } = require('../middleware/profileCompletion');
const { sanitizeInput } = require('../middleware/validation');
const multer = require('multer');
const path = require('path');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/profiles';

    // Create directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.userId}-${uniqueSuffix}${ext}`);
  }
});

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Only JPEG, PNG, and JPG images are allowed'), false);
//   }
// };

const upload = multer({
  storage,
  // fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 2MB limit for profile pictures
  }
});

// Get current user profile with completion status
router.get('/me', auth, checkProfileCompletion, async (req, res, next) => {
  try {

    const user = await User.findById(req.userId).select('-passwordHash -refreshTokens');
    console.log('Fetched user profile:', user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...user.toJSON(),
        profileComplete: req.profileComplete,
        missingFields: req.missingFields || []
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/me', auth, upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'profilePicture', maxCount: 1 }
]),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);

      // console.log(req.body.firstName);   // "Pavan"
      // console.log(req.body.lastName);    // "Patane"

      // // files → inside req.files
      // console.log(req.files.resume[0]);        // resume file metadata
      // console.log(req.files.profilePicture[0]);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update basic fields
      const allowedFields = ['name'];
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          user[field] = req.body[field];
        }
      });

      // Update profile data
      const profileFields = [
        'phoneNumber', 'company', 'industry', 'website', 'position',
        'experience', 'skills', 'resume', 'bio'
      ];

      if (!user.profileData) {
        user.profileData = {};
      }

      profileFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'skills' && typeof req.body[field] === 'string') {
            // Parse skills if sent as comma-separated string
            user.profileData[field] = req.body[field].split(',').map(s => s.trim()).filter(s => s);
          } else if (field === 'experience' && req.body[field]) {
            user.profileData[field] = parseInt(req.body[field]);
          } else {
            user.profileData[field] = req.body[field];
          }
        }
      });

      // Handle profile picture upload
      if (req.files.profilePicture) {
        user.profileData.profilePicture = `/uploads/profiles/${req.files.profilePicture[0].filename}`;
      }

      // Handle resume upload
      if (req.files.resume) {
        user.profileData.resume = `/uploads/profiles/${req.files.resume[0].filename}`;
      }

      await user.save();

      // Check profile completion after update
      const requiredFields = {
        name: user.name,
        email: user.email,
        phoneNumber: user.profileData?.phoneNumber,
        resume: user.profileData?.resume,
        skills: user.profileData?.skills,
        experience: user.profileData?.experience
      };

      const missingFields = [];
      Object.entries(requiredFields).forEach(([field, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          missingFields.push(field);
        }
      });

      const profileComplete = missingFields.length === 0;

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          ...user.toJSON(),
          profileComplete,
          missingFields
        }
      });
    } catch (error) {
      next(error);
    }
  });

// Get profile completion status
router.get('/completion-status', auth, checkProfileCompletion, async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        profileComplete: req.profileComplete,
        missingFields: req.missingFields || [],
        role: req.user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user profile by ID (for recruiters to view candidate profiles)
router.get('/:userId', auth, async (req, res, next) => {
  try {
    // Only recruiters can view other user profiles
    if (req.user.role !== 'recruiter' && req.userId !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own profile.'
      });
    }

    const user = await User.findById(req.params.userId).select('-passwordHash -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;