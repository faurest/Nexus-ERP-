import { sessionManager } from './SessionManager';

class TokenManager {
  getToken(): string | null {
    const session = sessionManager.getSession();
    if (!session) return null;
    return session.token;
  }

  getRefreshToken(): string | null {
    const session = sessionManager.getSession();
    if (!session) return null;
    return session.refreshToken;
  }

  hasValidToken(): boolean {
    return sessionManager.isValid();
  }

  // Placeholder for token refresh logic
  async refreshTokens(): Promise<boolean> {
    const token = this.getRefreshToken();
    if (!token) return false;
    
    // In a real implementation, this would call the backend
    // const newTokens = await fetch('/api/auth/refresh', ...);
    return false;
  }
}

export const tokenManager = new TokenManager();
