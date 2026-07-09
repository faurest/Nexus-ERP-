import { IUserFacade } from '../interfaces/IUserFacade';
import { CreateUserUseCase } from '../usecases/users/CreateUserUseCase';
import { GetUserByEmailUseCase } from '../usecases/users/GetUserByEmailUseCase';

export class UserFacade implements IUserFacade {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private getUserByEmailUseCase: GetUserByEmailUseCase
  ) {}

  async createUser(email: string, data: any): Promise<void> {
    return this.createUserUseCase.execute(email, data);
  }

  async getUserByEmail(email: string): Promise<any> {
    return this.getUserByEmailUseCase.execute(email);
  }
}
