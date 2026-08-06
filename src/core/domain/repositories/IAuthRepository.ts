export interface IAuthRepository {
  getCurrentUser(): Promise<any>;
  signIn(email: string, password?: string): Promise<any>;
  signInWithGoogle(): Promise<any>;
  register(email: string, password: string): Promise<any>;
  signOut(): Promise<void>;
  onAuthStateChanged(callback: (user: any) => void): () => void;
  resetPassword(email: string): Promise<void>;
}
