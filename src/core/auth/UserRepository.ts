import { AuthenticatedUser } from './types';
// Fallback to Firebase initially for gentle migration
import { db, doc, getDoc } from '../../lib/firebase';

class UserRepository {
  async getUser(id: string): Promise<AuthenticatedUser | null> {
    try {
      const docRef = doc(db, 'users', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          email: data.email,
          displayName: data.displayName || null,
          role: data.role || 'Personnel',
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return null;
    }
  }
}

export const userRepository = new UserRepository();
