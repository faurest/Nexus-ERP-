import { registerUserWithoutLogin } from '../../../lib/firebase';
import { isSupabaseConfigured } from '../../../lib/supabase';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { BaseGateway } from './BaseGateway';
import { FirebaseAuthRepository } from '../firebase/FirebaseAuthRepository';
import { SupabaseAuthRepository } from '../supabase/SupabaseAuthRepository';

export class AuthGateway extends BaseGateway implements IAuthRepository {
  private firebaseAuth = new FirebaseAuthRepository();
  private supabaseAuth = new SupabaseAuthRepository();

  async getCurrentUser() {
    if (isSupabaseConfigured) {
      return this.supabaseAuth.getCurrentUser();
    }
    return this.firebaseAuth.getCurrentUser();
  }

  async signIn(email: string, password?: string) {
    if (isSupabaseConfigured) {
      return this.supabaseAuth.signIn(email, password);
    }
    return this.firebaseAuth.signIn(email, password);
  }

  async signInWithGoogle() {
    // Google provider not yet enabled in Supabase Auth — fall back to Firebase
    return this.firebaseAuth.signInWithGoogle();
  }

  async register(email: string, password: string) {
    if (isSupabaseConfigured) {
      return this.supabaseAuth.register(email, password);
    }
    return this.firebaseAuth.register(email, password);
  }

  async signOut() {
    if (isSupabaseConfigured) {
      return this.supabaseAuth.signOut();
    }
    return this.firebaseAuth.signOut();
  }

  onAuthStateChanged(callback: (user: any) => void) {
    if (isSupabaseConfigured) {
      return this.supabaseAuth.onAuthStateChanged(callback);
    }
    return this.firebaseAuth.onAuthStateChanged(callback);
  }

  async registerWithoutLogin(email: string, pass: string): Promise<any> {
    return registerUserWithoutLogin(email, pass);
  }
}
