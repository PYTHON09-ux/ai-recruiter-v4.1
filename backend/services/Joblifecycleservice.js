// ─────────────────────────────────────────────────────────────────────────────
// services/jobLifecycleService.js
// Handles all status transitions. Keeps jobService.js focused on CRUD.
// ─────────────────────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
const Job       = require('../models/Job');

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Validate a MongoDB ObjectId and throw a structured 400 if invalid.
 */
function assertValidId(id, label = 'ID') {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${label}: ${id}`);
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Fetch a job and verify recruiter ownership in one shot.
 * Includes statusHistory so transitionTo() can push to it.
 */
async function fetchOwnedJob(jobId, recruiterId) {
  assertValidId(jobId,      'job ID');
  assertValidId(recruiterId,'recruiter ID');

  const job = await Job.findById(jobId).select('+statusHistory');

  if (!job) {
    const err = new Error('Job not found');
    err.statusCode = 404;
    throw err;
  }

  if (job.recruiterId.toString() !== recruiterId.toString()) {
    const err = new Error('You do not have permission to modify this job');
    err.statusCode = 403;
    throw err;
  }

  return job;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle methods
// Each follows the same contract:
//   - validate IDs
//   - fetch + assert ownership
//   - call job.transitionTo() (throws 409 on invalid transition)
//   - save + return sanitised job
// ─────────────────────────────────────────────────────────────────────────────

class JobLifecycleService {

  /**
   * publishJob — draft → active
   * Generates interview questions if none exist (hook into your AI service here).
   */
  async publishJob(jobId, recruiterId, { reason = '' } = {}) {
    const job = await fetchOwnedJob(jobId, recruiterId);

    // Business rule: require at least a title + description before publishing
    if (!job.title?.trim() || !job.description?.trim()) {
      const err = new Error('Job must have a title and description before publishing');
      err.statusCode = 422;
      throw err;
    }

    job.transitionTo('active', recruiterId, reason);
    await job.save();

    return this._sanitize(job);
  }

  /**
   * pauseJob — active → paused
   * Candidates can no longer see or apply. Recruiter can resume later.
   */
  async pauseJob(jobId, recruiterId, { reason = '' } = {}) {
    const job = await fetchOwnedJob(jobId, recruiterId);
    job.transitionTo('paused', recruiterId, reason);
    await job.save();
    return this._sanitize(job);
  }

  /**
   * resumeJob — paused → active
   */
  async resumeJob(jobId, recruiterId, { reason = '' } = {}) {
    const job = await fetchOwnedJob(jobId, recruiterId);

    // Re-check deadline: refuse to resume an expired job
    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
      const err = new Error(
        'Cannot resume a job whose application deadline has passed. ' +
        'Update the deadline first.'
      );
      err.statusCode = 422;
      throw err;
    }

    job.transitionTo('active', recruiterId, reason);
    await job.save();
    return this._sanitize(job);
  }

  /**
   * closeJob — active | paused → closed
   * Hiring is complete. No more applications accepted.
   */
  async closeJob(jobId, recruiterId, { reason = '' } = {}) {
    const job = await fetchOwnedJob(jobId, recruiterId);
    job.transitionTo('closed', recruiterId, reason);
    await job.save();
    return this._sanitize(job);
  }

  /**
   * archiveJob — closed → archived
   * Moves job to historical records. Terminal state.
   */
  async archiveJob(jobId, recruiterId, { reason = '' } = {}) {
    const job = await fetchOwnedJob(jobId, recruiterId);
    job.transitionTo('archived', recruiterId, reason);
    await job.save();
    return this._sanitize(job);
  }

  /**
   * getStatusHistory — returns the audit trail for a job.
   * Recruiter-only; not exposed publicly.
   */
  async getStatusHistory(jobId, recruiterId) {
    assertValidId(jobId,       'job ID');
    assertValidId(recruiterId, 'recruiter ID');

    const job = await Job.findById(jobId)
      .select('+statusHistory')
      .populate('statusHistory.changedBy', 'firstName lastName email');

    if (!job) {
      const err = new Error('Job not found');
      err.statusCode = 404;
      throw err;
    }

    if (job.recruiterId.toString() !== recruiterId.toString()) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }

    return job.statusHistory;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Strip statusHistory from the response object.
   * Consumers get a clean lean-style plain object.
   */
  _sanitize(job) {
    const obj = job.toObject();
    delete obj.statusHistory;
    return obj;
  }
}

module.exports = new JobLifecycleService();