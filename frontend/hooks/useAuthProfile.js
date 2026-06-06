import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';

export function useAuthProfile() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.auth.me(),
    enabled: !!token,
    retry: false,
    staleTime: 60_000,
  });
}
