import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { api, errorMessage } from '../../lib/api';
import { formatDate, locationLabel } from '../../lib/format';
import { useMeta } from '../../lib/meta';
import type { ApplicationStatus, MyApplication } from '../../types';

const STAGES: ApplicationStatus[] = ['APPLIED', 'REVIEWING', 'INTERVIEW', 'OFFERED'];

function Progress({ status }: { status: ApplicationStatus }) {
  const current = STAGES.indexOf(status);
  if (current === -1) return null; // rejected / withdrawn have no progress bar
  return (
    <ol className="progress" aria-label="Application progress">
      {STAGES.map((s, i) => (
        <li key={s} className={i <= current ? 'done' : ''} aria-current={i === current ? 'step' : undefined}>
          <span />
        </li>
      ))}
    </ol>
  );
}

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const { data: meta } = useMeta();
  const { data, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api<MyApplication[]>('/seeker/applications'),
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => api(`/seeker/applications/${id}/withdraw`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ predicate: (q) => ['applications', 'job', 'jobs'].includes(q.queryKey[0] as string) }),
  });

  return (
    <div className="stack narrow-wide">
      <h1>My applications</h1>
      {withdraw.error && <p className="error">{errorMessage(withdraw.error)}</p>}
      {isLoading && <p className="muted">Loading…</p>}
      {data?.length === 0 && (
        <div className="card empty">
          <p>You haven’t applied for any jobs yet.</p>
          <Link to="/">Start searching →</Link>
        </div>
      )}
      {data?.map((a) => (
        <article key={a.id} className="card application">
          <div className="job-card-head">
            <div>
              <h3>
                <Link to={`/jobs/${a.job.id}`}>{a.job.title}</Link>
              </h3>
              <p className="muted">
                {a.job.company.name} · {locationLabel(a.job, meta)}
              </p>
            </div>
            <StatusBadge status={a.status} />
          </div>
          <Progress status={a.status} />
          <div className="job-card-foot">
            <span className="muted small">
              Applied {formatDate(a.createdAt)}
              {a.updatedAt !== a.createdAt && ` · updated ${formatDate(a.updatedAt)}`}
              {a.job.status === 'CLOSED' && ' · job closed'}
            </span>
            {a.status !== 'REJECTED' && a.status !== 'WITHDRAWN' && (
              <button
                className="btn btn-small btn-danger"
                disabled={withdraw.isPending}
                onClick={() => confirm('Withdraw this application?') && withdraw.mutate(a.id)}
              >
                Withdraw
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
