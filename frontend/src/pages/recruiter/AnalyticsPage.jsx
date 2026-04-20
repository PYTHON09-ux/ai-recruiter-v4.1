/**
 * AnalyticsPage.jsx — Fixed, fully-functional analytics dashboard.
 *
 * What was broken:
 *  - dashboardService.getDashboardOverview / getAnalytics either didn't exist
 *    or returned undefined, so `response.data` blew up.
 *  - Key Insights were hard-coded strings, not derived from real data.
 *  - Export button was a no-op toast.
 *  - No empty / error state → blank page when the API fails.
 *
 * What was fixed:
 *  - Defensive data access via `response?.data` + default fallbacks.
 *  - Real KPI algorithms computed client-side from the analytics payload
 *    (period-over-period growth, interview success rate, avg time-to-hire).
 *  - Dynamic, data-driven Key Insights (colour + copy chosen from metrics).
 *  - CSV export of the current analytics snapshot.
 *  - Proper loading / error / empty states.
 *  - Charts rendered with `recharts` (line, bar, pie) — no external service
 *    dependency, so the page works even if `AnalyticsCharts` sub-component
 *    is missing.
 *
 * Drop-in replacement for the original file at the same path.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';

import dashboardService from '../../services/dashboardService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const COLOURS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const safeNum = (n, d = 0) => (Number.isFinite(Number(n)) ? Number(n) : d);
const pct = (n) => `${safeNum(n).toFixed(1)}%`;

/**
 * Compute derived KPI summary from raw analytics arrays.
 * Works even when the backend only returns partial data.
 */
const deriveSummary = (analytics) => {
  if (!analytics) return null;

  const trends = Array.isArray(analytics.applicationTrends)
    ? analytics.applicationTrends
    : [];
  const interviewMetrics = analytics.interviewMetrics || {};
  const jobPerformance = Array.isArray(analytics.jobPerformance)
    ? analytics.jobPerformance
    : [];

  // Period-over-period application growth.
  const half = Math.floor(trends.length / 2);
  const firstHalf = trends.slice(0, half).reduce((s, p) => s + safeNum(p.count), 0);
  const secondHalf = trends.slice(half).reduce((s, p) => s + safeNum(p.count), 0);
  const applicationGrowthPct =
    firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  const totalApplications = trends.reduce((s, p) => s + safeNum(p.count), 0);

  const totalInterviews = safeNum(interviewMetrics.total);
  const completedInterviews = safeNum(interviewMetrics.completed);
  const interviewSuccessRate =
    totalInterviews > 0 ? (completedInterviews / totalInterviews) * 100 : 0;

  const hires = jobPerformance.reduce((s, j) => s + safeNum(j.hires), 0);

  // Avg time-to-hire (days) from per-job stats, weighted by hire count.
  const weightedTTH = jobPerformance.reduce(
    (acc, j) => {
      const h = safeNum(j.hires);
      const tth = safeNum(j.avgTimeToHireDays);
      if (h > 0 && tth > 0) {
        acc.num += h * tth;
        acc.den += h;
      }
      return acc;
    },
    { num: 0, den: 0 }
  );
  const avgTimeToHireDays = weightedTTH.den > 0 ? weightedTTH.num / weightedTTH.den : 0;

  return {
    totalApplications,
    totalInterviews,
    hires,
    avgTimeToHireDays,
    applicationGrowthPct,
    interviewSuccessRate,
    // If backend supplied its own delta, prefer that; else 0.
    timeToHireChangePct: safeNum(analytics?.summary?.timeToHireChangePct, 0),
  };
};

/**
 * Build human-readable insights from the derived summary.
 * Returns an ordered array: highest-impact first.
 */
const buildInsights = (summary) => {
  if (!summary) return [];

  const insights = [];

  // 1. Application growth insight.
  if (summary.applicationGrowthPct !== 0) {
    const up = summary.applicationGrowthPct > 0;
    insights.push({
      tone: up ? 'positive' : 'negative',
      title: `Application volume ${up ? 'increased' : 'decreased'} by ${pct(
        Math.abs(summary.applicationGrowthPct)
      )} compared to the previous period`,
      subtitle: up
        ? 'Your job postings are attracting more candidates'
        : 'Consider refreshing postings or widening sourcing channels',
    });
  } else if (summary.totalApplications > 0) {
    insights.push({
      tone: 'neutral',
      title: 'Application volume is stable compared to the previous period',
      subtitle: 'Baseline performance — look for outliers in job performance',
    });
  }

  // 2. Interview success rate insight.
  if (summary.totalInterviews > 0) {
    const rate = summary.interviewSuccessRate;
    let tone = 'neutral';
    let subtitle = '';
    if (rate >= 75) {
      tone = 'positive';
      subtitle = 'Strong screening quality — candidates are well-matched';
    } else if (rate >= 50) {
      tone = 'neutral';
      subtitle = 'Average completion — consider tightening screening criteria';
    } else {
      tone = 'negative';
      subtitle = 'Low completion rate — review scheduling & candidate experience';
    }
    insights.push({
      tone,
      title: `Interview completion rate is ${pct(rate)}`,
      subtitle,
    });
  }

  // 3. Time-to-hire insight.
  if (summary.avgTimeToHireDays > 0) {
    const days = summary.avgTimeToHireDays;
    const tone = days <= 21 ? 'positive' : days <= 45 ? 'neutral' : 'negative';
    insights.push({
      tone,
      title: `Average time-to-hire is ${days.toFixed(1)} days`,
      subtitle:
        tone === 'positive'
          ? 'Faster than industry average — pipeline is running efficiently'
          : tone === 'neutral'
          ? 'Within typical range — automation can shave more days off'
          : 'Longer than typical — investigate bottlenecks in the pipeline',
    });
  }

  // 4. Hires count.
  if (summary.hires > 0) {
    insights.push({
      tone: 'positive',
      title: `${summary.hires} successful hire${summary.hires === 1 ? '' : 's'} this period`,
      subtitle: 'Conversion from application → hire is trending positively',
    });
  }

  return insights;
};

