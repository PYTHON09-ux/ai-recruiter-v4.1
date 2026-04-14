const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // Support both name and firstName/lastName for compatibility
  name: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  firstName: {
    type: String,
    trim: true,
    minlength: 1,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    minlength: 1,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    required: true,
    enum: ['recruiter', 'candidate'],
    default: 'candidate'
  },
  profileData: {
    phoneNumber: String,
    company: String,
    industry: String,
    website: String,
    position: String,
    experience: Number,
    skills: [String],
    resume: String,
    profilePicture: String,
    bio: String,
    education: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800 // 7 days
    }
  }],
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for full name - combines firstName and lastName or returns name
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.name || '';
});

// Pre-save middleware to handle name/firstName/lastName compatibility
userSchema.pre('save', function(next) {
  // If firstName and lastName are provided but name is not, combine them
  if (this.firstName && this.lastName && !this.name) {
    this.name = `${this.firstName} ${this.lastName}`;
  }
  // If name is provided but firstName/lastName are not, split them
  else if (this.name && !this.firstName && !this.lastName) {
    const nameParts = this.name.trim().split(' ');
    this.firstName = nameParts[0];
    this.lastName = nameParts.slice(1).join(' ') || '';
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
  next();
});

// Generate access token
userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { 
      userId: this._id,
      name: this.fullName,
      email: this.email,
      role: this.role,
      profileData: this.profileData,
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      issuer: process.env.JWT_ISSUER || 'ai-recruiter-platform'
    }
  );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { 
      userId: this._id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: process.env.JWT_ISSUER || 'ai-recruiter-platform'
    }
  );
};

// Validate password
userSchema.methods.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// Add refresh token
userSchema.methods.addRefreshToken = async function(token) {
  this.refreshTokens.push({ token });
  await this.save();
};

// Remove refresh token
userSchema.methods.removeRefreshToken = async function(token) {
  this.refreshTokens = this.refreshTokens.filter(t => t.token !== token);
  await this.save();
};

// Static method to find user by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }
  
  const isMatch = await user.validatePassword(password);
  
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }
  
  if (!user.isActive) {
    const error = new Error('Account is deactivated');
    error.statusCode = 401;
    throw error;
  }
  
  return user;
};

// Transform output
userSchema.methods.toJSON = function() {
  const user = this.toObject({ virtuals: true });
  delete user.passwordHash;
  delete user.refreshTokens;
  return user;
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: 1 });

module.exports = mongoose.model('User', userSchema);