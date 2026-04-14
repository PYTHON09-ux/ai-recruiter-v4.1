const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    unique: true
  },
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
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
      enum: ['ready', 'scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  startedAt: Date,
  completedAt: Date,
  duration: {
    type: Number, // in seconds
    default: 0
  },
  questions: [{
    id: {
      type: String,
      required: true
    },
    question: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['technical', 'behavioral', 'situational','general', 'cultural'],
      required: true
    },
    expectedDuration: Number,
    askedAt: Date,
    order: Number
  }],
  responses: [{
    questionId: {
      type: String,
      required: true
    },
    audioUrl: String,
    transcription: String,
    duration: Number, // in seconds
    submittedAt: {
      type: Date,
      default: Date.now
    },
    retryCount: {
      type: Number,
      default: 0
    }
  }],
  evaluation: {
    overallScore: {
      type: Number,
      min: 0,
      max: 100
    },
    scores: [{
      category: {
        type: String,
        required: true
      },
      score: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },
      feedback: String
    }],
    strengths: [String],
    improvements: [String],
    recommendation: {
      type: String,
      enum: ['hire', 'maybe', 'reject'],
    },
    summary: String,
    evaluatedAt: Date,
    evaluatedBy: String // 'ai' or userId
  },
  technicalMetadata: {
    browserInfo: String,
    deviceInfo: String,
    connectionQuality: String,
    audioQuality: Number,
    interruptionCount: Number,
    avgResponseTime: Number
  },
  aiMetadata: {
    model: String,
    version: String,
    processingTime: Number,
    confidenceScore: Number,
    errors: [String]
  }
}, {
  timestamps: true
});

// Indexes
interviewSchema.index({ applicationId: 1 });
interviewSchema.index({ candidateId: 1 });
interviewSchema.index({ jobId: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ createdAt: -1 });
interviewSchema.index({ 'evaluation.overallScore': -1 });

// Start interview
interviewSchema.methods.start = function() {
  this.status = 'in_progress';
  this.startedAt = new Date();
};

// Start interview (alias)
interviewSchema.methods.startInterview = function() {
  this.start();
};

// Complete interview
interviewSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  
  if (this.startedAt) {
    this.duration = Math.floor((this.completedAt - this.startedAt) / 1000);
  }
};

// Complete interview (alias)
interviewSchema.methods.completeInterview = function() {
  this.complete();
};

// Add response
interviewSchema.methods.addResponse = function(questionId, audioUrl, transcription, duration) {
  const existingResponseIndex = this.responses.findIndex(r => r.questionId === questionId);
  
  const responseData = {
    questionId,
    audioUrl,
    transcription,
    duration,
    submittedAt: new Date(),
    retryCount: existingResponseIndex >= 0 ? this.responses[existingResponseIndex].retryCount + 1 : 0
  };
  
  if (existingResponseIndex >= 0) {
    this.responses[existingResponseIndex] = responseData;
  } else {
    this.responses.push(responseData);
  }
};

// Set evaluation
interviewSchema.methods.setEvaluation = function(evaluationData) {
  this.evaluation = {
    ...evaluationData,
    evaluatedAt: new Date(),
    evaluatedBy: 'ai'
  };
};

// Get completion percentage
interviewSchema.methods.getCompletionPercentage = function() {
  if (!this.questions || this.questions.length === 0) return 0;
  
  const answeredQuestions = this.responses.length;
  return Math.round((answeredQuestions / this.questions.length) * 100);
};

// Virtual for job details
interviewSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: '_id',
  justOne: true
});

// Virtual for candidate details
interviewSchema.virtual('candidate', {
  ref: 'User',
  localField: 'candidateId',
  foreignField: '_id',
  justOne: true
});

// Static method to find interviews by recruiter
interviewSchema.statics.findByRecruiter = async function(recruiterId, filters = {}) {
  const Job = require('./Job');
  
  // Get jobs by recruiter
  const jobs = await Job.find({ recruiterId }).select('_id');
  const jobIds = jobs.map(job => job._id);
  
  const query = { jobId: { $in: jobIds } };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.jobId) {
    query.jobId = filters.jobId;
  }
  
  if (filters.minScore) {
    query['evaluation.overallScore'] = { $gte: filters.minScore };
  }
  
  let queryBuilder = this.find(query)
    .populate({
      path: 'applicationId',
      populate: {
        path: 'candidateId',
        select: 'name email profileData'
      }
    })
    .populate('jobId', 'title')
    .sort({ completedAt: -1 });
    
  if (filters.limit) {
    queryBuilder = queryBuilder.limit(filters.limit);
  }
  
  return queryBuilder;
};

module.exports = mongoose.model('Interview', interviewSchema);