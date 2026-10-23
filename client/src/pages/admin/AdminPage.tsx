import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import { api, errorMessage, toQuery } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { AdminJob, AdminStats, AdminUser, JobStatus, Paged } from '../../types';

function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'jobs'>('users');
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api<AdminStats>('/admin/stats') });

  return (
    <div className="stack">
      <h1>Admin</h1>
      {stats && (
        <section className="kpis">
          <div className="card kpi">
            <span className="muted small">Job seekers</span>
            <strong>{stats.usersByRole.SEEKER ?? 0}</strong>
          </div>
          <div className="card kpi">
            <span className="muted small">Employers</span>
            <strong>{stats.usersByRole.EMPLOYER ?? 0}</strong>
          </div>
          <div className="card kpi">
            <span className="muted small">Open / closed jobs</span>
            <strong>
              {stats.jobsByStatus.OPEN ?? 0} / {stats.jobsByStatus.CLOSED ?? 0}
            </strong>
          </div>
          <div className="card kpi">
            <span className="muted small">Applications (last 7 days)</span>
            <strong>{stats.last7Days.newApplications}</strong>
          </div>
        </section>
      )}

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'users'} className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          Users
        </button>
        <button role="tab" aria-selected={tab === 'jobs'} className={tab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}>
          Job moderation
        </button>
      </div>
      {tab === 'users' ? <UsersTable /> : <JobsTable />}
    </div>
  );
}

function UsersTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  useEffect(() => setPage(1), [q, role]);

  const { data } = useQuery({
    queryKey: ['admin-users', q, role, page],
    queryFn: () => api<Paged<AdminUser>>(`/admin/users${toQuery({ search: q, role, page })}`),
    placeholderData: keepPreviousData,
  });

  const suspend = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      api(`/admin/users/${id}`, { method: 'PATCH', json: { suspended } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <div className="card table-card">
      <div className="table-toolbar">
        <input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          <option value="">All roles</option>
          <option value="SEEKER">Job seekers</option>
          <option value="EMPLOYER">Employers</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>
      {suspend.error && <p className="error">{errorMessage(suspend.error)}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Joined</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {data?.items.map((u) => (
            <tr key={u.id} className={u.suspended ? 'suspended' : ''}>
              <td data-label="User">
                <strong>{u.name}</strong>
                <div className="muted small">
                  {u.email}
                  {u.company && ` · ${u.company.name}`}
                </div>
              </td>
              <td data-label="Role">
                <span className="tag">{u.role.toLowerCase()}</span>
                {u.suspended && <span className="tag tag-danger">suspended</span>}
              </td>
              <td data-label="Joined">{formatDate(u.createdAt)}</td>
              <td className="actions">
                {u.role !== 'ADMIN' && (
                  <button
                    className={`btn btn-small ${u.suspended ? '' : 'btn-danger'}`}
                    disabled={suspend.isPending}
                    onClick={() => suspend.mutate({ id: u.id, suspended: !u.suspended })}
                  >
                    {u.suspended ? 'Reinstate' : 'Suspend'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </div>
  );
}

function JobsTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  useEffect(() => setPage(1), [q, status]);

  const { data } = useQuery({
    queryKey: ['admin-jobs', q, status, page],
    queryFn: () => api<Paged<AdminJob>>(`/admin/jobs${toQuery({ search: q, status, page })}`),
    placeholderData: keepPreviousData,
  });

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) =>
      api(`/admin/jobs/${id}`, { method: 'PATCH', json: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ predicate: (q) => ['admin-jobs', 'admin-stats', 'jobs'].includes(q.queryKey[0] as string) }),
  });

  return (
    <div className="card table-card">
      <div className="table-toolbar">
        <input placeholder="Search title or company…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search jobs" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Posted</th>
            <th>Applications</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {data?.items.map((j) => (
            <tr key={j.id}>
              <td data-label="Job">
                <Link to={`/jobs/${j.id}`}>
                  <strong>{j.title}</strong>
                </Link>
                <div className="muted small">{j.company.name}</div>
              </td>
              <td data-label="Posted">{formatDate(j.createdAt)}</td>
              <td data-label="Applications">{j._count.applications}</td>
              <td className="actions">
                <span className={`tag ${j.status === 'OPEN' ? 'tag-open' : ''}`}>{j.status.toLowerCase()}</span>
                <button
                  className={`btn btn-small ${j.status === 'OPEN' ? 'btn-danger' : ''}`}
                  disabled={moderate.isPending}
                  onClick={() => moderate.mutate({ id: j.id, status: j.status === 'OPEN' ? 'CLOSED' : 'OPEN' })}
                >
                  {j.status === 'OPEN' ? 'Take down' : 'Restore'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </div>
  );
}
