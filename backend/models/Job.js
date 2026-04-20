const mongoose = require('mongoose');

// ─── Status machine — single source of truth ──────────────────────────────────
const VALID_TRANSITIONS = {
  draft:    ['active'],
  active:   ['paused', 'closed'],
  paused:   ['active', 'closed'],
  closed:   ['archived'],
  archived: [],
};

const STATUS_PERMISSIONS = {
  draft:    { canEdit: true,  canApply: false, visibleToCandidate: false },
  active:   { canEdit: true,  canApply: true,  visibleToCandidate: true  },
  paused:   { canEdit: true,  canApply: false, visibleToCandidate: false },
  closed:   { canEdit: false, canApply: false, visibleToCandidate: false },
  archived: { canEdit: false, canApply: false, visibleToCandidate: false },
};

// ─── Status history sub-schema ────────────────────────────────────────────────
const statusHistorySchema = new mongoose.Schema(
  {
    from:      { type: String, enum: [...Object.keys(VALID_TRANSITIONS), null] },
    to:        { type: String, enum: Object.keys(VALID_TRANSITIONS), required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason:    { type: String, maxlength: 500, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────
const jobSchema = new mongoose.Schema({

  // ── Core fields (unchanged from your original) ──────────────────────────
  title: {
    type:      String,
    required:  true,
    trim:      true,
    minlength: 2,
    maxlength: 200,
  },
  description: {
    type:      String,
    required:  true,
    minlength: 10,
    maxlength: 5000,
  },
  requirements: {
    type:      String,
    required:  true,
    minlength: 10,
    maxlength: 2000,
  },
  location: {
    type:     String,
    required: true,
    trim:     true,
  },
  jobType: {
    type:     String,
    required: true,
    enum:     ['full-time', 'part-time', 'contract', 'internship', 'remote'],
    default:  'full-time',
  },
  experienceLevel: {
    type:     String,
    required: true,
    enum:     ['entry', 'mid', 'senior', 'lead', 'executive'],
    default:  'mid',
  },
  salaryRange: {
    min:      { type: Number, min: 0 },
    max:      { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },
  },
  skills:   [{ type: String, trim: true }],
  benefits: [{ type: String, trim: true }],

  recruiterId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  company: {
    name:     { type: String, required: true, trim: true },
    logo:     { type: String, default: null },
    website:  { type: String, default: null },
    industry: { type: String, default: null },
  },

  interviewDuration: {
    type:    Number,
    default: null,
  },

  applicationDeadline: {
    type:     Date,
    required: true,
  },

  // ── REMOVED: isActive — fully replaced by status field below ─────────────
  // isActive: { type: Boolean, default: true }   ← DELETE this from your DB docs too
  //   Run migration script at bottom of this file once to clean existing docs.

  // ── Status (upgraded) ────────────────────────────────────────────────────
  status: {
    type:    String,
    enum:    Object.keys(VALID_TRANSITIONS),
    default: 'active',
    index:   true,
  },

  // ── Transition timestamps (new) ───────────────────────────────────────────
  publishedAt: { type: Date, default: null },
  pausedAt:    { type: Date, default: null },
  closedAt:    { type: Date, default: null },
  archivedAt:  { type: Date, default: null },

  // ── Audit trail (new) — excluded from all queries by default ─────────────
  statusHistory: {
    type:    [statusHistorySchema],
    default: [],
    select:  false,
  },

  // ── Counters (unchanged) ──────────────────────────────────────────────────
  applicationCount: { type: Number, default: 0 },
  viewCount:        { type: Number, default: 0 },

  // ── Interview questions (unchanged) ───────────────────────────────────────
  interviewQuestions: [{
    question: { type: String, required: true },
    type: {
      type:    String,
      enum:    ['technical', 'behavioral', 'situational', 'general', 'cultural'],
      default: 'technical',
    },
  }],

}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Kept all your originals + added compound index for findActiveJobs performance
jobSchema.index({ recruiterId: 1 });
jobSchema.index({ title: 'text', description: 'text' });  // full-text search
jobSchema.index({ location: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ experienceLevel: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ createdAt: -1 });
// REMOVED: jobSchema.index({ isActive: 1 }) — field no longer exists
// NEW: compound index — the most-used query path for candidate job board
jobSchema.index({ status: 1, applicationDeadline: 1 });
// NEW: recruiter dashboard filter
jobSchema.index({ recruiterId: 1, status: 1 });

// ─── Virtual ──────────────────────────────────────────────────────────────────
jobSchema.virtual('applications', {
  ref:         'Application',
  localField:  '_id',
  foreignField: 'jobId',
});

// ─────────────────────────────────────────────────────────────────────────────
// Instance methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * incrementApplicationCount — unchanged from original
 */
jobSchema.methods.incrementApplicationCount = async function () {
  this.applicationCount += 1;
  await this.save();
};

/**
 * incrementViewCount — unchanged from original
 */
jobSchema.methods.incrementViewCount = async function () {
  this.viewCount += 1;
  await this.save();
};

/**
 * checkIsActive — UPDATED
 * Old version checked `this.isActive && status === 'active' && deadline`.
 * New version drops the removed `isActive` field — logic is identical otherwise.
 */
jobSchema.methods.checkIsActive = function () {
  const withinDeadline = !this.applicationDeadline || new Date() <= this.applicationDeadline;
  return this.status === 'active' && withinDeadline;
};

/**
 * isOpen — NEW (alias of checkIsActive, cleaner name for new code)
 * Returns true only when status is 'active' AND deadline has not passed.
 */
jobSchema.methods.isOpen = function () {
  return this.checkIsActive();
};

/**
 * canApply — NEW
 * Whether a candidate can submit an application right now.
 */
jobSchema.methods.canApply = function () {
  return this.isOpen();
};

/**
 * canEdit — NEW
 * Whether a recruiter can still edit this posting.
 */
jobSchema.methods.canEdit = function () {
  return STATUS_PERMISSIONS[this.status]?.canEdit ?? false;
};

/**
 * isVisibleToCandidate — NEW
 * Whether the job appears in candidate search results.
 */
jobSchema.methods.isVisibleToCandidate = function () {
  return STATUS_PERMISSIONS[this.status]?.visibleToCandidate ?? false;
};

/**
 * transitionTo(newStatus, recruiterId, reason?) — NEW
 *
 * Core state-machine engine. Called by jobLifecycleService — never called
 * directly from a route handler.
 *
 * Validates the transition against VALID_TRANSITIONS, records the history
 * entry, sets the correct timestamp field, then updates this.status.
 * Caller MUST call job.save() after this.
 *
 * Throws 409 Conflict for invalid transitions.
 */
jobSchema.methods.transitionTo = function (newStatus, recruiterId, reason = '') {
  const allowed = VALID_TRANSITIONS[this.status];

  if (!allowed) {
    const err = new Error(`Unknown current status: "${this.status}"`);
    err.statusCode = 500;
    throw err;
  }

  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Cannot transition job from "${this.status}" to "${newStatus}". ` +
      `Allowed next states: [${allowed.join(', ') || 'none — terminal state'}]`
    );
    err.statusCode = 409;
    throw err;
  }

  // Append audit entry (statusHistory is select:false — already loaded by
  // fetchOwnedJob in jobLifecycleService via .select('+statusHistory'))
  this.statusHistory.push({
    from:      this.status,
    to:        newStatus,
    changedBy: recruiterId,
    reason,
  });

  // Set transition timestamp
  const now = new Date();
  if (newStatus === 'active'   && !this.publishedAt) this.publishedAt = now;
  if (newStatus === 'paused')   this.pausedAt   = now;
  if (newStatus === 'closed')   this.closedAt   = now;
  if (newStatus === 'archived') this.archivedAt = now;

  this.status = newStatus;
  // Caller does: await job.save()
};

// ─────────────────────────────────────────────────────────────────────────────
// Static methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * findActiveJobs — UPDATED
 *
 * Removed `isActive: true` from query (field no longer exists).
 * Added $or for null/missing deadline so jobs without a deadline still show.
 * Kept all your original filter params.
 */
jobSchema.statics.findActiveJobs = async function (filters = {}) {
  const query = {
    status: 'active',
    // Accept jobs with a future deadline, no deadline, or deadline field absent
    $or: [
      { applicationDeadline: { $gte: new Date() } },
      { applicationDeadline: null },
      { applicationDeadline: { $exists: false } },
    ],
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
    // Uses the { title: 'text', description: 'text' } index defined above
    query.$text = { $search: filters.search };
  }

  return this.find(query)
    .populate('recruiterId', 'name profileData.company')
    .sort({ createdAt: -1 });
};

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
module.exports = mongoose.model('Job', jobSchema);

// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME MIGRATION SCRIPT
// Run this ONCE against your database to remove the old `isActive` field from
// all existing documents. Safe to run on a live DB — updateMany is atomic.
//
  // node -e "
  //   require('dotenv').config();
  //   const mongoose = require('mongoose');
  //   mongoose.connect(process.env.MONGO_URI).then(async () => {
  //     const Job = require('./models/Job');
  //     // Jobs that were isActive:true → keep them active
  //     await Job.updateMany({ isActive: true,  status: { \$exists: false } }, { \$set: { status: 'active'  }, \$unset: { isActive: '' } });
  //     // Jobs that were isActive:false → mark closed
  //     await Job.updateMany({ isActive: false, status: { \$exists: false } }, { \$set: { status: 'closed'  }, \$unset: { isActive: '' } });
  //     // Strip isActive from every remaining doc
  //     await Job.updateMany({}, { \$unset: { isActive: '' } });
  //     console.log('Migration complete'); process.exit(0);
  //   });

// ─────────────────────────────────────────────────────────────────────────────