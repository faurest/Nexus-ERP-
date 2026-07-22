import { authService } from '../core/auth/AuthService';

/**
 * Returns the current Supabase user in a format compatible with Firebase's auth.currentUser.
 * Returns null if no user is authenticated.
 */
export function useCurrentUser() {
  const user = authService.getCurrentUser();
  
  if (!user) return null;
  
  return {
    uid: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}
