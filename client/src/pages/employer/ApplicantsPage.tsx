import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { api, errorMessage, toQuery } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useMeta } from '../../lib/meta';
import type { Applicant, ApplicationStatus, JobStatus } from '../../types';

const FILTERS: ('' | ApplicationStatus)[] = ['', 'APPLIED', 'REVIEWING', 'INTERVIEW', 'OFFERED', 'REJECTED'];

export default function ApplicantsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: meta } = useMeta();
  const [status, setStatus] = useState<'' | ApplicationStatus>('');

  const { data, isLoading } = useQuery({
    queryKey: ['applicants', id, status],
    queryFn: () =>
      api<{ job: { id: string; title: string; status: JobStatus }; applications: Applicant[] }>(
        `/employer/jobs/${id}/applications${toQuery({ status })}`,
      ),
  });

  const move = useMutation({
    mutationFn: ({ appId, next }: { appId: string; next: ApplicationStatus }) =>
      api(`/employer/applications/${appId}`, { method: 'PATCH', json: { status: next } }),
    onSuccess: () => queryClient.invalidateQueries({ predicate: (q) => ['applicants', 'employer-jobs'].includes(q.queryKey[0] as string) }),
  });

  if (!meta) return <p className="muted">Loading…</p>;

  return (
    <div className="stack">
      <div>
        <Link to="/employer" className="muted small">
          ← Dashboard
        </Link>
        <h1>Applicants{data ? ` — ${data.job.title}` : ''}</h1>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f || 'all'} role="tab" aria-selected={status === f} className={status === f ? 'active' : ''} onClick={() => setStatus(f)}>
            {f ? meta.applicationStatuses[f] : 'All'}
          </button>
        ))}
      </div>

      {move.error && <p className="error">{errorMessage(move.error)}</p>}
      {isLoading && <p className="muted">Loading…</p>}
      {data?.applications.length === 0 && <div className="card empty">No applicants {status ? 'with this status' : 'yet'}.</div>}

      {data?.applications.map((a) => {
        const p = a.seeker.seekerProfile;
        return (
          <article key={a.id} className="card applicant">
            <div className="job-card-head">
              <div>
                <h3>{a.seeker.name}</h3>
                {p?.headline && <p>{p.headline}</p>}
                <p className="muted small">
                  {p?.location && `📍 ${p.location} · `}Applied {formatDate(a.createdAt)} ·{' '}
                  <a href={`mailto:${a.seeker.email}`}>{a.seeker.email}</a>
                </p>
              </div>
              <StatusBadge status={a.status} />
            </div>

            <div className="row">
              {p?.workRights && (
                <span className={`tag ${p.workRights === 'REQUIRES_SPONSORSHIP' ? 'tag-visa' : ''}`}>
                  🛂 {meta.workRights[p.workRights]}
                </span>
              )}
              {p?.skills.map((s) => (
                <span key={s} className="tag">
                  {s}
                </span>
              ))}
            </div>

            {a.coverLetter && <blockquote className="cover-letter">{a.coverLetter}</blockquote>}

            <div className="job-card-foot">
              {p?.resumeUrl ? (
                <a href={p.resumeUrl} target="_blank" rel="noreferrer noopener" className="small">
                  View résumé ↗
                </a>
              ) : (
                <span className="muted small">No résumé link</span>
              )}
              {a.nextStatuses.length > 0 && (
                <div className="row">
                  {a.nextStatuses.map((next) => (
                    <button
                      key={next}
                      className={`btn btn-small ${next === 'REJECTED' ? 'btn-danger' : ''}`}
                      disabled={move.isPending}
                      onClick={() => move.mutate({ appId: a.id, next })}
                    >
                      {next === 'REJECTED' ? 'Reject' : `Move to ${meta.applicationStatuses[next]}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
