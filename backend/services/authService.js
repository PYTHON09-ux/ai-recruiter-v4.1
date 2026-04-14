const User = require('../models/User.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Newly created user object
   */
  async register(userData) {
    try {
      // Check if email already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        const error = new Error('Email already in use');
        error.statusCode = 409;
        throw error;
      }
      
      // Combine firstName and lastName into name for the User model
      const fullName = `${userData.firstName} ${userData.lastName}`.trim();
      
      // Create new user
      const user = new User({
        name: fullName,
        email: userData.email.toLowerCase(),
        role: userData.role,
        passwordHash: userData.password, // Will be hashed by pre-save middleware
        profileData: userData.profileData || {}
      });
      
      await user.save();
      
      // Generate tokens
      const tokens = this.generateTokens(user);
      
      // Save refresh token
      await user.addRefreshToken(tokens.refreshToken);
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      return {
        user: user.toJSON(),
        ...tokens
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Login a user with email and password
   * @param {Object} credentials - User login credentials
   * @returns {Promise<Object>} User object and auth tokens
   */
  async login(credentials) {
    try {
      const user = await User.findByCredentials(credentials.email, credentials.password);
      console.log('User found for login:', user); 
      // Generate tokens
      const tokens = this.generateTokens(user);
      
      // Save refresh token
      await user.addRefreshToken(tokens.refreshToken);
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      return {
        user: user.toJSON(),
        ...tokens
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - User's refresh token
   * @returns {Promise<Object>} New token pair
   */
  async refreshToken(refreshToken, userId) {
    try {
      // Decode refresh token to get userId if not provided
      if (!userId) {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        userId = decoded.userId;
      }
      
      const user = await User.findById(userId);
      
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 401;
        throw error;
      }
      
      // Check if refresh token exists in user's refresh tokens
      const tokenExists = user.refreshTokens.some(token => token.token === refreshToken);
      
      if (!tokenExists) {
        const error = new Error('Invalid refresh token');
        error.statusCode = 401;
        throw error;
      }
      
      // Remove old refresh token
      await user.removeRefreshToken(refreshToken);
      
      // Generate new tokens
      const tokens = this.generateTokens(user);
      
      // Save new refresh token
      await user.addRefreshToken(tokens.refreshToken);
      
      return tokens;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Log out a user by invalidating their refresh token
   * @param {string} refreshToken - User's refresh token to invalidate
   * @returns {Promise<boolean>} Success status
   */
  async logout(refreshToken, userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return false;
      }
      
      // Remove refresh token
      await user.removeRefreshToken(refreshToken);
      
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate access and refresh tokens for a user
   * @param {Object} user - User object
   * @returns {Object} Access and refresh tokens
   */
  generateTokens(user) {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    return {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    };
  }
  
  /**
   * Validate a JWT token
   * @param {string} token - JWT token to validate
   * @returns {Promise<Object>} Decoded user data
   */
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.userId).select('-passwordHash -refreshTokens');
      
      if (!user || !user.isActive) {
        const error = new Error('User not found or inactive');
        error.statusCode = 401;
        throw error;
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated user
   */
  async updateProfile(userId, updates) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Handle name updates (combine firstName and lastName)
      if (updates.firstName || updates.lastName) {
        const firstName = updates.firstName || user.name.split(' ')[0] || '';
        const lastName = updates.lastName || user.name.split(' ').slice(1).join(' ') || '';
        user.name = `${firstName} ${lastName}`.trim();
      }
      
      // Handle profile data updates
      if (updates.profileData) {
        user.profileData = { ...user.profileData, ...updates.profileData };
      }
      
      // Handle individual profile fields
      if (updates.phoneNumber) {
        user.profileData.phone = updates.phoneNumber;
      }
      
      if (updates.company) {
        user.profileData.company = updates.company;
      }
      
      await user.save();
      
      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Validate current password
      const isMatch = await user.validatePassword(currentPassword);
      
      if (!isMatch) {
        const error = new Error('Current password is incorrect');
        error.statusCode = 401;
        throw error;
      }
      
      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Invalidate all refresh tokens
      user.refreshTokens = [];
      
      await user.save();
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Forgot password - generate reset token
   * @param {string} email - User email
   * @returns {Promise<boolean>} Success status
   */
  async forgotPassword(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        // Don't reveal if email exists or not
        return true;
      }
      
      // Generate reset token (implement email sending logic here)
      const resetToken = jwt.sign(
        { userId: user._id, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // TODO: Send email with reset token
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset password using token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async resetPassword(token, newPassword) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'password_reset') {
        const error = new Error('Invalid reset token');
        error.statusCode = 401;
        throw error;
      }
      
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Invalidate all refresh tokens
      user.refreshTokens = [];
      
      await user.save();
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify email using token
   * @param {string} token - Verification token
   * @returns {Promise<boolean>} Success status
   */
  async verifyEmail(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      
      user.isEmailVerified = true;
      await user.save();
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resend verification email
   * @param {string} email - User email
   * @returns {Promise<boolean>} Success status
   */
  async resendVerificationEmail(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      
      if (user.isEmailVerified) {
        const error = new Error('Email already verified');
        error.statusCode = 400;
        throw error;
      }
      
      // Generate verification token
      const verificationToken = jwt.sign(
        { userId: user._id, type: 'email_verification' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // TODO: Send verification email
      console.log(`Email verification token for ${email}: ${verificationToken}`);
      
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();