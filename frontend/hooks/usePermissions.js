import { useMemo } from 'react';
import { permissionFlags } from '@/lib/rbac';
import { useAuthProfile } from '@/hooks/useAuthProfile';

export function usePermissions() {
  const { data: profile, isLoading, isError } = useAuthProfile();
  const flags = useMemo(() => permissionFlags(profile), [profile]);

  return {
    profile,
    isLoading,
    isError,
    ...flags,
  };
}
