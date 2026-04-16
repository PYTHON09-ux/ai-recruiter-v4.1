const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 5000
  },
  requirements: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 2000
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  jobType: {
    type: String,
    required: true,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
    default: 'full-time'
  },
  experienceLevel: {
    type: String,
    required: true,
    enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    default: 'mid'
  },
  salaryRange: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  skills: [{
    type: String,
    trim: true
  }],
  benefits: [{
    type: String,
    trim: true
  }],
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  company: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    logo: {
      type: String,
      default: null
    },
    website: {
      type: String,
      default: null
    },
    industry: {
      type: String,
      default: null
    }
  },

  interviewDuration: {
    type: Number,
    default: null
  },

  applicationDeadline: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'archived'],
    default: 'active'
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  interviewQuestions: [{
    question: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['technical', 'behavioral', 'situational', 'general', 'cultural'],
      default: 'technical'
    }
  }]
}, {
  timestamps: true
});

// Indexes
jobSchema.index({ recruiterId: 1 });
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ location: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ experienceLevel: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ isActive: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ createdAt: -1 });

// Virtual for applications
jobSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'jobId'
});

// Increment application count
jobSchema.methods.incrementApplicationCount = async function () {
  this.applicationCount += 1;
  await this.save();
};

// Increment view count
jobSchema.methods.incrementViewCount = async function (userId) {
  if (!userId) return;

  const alreadyViewed = this.viewedBy.includes(userId);

  if (!alreadyViewed) {
    this.viewCount += 1;
    this.viewedBy.push(userId);
    await this.save();
  }
};

// Check if job is active
jobSchema.methods.checkIsActive = function () {
  console.log(this.isActive, this.status, this.applicationDeadline, new Date());
  console.log(this.isActive && this.status === 'active' && new Date() <= this.applicationDeadline);
  return this.isActive && (this.status === 'active') && new Date() <= this.applicationDeadline;
};

// Static method to find active jobs with filters
jobSchema.statics.findActiveJobs = async function (filters = {}) {
  const query = {
    isActive: true,
    status: 'active',
    applicationDeadline: { $gte: new Date() }
  };

  if (filters.location) {
    query.location = new RegExp(filters.location, 'i');
  }

  if (filters.jobType) {
    query.jobType = filters.jobType;
  }

  if (filters.experienceLevel) {
    query.experienceLevel = filters.experienceLevel;
  }

  if (filters.skills && filters.skills.length > 0) {
    query.skills = { $in: filters.skills };
  }

  if (filters.salaryMin) {
    query['salaryRange.min'] = { $gte: filters.salaryMin };
  }

  if (filters.salaryMax) {
    query['salaryRange.max'] = { $lte: filters.salaryMax };
  }

  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  return this.find(query)
    .populate('recruiterId', 'name profileData.company')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Job', jobSchema);