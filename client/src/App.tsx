import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { homeFor, useAuth } from './lib/auth';
import AdminPage from './pages/admin/AdminPage';
import ApplicantsPage from './pages/employer/ApplicantsPage';
import CompanyPage from './pages/employer/CompanyPage';
import EmployerDashboardPage from './pages/employer/EmployerDashboardPage';
import JobEditorPage from './pages/employer/JobEditorPage';
import JobDetailPage from './pages/JobDetailPage';
import JobSearchPage from './pages/JobSearchPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ApplicationsPage from './pages/seeker/ApplicationsPage';
import ProfilePage from './pages/seeker/ProfilePage';
import SavedJobsPage from './pages/seeker/SavedJobsPage';
import type { Role } from './types';

const loading = <div className="page-loading">Loading…</div>;

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return loading;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return roles.includes(user.role) ? children : <Navigate to={homeFor(user.role)} replace />;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const from = (useLocation().state as { from?: string } | null)?.from;
  if (isLoading) return loading;
  return user ? <Navigate to={from ?? homeFor(user.role)} replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<JobSearchPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
        <Route path="login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="register" element={<GuestOnly><RegisterPage /></GuestOnly>} />

        <Route path="me/applications" element={<RequireRole roles={['SEEKER']}><ApplicationsPage /></RequireRole>} />
        <Route path="me/saved" element={<RequireRole roles={['SEEKER']}><SavedJobsPage /></RequireRole>} />
        <Route path="me/profile" element={<RequireRole roles={['SEEKER']}><ProfilePage /></RequireRole>} />

        <Route path="employer" element={<RequireRole roles={['EMPLOYER']}><EmployerDashboardPage /></RequireRole>} />
        <Route path="employer/jobs/new" element={<RequireRole roles={['EMPLOYER']}><JobEditorPage /></RequireRole>} />
        <Route path="employer/jobs/:id/edit" element={<RequireRole roles={['EMPLOYER']}><JobEditorPage /></RequireRole>} />
        <Route path="employer/jobs/:id/applicants" element={<RequireRole roles={['EMPLOYER']}><ApplicantsPage /></RequireRole>} />
        <Route path="employer/company" element={<RequireRole roles={['EMPLOYER']}><CompanyPage /></RequireRole>} />

        <Route path="admin" element={<RequireRole roles={['ADMIN']}><AdminPage /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
