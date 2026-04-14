import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';
import DashboardLayout from './components/layouts/DashboardLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Recruiter Pages
import RecruiterDashboardPage from './pages/recruiter/RecruiterDashboardPage';
import JobCreationPage from './pages/recruiter/JobCreationPage';
import InterviewManagementPage from './pages/recruiter/InterviewManagementPage';
import CandidateListPage from './pages/recruiter/CandidateListPage';
import CandidateEvaluationPage from './pages/recruiter/CandidateEvaluationPage';
import ApplicationManagementPage from './pages/recruiter/ApplicationManagementPage';
import AnalyticsPage from './pages/recruiter/AnalyticsPage';
import CandidateManagementPage from './pages/recruiter/CandidateManagementPage';
import CandidateDetailPage from './pages/recruiter/CandidateDetailPage';

// Candidate Pages
import CandidateDashboardPage from './pages/candidate/CandidateDashboardPage';
import JobSearchPage from './pages/candidate/JobSearchPage';
import JobDetailPage from './pages/candidate/JobDetailPage';
import ApplicationStatusPage from './pages/candidate/ApplicationStatusPage';

// Interview Pages
import InterviewPortal from './pages/interview/InterviewPortal';
import InterviewWaitingPage from './pages/interview/InterviewWaitingPage';
import InterviewCompletePage from './pages/interview/InterviewCompletePage';
import InterviewFeedbackPage from './pages/interview/InterviewFeedbackPage';
import MagicLinkInterviewPage from './pages/interview/MagicLinkInterviewPage';
import VoiceInterviewPage from './pages/interview/VoiceInterviewPage';

// Profile Pages
import ProfileDisplayPage from './pages/profile/ProfileDisplayPage';
import ProfileEditPage from './pages/profile/ProfileEditPage';
import ViewAllJobs from './pages/recruiter/ViewAllJobs';

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={currentUser.role === 'recruiter' ? '/recruiter' : '/candidate'} replace />;
  }

  return children || <Outlet />;
}

// ─── Public Route (redirect if already logged in) ─────────────────────────────
function PublicRoute({ children }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to={currentUser.role === 'recruiter' ? '/recruiter' : '/candidate'} replace />;
  }

  return children || <Outlet />;
}

// ─── Dashboard layout wrapper ─────────────────────────────────────────────────
function DashboardLayoutWrapper() {
  const { currentUser } = useAuth();
  return <DashboardLayout userType={currentUser?.role} />;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
      </Route>

      {/* ── Auth Routes — nested so AuthLayout uses <Outlet /> ── */}
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      {/* Recruiter Routes */}
      <Route path="/recruiter" element={
        <ProtectedRoute allowedRoles={['recruiter']}>
          <DashboardLayoutWrapper />
        </ProtectedRoute>
      }>
        <Route index element={<RecruiterDashboardPage />} />
        <Route path="jobs/create"               element={<JobCreationPage />} />
        <Route path="jobs/:id/edit"             element={<JobCreationPage />} />
        <Route path="jobs"                      element={<ViewAllJobs />} />
        <Route path="interviews"                element={<InterviewManagementPage />} />
        <Route path="applications"              element={<ApplicationManagementPage />} />
        <Route path="analytics"                 element={<AnalyticsPage />} />
        <Route path="profile"                   element={<ProfileDisplayPage />} />
        <Route path="profile/edit"              element={<ProfileEditPage />} />
        <Route path="candidates"                element={<CandidateManagementPage />} />
        <Route path="candidates/:id"            element={<CandidateDetailPage />} />
        <Route path="candidates/:id/evaluation" element={<CandidateEvaluationPage />} />
        <Route path="jobs/:id"      element={<JobDetailPage />} /> 
      </Route>

      {/* Candidate Routes */}
      <Route path="/candidate" element={
        <ProtectedRoute allowedRoles={['candidate']}>
          <DashboardLayoutWrapper />
        </ProtectedRoute>
      }>
        <Route index                  element={<CandidateDashboardPage />} />
        <Route path="jobs"            element={<JobSearchPage />} />
        <Route path="jobs/:jobId"     element={<JobDetailPage />} />
        <Route path="applications"    element={<ApplicationStatusPage />} />
        <Route path="applications/:id" element={<ApplicationStatusPage />} />
        <Route path="profile"         element={<ProfileDisplayPage />} />
        <Route path="profile/edit"    element={<ProfileEditPage />} />
      </Route>

      {/* Public Magic Link — no auth required */}
      <Route path="/interview/magic/:token" element={<MagicLinkInterviewPage />} />

      {/* Interview Routes */}
      <Route path="/interview" element={<ProtectedRoute />}>
        <Route path="portal/:id"   element={<InterviewPortal />} />
        <Route path="waiting/:id"  element={<InterviewWaitingPage />} />
        <Route path="voice/:id"    element={<VoiceInterviewPage />} />
        <Route path="complete/:id" element={<InterviewCompletePage />} />
        <Route path="feedback/:id" element={<InterviewFeedbackPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <div className="App min-h-screen transition-colors duration-200"
              style={{ backgroundColor: 'rgb(var(--bg-page))' }}>
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: { primary: '#4aed88', secondary: '#fff' },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: { primary: '#ff4b4b', secondary: '#fff' },
                  },
                }}
              />
            </div>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;