import { useQuery } from '@tanstack/react-query';
import type { Meta } from '../types';
import { api } from './api';

/** Dropdown options (categories, regions, labels) served by the API. */
export function useMeta() {
  return useQuery({ queryKey: ['meta'], queryFn: () => api<Meta>('/meta'), staleTime: Infinity });
}
