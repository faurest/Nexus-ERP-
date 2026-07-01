import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { BaseGateway } from './BaseGateway';
import { FirebaseAuthRepository } from '../firebase/FirebaseAuthRepository';
// import { SupabaseAuthRepository } from '../supabase/SupabaseAuthRepository'; // TODO

export class AuthGateway extends BaseGateway implements IAuthRepository {
  private firebaseAuth = new FirebaseAuthRepository();
  // private supabaseAuth = new SupabaseAuthRepository();
  private supabaseAuth: any = null; // Mock until implemented

  async getCurrentUser() {
    return this.execute('getCurrentUser', 
      () => this.firebaseAuth.getCurrentUser(), 
      () => this.supabaseAuth.getCurrentUser(), 
      true
    );
  }

  async signIn(email: string, password?: string) {
    return this.execute('signIn', 
      () => this.firebaseAuth.signIn(email, password), 
      () => this.supabaseAuth.signIn(email, password)
    );
  }

  async signInWithGoogle() {
    return this.execute('signInWithGoogle', 
      () => this.firebaseAuth.signInWithGoogle(), 
      () => this.supabaseAuth.signInWithGoogle()
    );
  }

  async register(email: string, password: string) {
    return this.execute('register', 
      () => this.firebaseAuth.register(email, password), 
      () => this.supabaseAuth.register(email, password)
    );
  }

  async signOut() {
    return this.execute('signOut', 
      () => this.firebaseAuth.signOut(), 
      () => this.supabaseAuth.signOut()
    );
  }

  onAuthStateChanged(callback: (user: any) => void) {
    // For auth listeners, we currently bind to the active provider
    if (this.featureFlags.getProviderMode() === 'SUPABASE') {
      return this.supabaseAuth.onAuthStateChanged(callback);
    }
    return this.firebaseAuth.onAuthStateChanged(callback);
  }
}
