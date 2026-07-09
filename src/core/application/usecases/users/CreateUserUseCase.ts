import { IUserRepository } from '../../../domain/repositories/IUserRepository';
export class CreateUserUseCase {
  constructor(private repository: IUserRepository) {}
  async execute(email: string, data: any): Promise<void> {
    return this.repository.createUser(email, data);
  }
}
