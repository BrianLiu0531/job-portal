import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate, locationLabel } from '../../lib/format';
import { useMeta } from '../../lib/meta';
import type { EmployerJob, JobStatus } from '../../types';

export default function EmployerDashboardPage() {
  const queryClient = useQueryClient();
  const { data: meta } = useMeta();
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['employer-jobs'],
    queryFn: () => api<EmployerJob[]>('/employer/jobs'),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) =>
      api(`/employer/jobs/${id}/status`, { method: 'PATCH', json: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ predicate: (q) => ['employer-jobs', 'jobs', 'job'].includes(q.queryKey[0] as string) }),
  });

  const open = jobs?.filter((j) => j.status === 'OPEN').length ?? 0;
  const applicants = jobs?.reduce((n, j) => n + j.applicants.total, 0) ?? 0;
  const unreviewed = jobs?.reduce((n, j) => n + j.applicants.new, 0) ?? 0;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Hiring dashboard</h1>
        <Link className="btn btn-primary" to="/employer/jobs/new">
          + Post a job
        </Link>
      </div>

      <section className="kpis">
        <div className="card kpi">
          <span className="muted small">Open listings</span>
          <strong>{open}</strong>
        </div>
        <div className="card kpi">
          <span className="muted small">Total applicants</span>
          <strong>{applicants}</strong>
        </div>
        <div className="card kpi">
          <span className="muted small">Awaiting review</span>
          <strong className={unreviewed ? 'accent' : ''}>{unreviewed}</strong>
        </div>
      </section>

      <div className="card table-card">
        {isLoading && <p className="muted">Loading…</p>}
        {jobs?.length === 0 && (
          <div className="empty">
            <p>You haven’t posted any jobs yet.</p>
            <Link to="/employer/jobs/new">Post your first job →</Link>
          </div>
        )}
        {jobs && jobs.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Posted</th>
                <th>Applicants</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td data-label="Job">
                    <Link to={`/jobs/${job.id}`}>
                      <strong>{job.title}</strong>
                    </Link>
                    <div className="muted small">{locationLabel(job, meta)}</div>
                  </td>
                  <td data-label="Posted">{formatDate(job.createdAt)}</td>
                  <td data-label="Applicants">
                    <Link to={`/employer/jobs/${job.id}/applicants`}>{job.applicants.total}</Link>
                    {job.applicants.new > 0 && <span className="tag tag-new">{job.applicants.new} new</span>}
                  </td>
                  <td data-label="Status">
                    <span className={`tag ${job.status === 'OPEN' ? 'tag-open' : ''}`}>{job.status === 'OPEN' ? 'Open' : 'Closed'}</span>
                  </td>
                  <td className="actions">
                    <Link className="btn btn-small" to={`/employer/jobs/${job.id}/applicants`}>
                      Applicants
                    </Link>
                    <Link className="btn btn-small" to={`/employer/jobs/${job.id}/edit`}>
                      Edit
                    </Link>
                    <button
                      className="btn btn-small"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: job.id, status: job.status === 'OPEN' ? 'CLOSED' : 'OPEN' })}
                    >
                      {job.status === 'OPEN' ? 'Close' : 'Reopen'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
