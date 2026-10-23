import { useMeta } from '../lib/meta';
import type { ApplicationStatus } from '../types';

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { data: meta } = useMeta();
  return <span className={`status status-${status.toLowerCase()}`}>{meta?.applicationStatuses[status] ?? status}</span>;
}
