import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'moderator' | 'provider' | 'ambassador' | 'user';

/**
 * useRoleCheck — replaced supabase.from('user_roles').select('role')
 * Role is now a single field on the user object from the JWT.
 */
export function useRoleCheck() {
  const { user, loading } = useAuth();

  const role = (user?.role ?? 'user') as AppRole;

  const hasRole = (r: AppRole): boolean => role === r;

  const isAdmin = hasRole('admin');
  const isAmbassador = hasRole('ambassador');
  const isProvider = hasRole('provider');
  const isModerator = hasRole('moderator');

  return {
    roles: user ? [role] : [] as AppRole[],
    loading,
    hasRole,
    isAdmin,
    isAmbassador,
    isProvider,
    isModerator,
    // no-op: roles come from JWT, re-fetching user refreshes it
    refetch: () => {},
  };
}
