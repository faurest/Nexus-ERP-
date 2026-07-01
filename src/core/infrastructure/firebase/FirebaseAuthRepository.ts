import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { auth } from '../../../lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword } from 'firebase/auth';

export class FirebaseAuthRepository implements IAuthRepository {
  async getCurrentUser(): Promise<any> {
    return auth.currentUser;
  }

  async signIn(email: string, password?: string): Promise<any> {
    if (!password) throw new Error("Password is required");
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async signInWithGoogle(): Promise<any> {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    return credential.user;
  }

  async register(email: string, password: string): Promise<any> {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  onAuthStateChanged(callback: (user: any) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
}
