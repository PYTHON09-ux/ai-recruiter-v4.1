const User = require('../models/User');

/**
 * Middleware to check if candidate has completed their profile
 * Required fields: name, email, profileData.phoneNumber, profileData.resume, 
 * profileData.skills (at least 1), profileData.experience
 */
const requireCompleteProfile = async (req, res, next) => {
  try {
    // Only apply to candidates
    if (req.user.role !== 'candidate') {
      return next();
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check required profile fields
    const requiredFields = {
      name: user.name,
      email: user.email,
      phoneNumber: user.profileData?.phoneNumber,
      // resume: user.profileData?.resume,
      skills: user.profileData?.skills,
      experience: user.profileData?.experience
    };

    const missingFields = [];
    
    // Check each required field
    Object.entries(requiredFields).forEach(([field, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Profile incomplete. Please complete your profile before applying to jobs.',
        missingFields,
        profileComplete: false
      });
    }

    // Profile is complete
    req.profileComplete = true;
    next();
  } catch (error) {
    console.error('Profile completion check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking profile completion'
    });
  }
};

/**
 * Check profile completion status without blocking the request
 */
const checkProfileCompletion = async (req, res, next) => {
  try {
    if (req.user.role !== 'candidate') {
      req.profileComplete = true;
      return next();
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      req.profileComplete = false;
      return next();
    }

    // Check required profile fields
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

    req.profileComplete = missingFields.length === 0;
    req.missingFields = missingFields;
    
    next();
  } catch (error) {
    console.error('Profile completion check error:', error);
    req.profileComplete = false;
    next();
  }
};

module.exports = {
  requireCompleteProfile,
  checkProfileCompletion
};