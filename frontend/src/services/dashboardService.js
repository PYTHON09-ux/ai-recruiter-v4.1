/**
 * dashboardService.js — Frontend service layer for dashboard & analytics.
 *
 * Wraps the `dashboardAPI` axios client and normalises the response shape
 * so pages can rely on a predictable contract:
 *   { success: boolean, data: <payload>, error?: string }
 *
 * Fixes applied:
 *  - Adds `getDashboardOverview` (previously missing — page was crashing).
 *  - Normalises every response so `.data` is always defined.
 *  - Catches network / 4xx / 5xx errors and surfaces a safe fallback shape
 *    so the UI never renders `undefined`.
 */

import { dashboardAPI } from './api';

const safeCall = async (fn, fallback) => {
  try {
    const res = await fn();
    // Backend envelope: { success, data }
    const payload = res?.data?.data ?? res?.data ?? fallback;
    return { success: true, data: payload };
  } catch (err) {
    const message =
      err?.response?.data?.message || err?.message || 'Request failed';
    // Return the fallback so the UI can still render.
    return { success: false, data: fallback, error: message };
  }
};

const dashboardService = {
  /** Overview stats for the current user (recruiter or candidate). */
  getDashboardOverview: () =>
    safeCall(() => dashboardAPI.getStats(), {
      totalJobs: 0,
      activeJobs: 0,
      totalApplications: 0,
      pendingApplications: 0,
      scheduledInterviews: 0,
      recentApplications: [],
    }),

  /** Time-series analytics for the current recruiter. */
  getAnalytics: (timeframe = '30d') =>
    safeCall(
      () => dashboardAPI.getAnalytics({ timeframe }),
      {
        applicationTrends: [],
        jobPerformance: [],
        interviewMetrics: {
          total: 0,
          completed: 0,
          scheduled: 0,
          cancelled: 0,
          avgScore: 0,
          successRate: 0,
        },
        candidateSourceAnalysis: [],
        summary: {
          totalApplications: 0,
          totalInterviews: 0,
          hires: 0,
          avgTimeToHireDays: 0,
          applicationGrowthPct: 0,
          interviewSuccessRate: 0,
          timeToHireChangePct: 0,
        },
      }
    ),

  getRecentActivity: () =>
    safeCall(() => dashboardAPI.getRecentActivity(), { activities: [] }),

  getNotifications: (params) =>
    safeCall(() => dashboardAPI.getNotifications(params), {
      notifications: [],
      unreadCount: 0,
    }),

  getReports: (params) =>
    safeCall(() => dashboardAPI.getReports(params), { reports: [] }),
};

export default dashboardService;  