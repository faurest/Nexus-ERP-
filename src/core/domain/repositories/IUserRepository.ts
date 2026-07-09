export interface IUserRepository {
  createUser(email: string, data: any): Promise<void>;
  getUserByEmail(email: string): Promise<any>;
}
