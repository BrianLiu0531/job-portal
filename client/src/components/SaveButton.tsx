import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function SaveButton({ jobId, saved }: { jobId: string; saved: boolean }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => api(`/jobs/${jobId}/save`, { method: saved ? 'DELETE' : 'PUT' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ predicate: (q) => ['jobs', 'job', 'saved'].includes(q.queryKey[0] as string) }),
  });

  return (
    <button
      className={`btn btn-small ${saved ? 'saved' : ''}`}
      aria-pressed={saved}
      disabled={toggle.isPending}
      onClick={(e) => {
        e.preventDefault();
        toggle.mutate();
      }}
    >
      {saved ? '★ Saved' : '☆ Save'}
    </button>
  );
}
