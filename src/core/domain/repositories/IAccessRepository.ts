export interface IAccessRepository {
  syncProfile(user: any): Promise<void>;
  validateWhitelist(email: string, userId: string): Promise<boolean>;
}
