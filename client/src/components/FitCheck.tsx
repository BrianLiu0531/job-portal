import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import type { JobMatch } from '../types';

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="fit-heading">{title}</h3>
      <ul className="fit-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Chips({ title, items, kind }: { title: string; items: string[]; kind: 'have' | 'missing' }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="fit-heading">{title}</h3>
      <div className="fit-chips">
        {items.map((s) => (
          <span key={s} className={`tag ${kind === 'have' ? 'tag-open' : 'tag-missing'}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/** "Check my fit": compares the seeker's profile and résumé with this listing. */
export default function FitCheck({ jobId }: { jobId: string }) {
  const check = useMutation({ mutationFn: () => api<JobMatch>(`/seeker/jobs/${jobId}/match`, { method: 'POST' }) });
  const m = check.data;
  const band = !m ? '' : m.score >= 80 ? 'strong' : m.score >= 50 ? 'partial' : 'weak';

  return (
    <div className="card stack" aria-live="polite">
      <div className="fit-header">
        <h2>Your fit</h2>
        <button className="btn" disabled={check.isPending} onClick={() => check.mutate()}>
          {check.isPending ? 'Checking…' : m ? 'Check again' : 'Check my fit'}
        </button>
      </div>
      {!m && !check.isPending && !check.error && (
        <p className="muted small">
          Compares your <Link to="/me/profile">profile and résumé</Link> with this listing: what matches, what’s missing, and how to pitch it.
        </p>
      )}
      {check.isPending && <p className="muted small">Reading the listing and your profile…</p>}
      {check.error && (
        <p className="error" role="alert">
          {errorMessage(check.error)}
          {check.error.message.includes('profile') && (
            <>
              {' '}
              <Link to="/me/profile">Edit profile</Link>
            </>
          )}
        </p>
      )}
      {m && (
        <>
          <div className="fit-score">
            <span className={`fit-number fit-${band}`}>{m.score}</span>
            <div>
              <p className="fit-summary">{m.summary}</p>
              <p className="muted small">
                {m.source === 'ai' ? `AI analysis${m.cached ? ' · saved result' : ''}` : 'Keyword match'}
                {m.remainingToday !== undefined && ` · ${m.remainingToday} left today`}
              </p>
            </div>
          </div>
          {m.notice && <p className="notice small">{m.notice}</p>}
          {m.eligibility.length > 0 && (
            <div className="fit-eligibility" role="note">
              {m.eligibility.map((e) => (
                <p key={e} className="small">⚠️ {e}</p>
              ))}
            </div>
          )}
          <Chips title="You have" items={m.matchedSkills} kind="have" />
          <Chips title="The listing also asks for" items={m.missingSkills} kind="missing" />
          <List title="Strengths" items={m.strengths} />
          <List title="Gaps" items={m.gaps} />
          <List title="For your cover letter" items={m.coverLetterTips} />
        </>
      )}
    </div>
  );
}
