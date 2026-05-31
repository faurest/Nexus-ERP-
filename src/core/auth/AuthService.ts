import { sessionManager } from './SessionManager';
import { tokenManager } from './TokenManager';
import { userRepository } from './UserRepository';
import { AuthCredentials, AuthenticatedUser } from './types';
import { loginWithGoogle, logout as firebaseLogout, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

class AuthService {
  async loginWithEmail(credentials: AuthCredentials): Promise<AuthenticatedUser | null> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      if (!res.ok) {
        throw new Error('Authentication failed');
      }

      const data = await res.json();
      sessionManager.setSession({
        token: data.token,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        user: data.user
      });

      return data.user;
    } catch (e) {
      console.error('Email login failed:', e);
      return null;
    }
  }

  async loginWithGoogle(): Promise<boolean> {
    try {
      await loginWithGoogle();
      return true;
    } catch (e) {
      console.error('Google login failed:', e);
      return false;
    }
  }

  async logout(): Promise<void> {
    sessionManager.clearSession();
    await firebaseLogout();
  }

  getCurrentUser(): AuthenticatedUser | null {
    const session = sessionManager.getSession();
    return session ? session.user : null;
  }

  isAuthenticated(): boolean {
    return tokenManager.hasValidToken() || auth.currentUser !== null;
  }

  // Permet la transition en douceur - écoute Firebase mais synchronise avec notre SessionManager local
  observeAuthState(callback: (user: any | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // En transition, on simule une session locale à partir du token Firebase
        const token = await firebaseUser.getIdToken();
        const customUser: AuthenticatedUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName,
          role: 'Personnel', // Role par defaut
        };
        
        sessionManager.setSession({
          token,
          refreshToken: firebaseUser.refreshToken,
          expiresAt: Date.now() + 3600 * 1000,
          user: customUser
        });
        
        callback(firebaseUser);
      } else {
        sessionManager.clearSession();
        callback(null);
      }
    });
  }
}

export const authService = new AuthService();
