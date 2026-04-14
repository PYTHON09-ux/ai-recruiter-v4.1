import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const AnalyticsCharts = ({ analyticsData }) => {
  if (!analyticsData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const { applicationTrends, jobPerformance, interviewMetrics, candidateSourceAnalysis } = analyticsData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Application Trends Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={applicationTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="applications"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.3}
              name="Applications"
            />
            <Area
              type="monotone"
              dataKey="interviews"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.3}
              name="Interviews"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Job Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={jobPerformance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="jobTitle" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="applications" fill="#3B82F6" name="Applications" />
            <Bar dataKey="interviews" fill="#10B981" name="Interviews" />
            <Bar dataKey="hired" fill="#F59E0B" name="Hired" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Interview Metrics Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Success Rate</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={interviewMetrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="successRate"
              stroke="#10B981"
              strokeWidth={3}
              name="Success Rate (%)"
            />
            <Line
              type="monotone"
              dataKey="averageScore"
              stroke="#3B82F6"
              strokeWidth={3}
              name="Average Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Candidate Source Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidate Sources</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={candidateSourceAnalysis}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {candidateSourceAnalysis.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsCharts;