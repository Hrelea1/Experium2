import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * useAdminCheck — replaced supabase.rpc('get_user_role')
 * Role is now embedded in the JWT and stored on the user object from AuthContext.
 */
export const useAdminCheck = () => {
  const { user, loading: authLoading } = useAuth();

  const isAdmin = user?.role === 'admin';
  const loading = authLoading;

  return { isAdmin, loading };
};
