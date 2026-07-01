export interface ISessionFacade {
  initialize(): void;
  refresh(): Promise<void>;
  logout(): Promise<void>;
  getCurrentSession(): any;
  login(email: string, password?: string): Promise<any>;
  loginWithGoogle(): Promise<any>;
  registerDemo(email: string, password?: string): Promise<any>;
}
