import { IUserRepository } from '../../../domain/repositories/IUserRepository';
export class GetUserByEmailUseCase {
  constructor(private repository: IUserRepository) {}
  async execute(email: string): Promise<any> {
    return this.repository.getUserByEmail(email);
  }
}
