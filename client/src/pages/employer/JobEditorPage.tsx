import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import JobForm from '../../components/JobForm';
import { api, errorMessage } from '../../lib/api';
import { useMeta } from '../../lib/meta';
import type { JobBase, JobInput } from '../../types';

export default function JobEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: meta } = useMeta();

  const { data: existing, isLoading } = useQuery({
    queryKey: ['employer-job', id],
    queryFn: () => api<JobInput & { id: string }>(`/employer/jobs/${id}`),
    enabled: !!id,
  });

  const save = useMutation({
    mutationFn: (input: JobInput) =>
      id
        ? api<JobBase>(`/employer/jobs/${id}`, { method: 'PUT', json: input })
        : api<JobBase>('/employer/jobs', { method: 'POST', json: input }),
    onSuccess: async (job) => {
      await queryClient.invalidateQueries({ predicate: (q) => ['employer-jobs', 'employer-job', 'jobs', 'job'].includes(q.queryKey[0] as string) });
      navigate(`/jobs/${job.id}`);
    },
  });

  if (!meta || (id && isLoading)) return <p className="muted">Loading…</p>;

  return (
    <div className="stack narrow">
      <div>
        <Link to="/employer" className="muted small">
          ← Dashboard
        </Link>
        <h1>{id ? 'Edit job' : 'Post a job'}</h1>
      </div>
      <JobForm
        key={existing?.id ?? 'new'}
        meta={meta}
        initial={existing}
        submitting={save.isPending}
        serverError={errorMessage(save.error)}
        submitLabel={id ? 'Save changes' : 'Publish job'}
        onSubmit={(input) => save.mutate(input)}
      />
    </div>
  );
}
