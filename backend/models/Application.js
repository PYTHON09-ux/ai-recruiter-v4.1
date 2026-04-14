const mongoose = require('mongoose');
const crypto = require('crypto');

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'interview_scheduled', 'interview_completed', 'hired', 'rejected'],
    default: 'pending'
  },
  coverLetter: {
    type: String,
    maxlength: 2000
  },
  resume: {
    filename: String,
    url: String,
    uploadedAt: Date
  },
  customResponses: [{
    question: String,
    answer: String
  }],
  interviewLink: {
    token: {
      type: String,
      unique: true,
      sparse: true
    },
    expiresAt: Date,
    isUsed: {
      type: Boolean,
      default: false
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    generatedAt: Date
  },
  notes: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  timeline: [{
    status: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }]
}, {
  timestamps: true
});

// Compound indexes
applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
applicationSchema.index({ candidateId: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ createdAt: -1 });
applicationSchema.index({ 'interviewLink.token': 1 });

// Generate secure magic link token
applicationSchema.methods.generateMagicLink = function(expirationHours = 24) {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.interviewLink = {
    token,
    expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000),
    isUsed: false,
    generatedAt: new Date()
  };
  
  return token;
};

// Check if magic link is valid
applicationSchema.methods.isValidMagicLink = function(token) {
  if (!this.interviewLink || this.interviewLink.token !== token) {
    return false;
  }
  
  if (this.interviewLink.isUsed) {
    return false;
  }
  
  if (new Date() > this.interviewLink.expiresAt) {
    return false;
  }
  
  return true;
};

// Validate magic link with detailed response
applicationSchema.methods.validateMagicLink = function(token) {
  if (!this.interviewLink || this.interviewLink.token !== token) {
    return { valid: false, reason: 'Invalid token' };
  }
  
  if (this.interviewLink.isUsed) {
    return { valid: false, reason: 'Link already used' };
  }
  
  if (new Date() > this.interviewLink.expiresAt) {
    return { valid: false, reason: 'Link expired' };
  }
  
  return { valid: true };
};

// Use magic link
applicationSchema.methods.useMagicLink = async function() {
  if (this.interviewLink) {
    this.interviewLink.isUsed = true;
    await this.save();
  }
};

// Update status with timeline
applicationSchema.methods.updateStatus = function(newStatus, updatedBy, notes = '') {
  this.status = newStatus;
  
  this.timeline.push({
    status: newStatus,
    updatedBy,
    notes
  });
};

// Add note
applicationSchema.methods.addNote = function(content, author) {
  this.notes.push({
    content,
    author
  });
};

// Virtual for interview
applicationSchema.virtual('interview', {
  ref: 'Interview',
  localField: '_id',
  foreignField: 'applicationId',
  justOne: true
});

module.exports = mongoose.model('Application', applicationSchema);