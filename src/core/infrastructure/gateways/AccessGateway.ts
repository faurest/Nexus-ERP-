import { IAccessRepository } from '../../domain/repositories/IAccessRepository';
import { BaseGateway } from './BaseGateway';
import { FirebaseAccessRepository } from '../firebase/FirebaseAccessRepository';

export class AccessGateway extends BaseGateway implements IAccessRepository {
  private firebaseAccess = new FirebaseAccessRepository();
  private supabaseAccess: any = null;

  async syncProfile(user: any): Promise<void> {
    return this.execute('syncProfile', 
       () => this.firebaseAccess.syncProfile(user),
       () => this.supabaseAccess.syncProfile(user)
    );
  }

  async validateWhitelist(email: string, userId: string): Promise<boolean> {
    return this.execute('validateWhitelist', 
       () => this.firebaseAccess.validateWhitelist(email, userId),
       () => this.supabaseAccess.validateWhitelist(email, userId),
       true
    );
  }
}
