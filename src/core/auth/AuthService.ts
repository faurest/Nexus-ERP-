import { sessionManager } from './SessionManager';
import { tokenManager } from './TokenManager';
import { userRepository } from './UserRepository';
import { AuthCredentials, AuthenticatedUser } from './types';
import { loginWithGoogle, loginWithEmail as firebaseLoginWithEmail, registerWithEmail as firebaseRegisterWithEmail, logout as firebaseLogout, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

class AuthService {
  async loginWithEmail(credentials: AuthCredentials): Promise<AuthenticatedUser | null> {
    try {
      const result = await firebaseLoginWithEmail(credentials.email, credentials.password);
      
      const customUser: AuthenticatedUser = {
          id: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName,
          role: 'Personnel',
      };
      return customUser;
    } catch (e: any) {
      if (credentials.email === 'demonstration@nexus.com' && (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials' || !e.code)) {
         console.log("Demo user not found or invalid, auto-registering...");
         return this.registerWithEmail(credentials);
      }
      console.error('Email login failed:', e);
      throw e;
    }
  }

  async registerWithEmail(credentials: AuthCredentials): Promise<AuthenticatedUser | null> {
    try {
      const result = await firebaseRegisterWithEmail(credentials.email, credentials.password);
      
      const customUser: AuthenticatedUser = {
          id: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName,
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
