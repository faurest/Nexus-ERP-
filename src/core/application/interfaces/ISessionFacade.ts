export interface ISessionFacade {
  observeSession(callback: (user: any) => void): () => void;
  login(email: string, password?: string): Promise<any>;
  loginWithGoogle(): Promise<any>;
  registerDemo(email: string, password?: string): Promise<any>;
  logout(): Promise<void>;
  refreshSession(): Promise<void>;
  syncProfile(user: any): Promise<void>;
  registerWithoutLogin(email: string, pass: string): Promise<any>;
}
