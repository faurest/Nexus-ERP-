import { sessionManager } from './SessionManager';
import { tokenManager } from './TokenManager';
import { AuthCredentials, AuthenticatedUser } from './types';
import { supabase, supabaseAuth, isSupabaseConfigured } from '../../lib/supabase';
import { auth as firebaseAuth, onAuthStateChanged as firebaseOnAuthStateChanged } from '../../lib/firebase';
// Maintain dummy export for existing code compatibility if needed, or remove completely

class AuthService {
  async loginWithEmail(credentials: AuthCredentials): Promise<AuthenticatedUser | null> {
    if (!isSupabaseConfigured) throw new Error("Supabase n'est pas configuré. Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
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
    if (!isSupabaseConfigured) throw new Error("Supabase n'est pas configuré.");
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
    if (!isSupabaseConfigured) { console.error("Supabase not configured"); return false; }
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
    if (isSupabaseConfigured) {
      await supabaseAuth.signOut();
    }
    if (firebaseAuth?.currentUser) {
      await firebaseAuth.signOut();
    }
  }

  getCurrentUser(): AuthenticatedUser | null {
    const session = sessionManager.getSession();
    return session ? session.user : null;
  }

  isAuthenticated(): boolean {
    return tokenManager.hasValidToken();
  }

  observeAuthState(callback: (user: any | null) => void): () => void {
    let supabaseUser: any | null = null;
    let firebaseUser: any | null = null;

    const toPlain = (user: any) => {
      if (!user) return null;
      return {
        uid: user.id || user.uid,
        email: user.email || '',
        displayName: user.displayName || user.user_metadata?.full_name || null,
        access_token: user.access_token || '',
        refresh_token: user.refresh_token || '',
        expires_at: user.expires_at || undefined,
      };
    };

    const emit = () => {
      const effective = toPlain(supabaseUser) || toPlain(firebaseUser);
      if (effective) {
        const customUser: AuthenticatedUser = {
          id: effective.uid,
          email: effective.email || '',
          displayName: effective.displayName,
          role: 'Personnel',
        };
        sessionManager.setSession({
          token: effective.access_token,
          refreshToken: effective.refresh_token,
          expiresAt: effective.expires_at ? effective.expires_at * 1000 : Date.now() + 3600 * 1000,
          user: customUser
        });
      } else {
        sessionManager.clearSession();
      }
      callback(effective);
    };

    let supabaseUnsub = () => {};
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabaseAuth.onAuthStateChange(async (_event, session) => {
        supabaseUser = session?.user || null;
        emit();
      });
      supabaseUnsub = () => subscription.unsubscribe();
    }

    let firebaseUnsub = () => {};
    if (firebaseAuth) {
      firebaseUnsub = firebaseOnAuthStateChanged(firebaseAuth, (user: any) => {
        firebaseUser = user || null;
        emit();
      });
    }

    return () => {
      supabaseUnsub();
      firebaseUnsub();
    };
  }
}

export const authService = new AuthService();

