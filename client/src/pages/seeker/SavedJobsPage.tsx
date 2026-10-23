import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import SaveButton from '../../components/SaveButton';
import { api } from '../../lib/api';
import { formatDate, locationLabel } from '../../lib/format';
import { useMeta } from '../../lib/meta';
import type { SavedJob } from '../../types';

export default function SavedJobsPage() {
  const { data: meta } = useMeta();
  const { data, isLoading } = useQuery({ queryKey: ['saved'], queryFn: () => api<SavedJob[]>('/seeker/saved') });

  return (
    <div className="stack narrow-wide">
      <h1>Saved jobs</h1>
      {isLoading && <p className="muted">Loading…</p>}
      {data?.length === 0 && (
        <div className="card empty">
          <p>No saved jobs yet. Tap ☆ Save on any listing to keep it here.</p>
          <Link to="/">Browse jobs →</Link>
        </div>
      )}
      {data?.map((job) => (
        <article key={job.id} className="card job-card">
          <div className="job-card-head">
            <div>
              <h3>{job.status === 'OPEN' ? <Link to={`/jobs/${job.id}`}>{job.title}</Link> : job.title}</h3>
              <p className="muted">
                {job.company.name} · {locationLabel(job, meta)}
              </p>
            </div>
            <SaveButton jobId={job.id} saved />
          </div>
          <p className="muted small">
            Saved {formatDate(job.savedAt)}
            {job.status === 'CLOSED' && ' · no longer accepting applications'}
          </p>
        </article>
      ))}
    </div>
  );
}
