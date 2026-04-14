const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true
  },
  questionId: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  audioUrl: {
    type: String,
    required: true
  },
  transcription: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  aiEvaluation: {
    relevance: {
      type: Number,
      min: 0,
      max: 100
    },
    communicationClarity: {
      type: Number,
      min: 0,
      max: 100
    },
    technicalAccuracy: {
      type: Number,
      min: 0,
      max: 100
    },
    completeness: {
      type: Number,
      min: 0,
      max: 100
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100
    },
    strengths: [String],
    improvements: [String],
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    keywords: [String],
    feedback: String,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  metadata: {
    retryCount: {
      type: Number,
      default: 0
    },
    processingTime: Number,
    errorMessages: [String]
  }
}, {
  timestamps: true
});

// Indexes
responseSchema.index({ interviewId: 1, questionId: 1 }, { unique: true });
responseSchema.index({ interviewId: 1 });
responseSchema.index({ 'aiEvaluation.overallScore': -1 });

module.exports = mongoose.model('Response', responseSchema);