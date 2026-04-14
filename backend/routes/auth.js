const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const { auth, optionalAuth } = require('../middleware/auth');
const { authValidations, sanitizeInput } = require('../middleware/validation');
const { uploadProfilePicture, cloudinary } = require('../config/cloudinary');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Register a new user
router.post('/register', authValidations.register, async (req, res, next) => {
  try {
    const userData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      profileData: req.body.profileData || {}
    };

    console.log(userData);

    const result = await AuthService.register(userData);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', authValidations.login, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login({ email, password });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const result = await AuthService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', auth, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    await AuthService.logout(refreshToken, req.userId);

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', auth, async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', auth, async (req, res, next) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'phoneNumber', 'profileData', 'company'];
    const updates = {};
    
    // Only allow specific fields to be updated
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedUser = await AuthService.updateProfile(req.userId, updates);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

//user pfofile picture upload
router.post(
  '/profile/picture',
  auth,
  uploadProfilePicture.single('profilePicture'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided' });
      }
 
      const user = await require('../models/User').findById(req.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
 
      // ── Delete OLD photo from Cloudinary before saving the new one ──────────
      const oldPicture = user.profileData?.profilePicture;
      if (oldPicture) {
        try {
          // Extract the public_id from the Cloudinary URL.
          // URL shape: https://res.cloudinary.com/<cloud>/image/upload/v123/<folder>/<public_id>.<ext>
          // We need everything after /upload/v.../  without the extension.
          const urlParts = oldPicture.split('/');
          const uploadIndex = urlParts.indexOf('upload');
          if (uploadIndex !== -1) {
            // Skip the version segment (v1234567890) then join the rest
            const afterUpload = urlParts.slice(uploadIndex + 1);
            // Remove leading version token like "v1234567890"
            const withoutVersion = afterUpload[0]?.match(/^v\d+$/)
              ? afterUpload.slice(1)
              : afterUpload;
            // Remove file extension
            const withoutExt = withoutVersion.join('/').replace(/\.[^/.]+$/, '');
            await cloudinary.uploader.destroy(withoutExt, { resource_type: 'image' });
          }
        } catch (deleteErr) {
          // Log but don't fail the upload — new photo already uploaded by multer
          console.warn('Could not delete old profile picture from Cloudinary:', deleteErr.message);
        }
      }
 
      // ── Save new Cloudinary URL to user's profileData ──────────────────────
      // req.file.path is the Cloudinary URL set by multer-storage-cloudinary
      const newUrl = req.file.path;
 
      if (!user.profileData) user.profileData = {};
      user.profileData.profilePicture = newUrl;
      user.markModified('profileData'); // needed for nested object changes in Mongoose
      await user.save();
 
      return res.status(200).json({
        success: true,
        message: 'Profile picture updated successfully',
        data: { profilePicture: newUrl },
      });
    } catch (error) {
      next(error);
    }
  }
);
 
// ── Delete profile picture ────────────────────────────────────────────────────
// DELETE /auth/profile/picture
router.delete('/profile/picture', auth, async (req, res, next) => {
  try {
    const user = await require('../models/User').findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
 
    const currentPicture = user.profileData?.profilePicture;
    if (!currentPicture) {
      return res.status(400).json({ success: false, message: 'No profile picture to delete' });
    }
 
    // ── Delete from Cloudinary ────────────────────────────────────────────────
    try {
      const urlParts     = currentPicture.split('/');
      const uploadIndex  = urlParts.indexOf('upload');
      if (uploadIndex !== -1) {
        const afterUpload  = urlParts.slice(uploadIndex + 1);
        const withoutVer   = afterUpload[0]?.match(/^v\d+$/) ? afterUpload.slice(1) : afterUpload;
        const publicId     = withoutVer.join('/').replace(/\.[^/.]+$/, '');
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      }
    } catch (deleteErr) {
      console.warn('Cloudinary delete warning:', deleteErr.message);
      // Still clear the DB field even if Cloudinary deletion fails
    }
 
    // ── Clear from DB ─────────────────────────────────────────────────────────
    user.profileData.profilePicture = null;
    user.markModified('profileData');
    await user.save();
 
    return res.status(200).json({
      success: true,
      message: 'Profile picture removed successfully',
    });
  } catch (error) {
    next(error);
  }
});


// Change password
router.post('/change-password', auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    await AuthService.changePassword(req.userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Forgot password
router.post('/forgot-password', authValidations.forgotPassword, async (req, res, next) => {
  try {
    const { email } = req.body;
    await AuthService.forgotPassword(email);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent if account exists'
    });
  } catch (error) {
    next(error);
  }
});

// Reset password
router.post('/reset-password', authValidations.resetPassword, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await AuthService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Verify email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    await AuthService.verifyEmail(token);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Resend verification email
router.post('/resend-verification', auth, async (req, res, next) => {
  try {
    await AuthService.resendVerificationEmail(req.user.email);

    res.status(200).json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;