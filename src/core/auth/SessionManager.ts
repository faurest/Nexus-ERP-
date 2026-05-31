import { UserSession } from './types';

class SessionManager {
  private readonly SESSION_KEY = 'nexus_session';

  setSession(session: UserSession): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  getSession(): UserSession | null {
    const data = localStorage.getItem(this.SESSION_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
  }

  isValid(): boolean {
    const session = this.getSession();
    if (!session) return false;
    return session.expiresAt > Date.now();
  }
}

export const sessionManager = new SessionManager();
