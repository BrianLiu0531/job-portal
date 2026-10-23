import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { Role } from '../types';

const NAV: Record<Role | 'GUEST', { to: string; label: string; end?: boolean }[]> = {
  GUEST: [{ to: '/', label: 'Find jobs', end: true }],
  SEEKER: [
    { to: '/', label: 'Find jobs', end: true },
    { to: '/me/applications', label: 'Applications' },
    { to: '/me/saved', label: 'Saved' },
    { to: '/me/profile', label: 'Profile' },
  ],
  EMPLOYER: [
    { to: '/employer', label: 'Dashboard', end: true },
    { to: '/employer/jobs/new', label: 'Post a job' },
    { to: '/employer/company', label: 'Company' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Admin' },
    { to: '/', label: 'Browse jobs', end: true },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          🧭 Hireloop
        </Link>
        <nav className="nav">
          {NAV[user?.role ?? 'GUEST'].map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-user">
          {user ? (
            <>
              <span className="muted small">
                {user.company?.name ?? user.name}
              </span>
              <button className="btn btn-ghost" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">
                Log in
              </Link>
              <Link className="btn btn-primary" to="/register">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <footer className="footer muted small">
        Hireloop is a portfolio project · all companies and jobs are fictional
      </footer>
    </div>
  );
}
