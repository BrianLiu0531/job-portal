import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import FitCheck from '../components/FitCheck';
import Modal from '../components/Modal';
import SaveButton from '../components/SaveButton';
import StatusBadge from '../components/StatusBadge';
import { api, ApiError, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatSalary, locationLabel, postedAgo, salarySuffix } from '../lib/format';
import { useMeta } from '../lib/meta';
import type { JobDetail } from '../types';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: meta } = useMeta();
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id, user?.id],
    queryFn: () => api<JobDetail>(`/jobs/${id}`),
    retry: false,
  });

  const apply = useMutation({
    mutationFn: () => api(`/jobs/${id}/apply`, { method: 'POST', json: { coverLetter } }),
    onSuccess: async () => {
      setApplying(false);
      await queryClient.invalidateQueries({ predicate: (q) => ['job', 'jobs', 'applications'].includes(q.queryKey[0] as string) });
    },
  });

  if (isLoading || !meta) return <p className="muted">Loading…</p>;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="card empty">
        <h1>Job not found</h1>
        <p className="muted">This listing may have been filled or removed.</p>
        <Link to="/">Back to search</Link>
      </div>
    );
  }
  if (!job) return <p className="error">Couldn’t load this job.</p>;

  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="detail-layout">
      <article className="card stack">
        <Link to="/" className="muted small">
          ← Back to search
        </Link>
        <div>
          <h1>{job.title}</h1>
          <p className="company-name">{job.company.name}</p>
        </div>
        {job.status === 'CLOSED' && <p className="notice">This job is closed and no longer accepting applications.</p>}
        <ul className="job-meta">
          <li>📍 {locationLabel(job, meta)}</li>
          <li>{meta.workTypes[job.workType]}</li>
          <li>{meta.workplaces[job.workplace]}</li>
          <li>{job.category}</li>
        </ul>
        {salary && (
          <p className="salary">
            {salary} <span className="muted small">{salarySuffix(job.country)}</span>
          </p>
        )}
        {job.sponsorship && <span className="tag tag-visa">Visa sponsorship available</span>}
        <div className="description">{job.description}</div>
        <p className="muted small">{postedAgo(job.createdAt)}</p>
      </article>

      <aside className="stack">
        <div className="card stack">
          {!user && (
            <>
              <Link className="btn btn-primary" to="/login" state={{ from: `/jobs/${job.id}` }}>
                Log in to apply
              </Link>
              <p className="muted small center">
                New to Hireloop? <Link to="/register">Create a free account</Link>
              </p>
            </>
          )}
          {user?.role === 'SEEKER' &&
            (job.applicationStatus ? (
              <div className="applied">
                <span>Your application</span>
                <StatusBadge status={job.applicationStatus} />
                <Link to="/me/applications" className="small">
                  Track applications →
                </Link>
              </div>
            ) : (
              <button className="btn btn-primary" disabled={job.status !== 'OPEN'} onClick={() => setApplying(true)}>
                Apply now
              </button>
            ))}
          {user?.role === 'SEEKER' && <SaveButton jobId={job.id} saved={job.saved} />}
          {job.isOwner && (
            <>
              <Link className="btn btn-primary" to={`/employer/jobs/${job.id}/applicants`}>
                View applicants
              </Link>
              <Link className="btn" to={`/employer/jobs/${job.id}/edit`}>
                Edit listing
              </Link>
            </>
          )}
        </div>

        {user?.role === 'SEEKER' && job.status === 'OPEN' && <FitCheck key={job.id} jobId={job.id} />}

        <div className="card stack">
          <h2>About {job.company.name}</h2>
          {job.company.location && <p className="muted small">📍 {job.company.location}</p>}
          {job.company.description && <p className="small">{job.company.description}</p>}
          {job.company.website && (
            <a href={job.company.website} target="_blank" rel="noreferrer noopener" className="small">
              Visit website ↗
            </a>
          )}
        </div>
      </aside>

      {applying && (
        <Modal title={`Apply for ${job.title}`} onClose={() => setApplying(false)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              apply.mutate();
            }}
          >
            <p className="muted small">
              Your profile (headline, skills, work rights and résumé link, but not your pasted résumé text) is shared with {job.company.name}.{' '}
              <Link to="/me/profile">Review profile</Link>
            </p>
            <label className="field">
              <span>Cover letter (optional)</span>
              <textarea rows={8} maxLength={5000} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
            </label>
            {apply.error && <p className="error" role="alert">{errorMessage(apply.error)}</p>}
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setApplying(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={apply.isPending}>
                {apply.isPending ? 'Sending…' : 'Submit application'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
