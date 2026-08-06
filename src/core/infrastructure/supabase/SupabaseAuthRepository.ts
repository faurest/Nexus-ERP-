import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { supabaseAuth, isSupabaseConfigured } from '../../../lib/supabase';

export class SupabaseAuthRepository implements IAuthRepository {
  async getCurrentUser(): Promise<any> {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabaseAuth.getUser();
    return data?.user || null;
  }

  async signIn(email: string, password?: string): Promise<any> {
    if (!password) throw new Error("Password is required");
    const { data, error } = await supabaseAuth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  async signInWithGoogle(): Promise<any> {
    const { data, error } = await supabaseAuth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
    return data;
  }

  async register(email: string, password: string): Promise<any> {
    const { data, error } = await supabaseAuth.signUp({ email, password });
    if (error) throw error;
    return data.user;
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabaseAuth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await supabaseAuth.signOut();
  }

  onAuthStateChanged(callback: (user: any) => void): () => void {
    const { data: { subscription } } = supabaseAuth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }
}
