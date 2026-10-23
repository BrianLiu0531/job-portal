import { Link } from 'react-router-dom';
import { formatSalary, locationLabel, postedAgo } from '../lib/format';
import type { JobListItem, Meta } from '../types';
import SaveButton from './SaveButton';
import StatusBadge from './StatusBadge';

interface Props {
  job: JobListItem;
  meta: Meta;
  canSave: boolean;
}

export default function JobCard({ job, meta, canSave }: Props) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  return (
    <article className="card job-card">
      <div className="job-card-head">
        <div>
          <h3>
            <Link to={`/jobs/${job.id}`}>{job.title}</Link>
          </h3>
          <p className="muted">{job.company.name}</p>
        </div>
        {canSave && <SaveButton jobId={job.id} saved={job.saved} />}
      </div>
      <ul className="job-meta">
        <li>📍 {locationLabel(job, meta)}</li>
        <li>{meta.workTypes[job.workType]}</li>
        <li>{meta.workplaces[job.workplace]}</li>
        {salary && <li>💵 {salary}</li>}
      </ul>
      <div className="job-card-foot">
        <span className="muted small">
          {job.category} · {postedAgo(job.createdAt)}
        </span>
        <span className="row">
          {job.sponsorship && <span className="tag tag-visa">Visa sponsorship</span>}
          {job.applicationStatus && <StatusBadge status={job.applicationStatus} />}
        </span>
      </div>
    </article>
  );
}
