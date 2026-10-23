import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role, User } from '../types';
import { api, ApiError } from './api';

const ME_KEY = ['me'];

export type RegisterInput =
  | { role: 'SEEKER'; name: string; email: string; password: string }
  | { role: 'EMPLOYER'; name: string; email: string; password: string; companyName: string };

export function homeFor(role: Role): string {
  return role === 'EMPLOYER' ? '/employer' : role === 'ADMIN' ? '/admin' : '/';
}

export function useAuth() {
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return (await api<{ user: User }>('/auth/me')).user;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
        throw e;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  // A new session changes per-user data such as "saved" and "applied" flags
  async function startSession(user: User) {
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'meta' });
    queryClient.setQueryData(ME_KEY, user);
  }

  return {
    user: me.data ?? null,
    isLoading: me.isLoading,
    async login(email: string, password: string) {
      const { user } = await api<{ user: User }>('/auth/login', { method: 'POST', json: { email, password } });
      await startSession(user);
      return user;
    },
    async register(input: RegisterInput) {
      const { user } = await api<{ user: User }>('/auth/register', { method: 'POST', json: input });
      await startSession(user);
      return user;
    },
    async logout() {
      await api('/auth/logout', { method: 'POST' });
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'meta' });
      queryClient.setQueryData(ME_KEY, null);
    },
    refresh: () => queryClient.invalidateQueries({ queryKey: ME_KEY }),
  };
}
