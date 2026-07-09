export interface IUserFacade {
  createUser(email: string, data: any): Promise<void>;
  getUserByEmail(email: string): Promise<any>;
}