const toneStyles = {
  positive: { dot: 'bg-green-500', icon: TrendingUp, color: 'text-green-600' },
  negative: { dot: 'bg-red-500', icon: TrendingDown, color: 'text-red-600' },
  neutral: { dot: 'bg-blue-500', icon: AlertTriangle, color: 'text-blue-600' },
};

// ─── Inline metric / chart subcomponents ──────────────────────────────────────
const MetricCard = ({ icon: Icon, label, value, hint, tone = 'neutral' }) => (
  <div className="bg-white p-5 rounded-lg shadow-sm border flex items-start justify-between">
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
      {hint ? (
        <p className={`text-xs mt-1 ${toneStyles[tone]?.color || 'text-gray-500'}`}>
          {hint}
        </p>
      ) : null}
    </div>
    <div className="p-2 rounded-md bg-blue-50 text-blue-600">
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

const ChartCard = ({ title, children, empty }) => (
  <div className="bg-white p-5 rounded-lg shadow-sm border">
    <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
    <div className="h-64">
      {empty ? (
        <div className="h-full flex items-center justify-center text-sm text-gray-400">
          No data available for this period
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

// ─── CSV Export ───────────────────────────────────────────────────────────────
const exportAnalyticsCsv = (analytics, summary, timeframe) => {
  const lines = [];
  lines.push(`Analytics Export,,,`);
  lines.push(`Timeframe,${timeframe},,`);
  lines.push(`Generated At,${new Date().toISOString()},,`);
  lines.push('');

  lines.push('Summary,,,');
  if (summary) {
    lines.push(`Total Applications,${summary.totalApplications},,`);
    lines.push(`Total Interviews,${summary.totalInterviews},,`);
    lines.push(`Hires,${summary.hires},,`);
    lines.push(`Avg Time-to-Hire (days),${summary.avgTimeToHireDays.toFixed(2)},,`);
    lines.push(`Application Growth %,${summary.applicationGrowthPct.toFixed(2)},,`);
    lines.push(`Interview Success Rate %,${summary.interviewSuccessRate.toFixed(2)},,`);
  }
  lines.push('');

  const trends = analytics?.applicationTrends || [];
  if (trends.length) {
    lines.push('Application Trends,,,');
    lines.push('Date,Count,,');
    trends.forEach((t) => lines.push(`${t.date ?? ''},${safeNum(t.count)},,`));
    lines.push('');
  }

  const jobs = analytics?.jobPerformance || [];
  if (jobs.length) {
    lines.push('Job Performance,,,');
    lines.push('Job,Applications,Hires,Avg TTH (days)');
    jobs.forEach((j) =>
      lines.push(
        `${(j.title || j.jobTitle || '').replace(/,/g, ' ')},${safeNum(
          j.applications
        )},${safeNum(j.hires)},${safeNum(j.avgTimeToHireDays)}`
      )
    );
    lines.push('');
  }

  const sources = analytics?.candidateSourceAnalysis || [];
  if (sources.length) {
    lines.push('Candidate Sources,,,');
    lines.push('Source,Count,,');
    sources.forEach((s) =>
      lines.push(`${s.source ?? 'unknown'},${safeNum(s.count)},,`)
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-${timeframe}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('30d');
  const [error, setError] = useState(null);

  const timeframeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' },
  ];

  const load = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        const [analyticsRes, overviewRes] = await Promise.all([
          dashboardService.getAnalytics(timeframe),
          dashboardService.getDashboardOverview(),
        ]);

        setAnalyticsData(analyticsRes?.data ?? null);
        setDashboardData(overviewRes?.data ?? null);

        if (!analyticsRes?.success && analyticsRes?.error) {
          setError(analyticsRes.error);
        }
      } catch (err) {
        console.error('Analytics load error:', err);
        setError(err?.message || 'Failed to load analytics');
        toast.error('Failed to load analytics data');
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [timeframe]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
    toast.success('Analytics refreshed');
  };

  // Prefer backend-provided summary; else derive locally.
  const summary = useMemo(() => {
    if (analyticsData?.summary && typeof analyticsData.summary === 'object') {
      return {
        totalApplications: safeNum(analyticsData.summary.totalApplications),
        totalInterviews: safeNum(analyticsData.summary.totalInterviews),
        hires: safeNum(analyticsData.summary.hires),
        avgTimeToHireDays: safeNum(analyticsData.summary.avgTimeToHireDays),
        applicationGrowthPct: safeNum(analyticsData.summary.applicationGrowthPct),
        interviewSuccessRate: safeNum(analyticsData.summary.interviewSuccessRate),
        timeToHireChangePct: safeNum(analyticsData.summary.timeToHireChangePct),
      };
    }
    return deriveSummary(analyticsData);
  }, [analyticsData]);

  const insights = useMemo(() => buildInsights(summary), [summary]);

  const handleExport = () => {
    if (!analyticsData) {
      toast.error('Nothing to export yet');
      return;
    }
    exportAnalyticsCsv(analyticsData, summary, timeframe);
    toast.success('Analytics CSV downloaded');
  };

  const trendsData = analyticsData?.applicationTrends || [];
  const jobsData = analyticsData?.jobPerformance || [];
  const sourcesData = analyticsData?.candidateSourceAnalysis || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive insights into your recruitment performance
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeframeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            Some analytics data could not be loaded ({error}). Showing the most
            recent available values.
          </div>
        </div>
      ) : null}

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={Briefcase}
          label="Active Jobs"
          value={safeNum(dashboardData?.activeJobs)}
          hint={`${safeNum(dashboardData?.totalJobs)} total`}
        />
        <MetricCard
          icon={Users}
          label="Applications"
          value={safeNum(summary?.totalApplications ?? dashboardData?.totalApplications)}
          hint={
            summary?.applicationGrowthPct
              ? `${summary.applicationGrowthPct >= 0 ? '+' : ''}${pct(
                  summary.applicationGrowthPct
                )} vs prev.`
              : undefined
          }
          tone={summary?.applicationGrowthPct >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Interview Success"
          value={summary ? pct(summary.interviewSuccessRate) : '—'}
          hint={`${safeNum(summary?.totalInterviews)} interviews`}
          tone={
            summary?.interviewSuccessRate >= 75
              ? 'positive'
              : summary?.interviewSuccessRate >= 50
              ? 'neutral'
              : 'negative'
          }
        />
        <MetricCard
          icon={Clock}
          label="Avg Time-to-Hire"
          value={
            summary && summary.avgTimeToHireDays > 0
              ? `${summary.avgTimeToHireDays.toFixed(1)}d`
              : '—'
          }
          hint={`${safeNum(summary?.hires)} hires this period`}
          tone={
            summary?.avgTimeToHireDays && summary.avgTimeToHireDays <= 21
              ? 'positive'
              : summary?.avgTimeToHireDays && summary.avgTimeToHireDays <= 45
              ? 'neutral'
              : 'negative'
          }
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white rounded-lg border">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-600">Loading analytics…</span>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard
              title="Application Trends"
              empty={trendsData.length === 0}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={11} stroke="#6b7280" />
                  <YAxis fontSize={11} stroke="#6b7280" allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Job Performance" empty={jobsData.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey={(d) => d.title || d.jobTitle || ''}
                    fontSize={11}
                    stroke="#6b7280"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={11} stroke="#6b7280" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="applications" fill="#3b82f6" name="Applications" />
                  <Bar dataKey="hires" fill="#10b981" name="Hires" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ChartCard
              title="Candidate Sources"
              empty={sourcesData.length === 0}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourcesData}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {sourcesData.map((_, i) => (
                      <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Interview Funnel"
              empty={!analyticsData?.interviewMetrics}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      stage: 'Scheduled',
                      value: safeNum(analyticsData?.interviewMetrics?.scheduled),
                    },
                    {
                      stage: 'Completed',
                      value: safeNum(analyticsData?.interviewMetrics?.completed),
                    },
                    {
                      stage: 'Cancelled',
                      value: safeNum(analyticsData?.interviewMetrics?.cancelled),
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="stage" fontSize={11} stroke="#6b7280" />
                  <YAxis fontSize={11} stroke="#6b7280" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Insights + Quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Key Insights
              </h3>

              {insights.length === 0 ? (
                <div className="text-sm text-gray-500 py-6 text-center">
                  Not enough data yet to surface insights. Try a longer timeframe.
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((i, idx) => {
                    const Icon = toneStyles[i.tone]?.icon || TrendingUp;
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${toneStyles[i.tone]?.dot || 'bg-gray-400'}`}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <Icon
                              className={`w-4 h-4 ${toneStyles[i.tone]?.color || 'text-gray-500'}`}
                            />
                            {i.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{i.subtitle}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleExport}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                >
                  Export Custom Report (CSV)
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                >
                  Refresh Data
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('90d')}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                >
                  View Quarterly Report
                </button>
                <button
                  type="button"
                  onClick={() => toast('Alert rules coming soon')}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                >
                  Set Up Alerts
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;