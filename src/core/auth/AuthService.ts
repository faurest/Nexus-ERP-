import { sessionManager } from './SessionManager';
import { tokenManager } from './TokenManager';
import { AuthCredentials, AuthenticatedUser } from './types';
import { supabase, supabaseAuth } from '../../lib/supabase';
// Maintain dummy export for existing code compatibility if needed, or remove completely

class AuthService {
  async loginWithEmail(credentials: AuthCredentials): Promise<AuthenticatedUser | null> {
    try {
      const { data, error } = await supabaseAuth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;
      
      if (!data.user) return null;

      const customUser: AuthenticatedUser = {
          id: data.user.id,
          email: data.user.email || '',
          displayName: data.user.user_metadata?.full_name || null,
          role: 'Personnel',
      };
      return customUser;
    } catch (e: any) {
      if (credentials.email === 'demonstration@nexus.com') {
         console.log("Demo user not found or invalid, auto-registering...");
         return this.registerWithEmail(credentials);
      }
      console.error('Email login failed:', e);
      throw e;
    }
  }

  async registerWithEmail(credentials: AuthCredentials): Promise<AuthenticatedUser | null> {
    try {
      const { data, error } = await supabaseAuth.signUp({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;
      
      if (!data.user) return null;

      const customUser: AuthenticatedUser = {
          id: data.user.id,
          email: data.user.email || '',
          displayName: null,
          role: 'Admin', // Give them admin access by default for demo
      };
      return customUser;
    } catch (e) {
      console.error('Email registration failed:', e);
      throw e;
    }
  }

  async loginWithGoogle(): Promise<boolean> {
    try {
      const { data, error } = await supabaseAuth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Google login failed:', e);
      return false;
    }
  }

  async logout(): Promise<void> {
    sessionManager.clearSession();
    await supabaseAuth.signOut();
  }

  getCurrentUser(): AuthenticatedUser | null {
    const session = sessionManager.getSession();
    return session ? session.user : null;
  }

  isAuthenticated(): boolean {
    return tokenManager.hasValidToken();
  }

  observeAuthState(callback: (user: any | null) => void): () => void {
    const { data: { subscription } } = supabaseAuth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        const customUser: AuthenticatedUser = {
          id: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.full_name || null,
          role: 'Personnel',
        };
        
        sessionManager.setSession({
          token: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600 * 1000,
          user: customUser
        });
        
        // Return an object compatible with Firebase user for existing components
        callback({
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name,
        });
      } else {
        sessionManager.clearSession();
        callback(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const authService = new AuthService();

