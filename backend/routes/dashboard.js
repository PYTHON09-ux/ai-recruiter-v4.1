/**
 * dashboard.js — Fixed dashboard & analytics route.
 *
 * Original problems:
 *  - Called service methods that didn't exist (getApplicationCountByRecruiter,
 *    getApplicationTrends, getJobPerformanceMetrics, getInterviewMetrics,
 *    getCandidateSourceAnalysis), causing every request to 500.
 *  - Returned an empty / malformed analytics payload shape.
 *
 * Fix:
 *  - Implement counts and analytics algorithms inline via Mongoose aggregation
 *    against Application, Job, and Interview collections.
 *  - Return a stable, well-typed payload the frontend can rely on:
 *
 *      GET /dashboard/stats       →  { success, data: overview }
 *      GET /dashboard/analytics   →  { success, data: {
 *                                        applicationTrends: [{date, count}],
 *                                        jobPerformance:    [{jobId, title, applications, hires, avgTimeToHireDays}],
 *                                        interviewMetrics:  {total, completed, scheduled, cancelled, avgScore, successRate},
 *                                        candidateSourceAnalysis: [{source, count}],
 *                                        summary: {...}
 *                                      }}
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { auth, authorize } = require('../middleware/auth');
const { queryValidations, sanitizeInput } = require('../middleware/validation');

const Application = require('../models/Application');
const Job = require('../models/Job');
const Interview = require('../models/Interview');

router.use(sanitizeInput);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const oid = (v) => new mongoose.Types.ObjectId(v);

const timeframeToDate = (timeframe) => {
  const now = new Date();
  const days =
    { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[timeframe] || 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return { start, end: now, days };
};

const formatDateKey = (d) => new Date(d).toISOString().slice(0, 10);

/** Build a zero-filled date series so the line chart never has gaps. */
const zeroFilledSeries = (start, end) => {
  const out = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cursor <= endDay) {
    out.push({ date: formatDateKey(cursor), count: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
};

// ─── Counts (used by /stats overview) ─────────────────────────────────────────
const countJobsByRecruiter = (recruiterId, extra = {}) =>
  Job.countDocuments({ recruiterId: oid(recruiterId), ...extra });

const countApplicationsByRecruiter = async (recruiterId, extra = {}) => {
  const jobIds = await Job.find({ recruiterId: oid(recruiterId) }).distinct('_id');
  if (jobIds.length === 0) return 0;
  return Application.countDocuments({ jobId: { $in: jobIds }, ...extra });
};

const countInterviewsByRecruiter = async (recruiterId, extra = {}) => {
  const jobIds = await Job.find({ recruiterId: oid(recruiterId) }).distinct('_id');
  if (jobIds.length === 0) return 0;
  return Interview.countDocuments({ jobId: { $in: jobIds }, ...extra });
};

const recentApplicationsByRecruiter = async (recruiterId, limit = 5) => {
  const jobIds = await Job.find({ recruiterId: oid(recruiterId) }).distinct('_id');
  if (jobIds.length === 0) return [];
  return Application.find({ jobId: { $in: jobIds } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('jobId', 'title')
    .populate('candidateId', 'name email');
};

// ─── Analytics aggregations ───────────────────────────────────────────────────
const applicationTrends = async (recruiterId, start, end) => {
  const jobIds = await Job.find({ recruiterId: oid(recruiterId) }).distinct('_id');
  if (jobIds.length === 0) return zeroFilledSeries(start, end);

  const rows = await Application.aggregate([
    { $match: { jobId: { $in: jobIds }, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
  ]);

  const byDate = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return zeroFilledSeries(start, end).map((p) => ({
    date: p.date,
    count: byDate[p.date] || 0,
  }));
};

const jobPerformanceMetrics = async (recruiterId, start, end) => {
  const jobs = await Job.find({ recruiterId: oid(recruiterId) })
    .select('_id title')
    .lean();
  if (jobs.length === 0) return [];

  const jobIds = jobs.map((j) => j._id);

  const perJob = await Application.aggregate([
    { $match: { jobId: { $in: jobIds }, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: '$jobId',
        applications: { $sum: 1 },
        hires: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } },
        // avg hire latency: updatedAt - createdAt for hired applications
        hireLatencies: {
          $push: {
            $cond: [
              { $eq: ['$status', 'hired'] },
              {
                $divide: [
                  { $subtract: ['$updatedAt', '$createdAt'] },
                  1000 * 60 * 60 * 24,
                ],
              },
              null,
            ],
          },
        },
      },
    },
  ]);

  const byJob = Object.fromEntries(perJob.map((r) => [String(r._id), r]));

  return jobs.map((j) => {
    const row = byJob[String(j._id)] || { applications: 0, hires: 0, hireLatencies: [] };
    const latencies = (row.hireLatencies || []).filter((x) => x != null && x >= 0);
    const avgTimeToHireDays =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;
    return {
      jobId: j._id,
      title: j.title,
      applications: row.applications || 0,
      hires: row.hires || 0,
      avgTimeToHireDays: Number(avgTimeToHireDays.toFixed(2)),
    };
  });
};

const interviewMetrics = async (recruiterId, start, end) => {
  const jobIds = await Job.find({ recruiterId: oid(recruiterId) }).distinct('_id');
  if (jobIds.length === 0) {
    return {
      total: 0,
      completed: 0,
      scheduled: 0,
      cancelled: 0,
      avgScore: 0,
      successRate: 0,
    };
  }

  const rows = await Interview.aggregate([
    { $match: { jobId: { $in: jobIds }, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgScore: { $avg: '$evaluation.overallScore' },
      },
    },
  ]);

  const result = {
    total: 0,
    completed: 0,
    scheduled: 0,
    cancelled: 0,
    avgScore: 0,
    successRate: 0,
  };

  let scoreSum = 0;
  let scoreCount = 0;

  rows.forEach((r) => {
    result.total += r.count;
    if (r._id === 'completed') result.completed = r.count;
    if (r._id === 'scheduled' || r._id === 'ready') result.scheduled += r.count;
    if (r._id === 'cancelled') result.cancelled = r.count;
    if (Number.isFinite(r.avgScore)) {
      scoreSum += r.avgScore * r.count;
      scoreCount += r.count;
    }
  });

  result.avgScore = scoreCount > 0 ? Number((scoreSum / scoreCount).toFixed(2)) : 0;
  result.successRate =
    result.total > 0 ? Number(((result.completed / result.total) * 100).toFixed(2)) : 0;

  return result;
};

const candidateSourceAnalysis = async (recruiterId, start, end) => {
  const jobIds = await Job.find({ recruiterId: oid(recruiterId) }).distinct('_id');
  if (jobIds.length === 0) return [];

  const rows = await Application.aggregate([
    { $match: { jobId: { $in: jobIds }, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $ifNull: ['$source', 'direct'] },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return rows.map((r) => ({ source: r._id || 'direct', count: r.count }));
};

/** Compute a high-level summary that the frontend can use as-is. */
const computeSummary = ({ trends, jobs, interviews }) => {
  const totalApplications = trends.reduce((s, p) => s + p.count, 0);
  const half = Math.floor(trends.length / 2);
  const first = trends.slice(0, half).reduce((s, p) => s + p.count, 0);
  const second = trends.slice(half).reduce((s, p) => s + p.count, 0);
  const applicationGrowthPct = first > 0 ? ((second - first) / first) * 100 : 0;

  const hires = jobs.reduce((s, j) => s + j.hires, 0);
  const weighted = jobs.reduce(
    (acc, j) => {
      if (j.hires > 0 && j.avgTimeToHireDays > 0) {
        acc.num += j.hires * j.avgTimeToHireDays;
        acc.den += j.hires;
      }
      return acc;
    },
    { num: 0, den: 0 }
  );
  const avgTimeToHireDays = weighted.den > 0 ? weighted.num / weighted.den : 0;

  return {
    totalApplications,
    totalInterviews: interviews.total,
    hires,
    avgTimeToHireDays: Number(avgTimeToHireDays.toFixed(2)),
    applicationGrowthPct: Number(applicationGrowthPct.toFixed(2)),
    interviewSuccessRate: interviews.successRate,
    timeToHireChangePct: 0, // reserved for future period-over-period comparison
  };
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// Overview / stats
router.get('/stats', auth, async (req, res, next) => {
  try {
    let data = {};

    if (req.user.role === 'recruiter') {
      const [
        totalJobs,
        activeJobs,
        totalApplications,
        pendingApplications,
        scheduledInterviews,
        recentApplications,
      ] = await Promise.all([
        countJobsByRecruiter(req.userId),
        countJobsByRecruiter(req.userId, { status: 'active' }),
        countApplicationsByRecruiter(req.userId),
        countApplicationsByRecruiter(req.userId, { status: 'pending' }),
        countInterviewsByRecruiter(req.userId, { status: { $in: ['scheduled', 'ready'] } }),
        recentApplicationsByRecruiter(req.userId, 5),
      ]);

      data = {
        totalJobs,
        activeJobs,
        totalApplications,
        pendingApplications,
        scheduledInterviews,
        recentApplications,
      };
    } else if (req.user.role === 'candidate') {
      const [totalApplications, pendingApplications, scheduledInterviews, recentApplications] =
        await Promise.all([
          Application.countDocuments({ candidateId: oid(req.userId) }),
          Application.countDocuments({
            candidateId: oid(req.userId),
            status: 'pending',
          }),
          Interview.countDocuments({
            candidateId: oid(req.userId),
            status: { $in: ['scheduled', 'ready'] },
          }),
          Application.find({ candidateId: oid(req.userId) })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('jobId', 'title company location'),
        ]);

      data = {
        totalApplications,
        pendingApplications,
        scheduledInterviews,
        recentApplications,
        suggestedJobs: [],
      };
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Back-compat alias
router.get('/overview', auth, (req, res, next) => {
  req.url = '/stats';
  router.handle(req, res, next);
});

// Analytics (recruiter only)
router.get('/analytics', auth, authorize('recruiter'), async (req, res, next) => {
  try {
    const { timeframe = '30d' } = req.query;
    const { start, end } = timeframeToDate(timeframe);

    const [trends, jobs, interviews, sources] = await Promise.all([
      applicationTrends(req.userId, start, end),
      jobPerformanceMetrics(req.userId, start, end),
      interviewMetrics(req.userId, start, end),
      candidateSourceAnalysis(req.userId, start, end),
    ]);

    const summary = computeSummary({ trends, jobs, interviews });

    res.status(200).json({
      success: true,
      data: {
        applicationTrends: trends,
        jobPerformance: jobs,
        interviewMetrics: interviews,
        candidateSourceAnalysis: sources,
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Activities
router.get('/activity', auth, queryValidations.pagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const options = { page: parseInt(page, 10), limit: Math.min(parseInt(limit, 10), 50) };

    let activities;
    if (req.user.role === 'recruiter') {
      const jobIds = await Job.find({ recruiterId: oid(req.userId) }).distinct('_id');
      const recent = await Application.find({ jobId: { $in: jobIds } })
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .populate('jobId', 'title')
        .populate('candidateId', 'name');
      const total = await Application.countDocuments({ jobId: { $in: jobIds } });

      activities = {
        activities: recent.map((a) => ({
          id: a._id,
          type: 'application_received',
          message: `New application from ${a.candidateId?.name || 'candidate'} for ${a.jobId?.title || 'job'}`,
          timestamp: a.createdAt,
          metadata: { applicationId: a._id, jobId: a.jobId?._id },
        })),
        totalActivities: total,
        currentPage: options.page,
        totalPages: Math.ceil(total / options.limit),
      };
    } else {
      const recent = await Application.find({ candidateId: oid(req.userId) })
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .populate('jobId', 'title');
      const total = await Application.countDocuments({ candidateId: oid(req.userId) });

      activities = {
        activities: recent.map((a) => ({
          id: a._id,
          type: 'application_submitted',
          message: `You applied for ${a.jobId?.title || 'a job'}`,
          timestamp: a.createdAt,
          metadata: { applicationId: a._id },
        })),
        totalActivities: total,
        currentPage: options.page,
        totalPages: Math.ceil(total / options.limit),
      };
    }

    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
});

// Back-compat
router.get('/activities', auth, queryValidations.pagination, (req, res, next) => {
  req.url = `/activity${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;
  router.handle(req, res, next);
});

// Notifications (stub — unchanged)
router.get('/notifications', auth, queryValidations.pagination, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    res.status(200).json({
      success: true,
      data: {
        notifications: [],
        totalNotifications: 0,
        unreadCount: 0,
        currentPage: parseInt(page, 10),
        totalPages: 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/notifications/:id/read', auth, async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;