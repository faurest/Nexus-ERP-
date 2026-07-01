import { IAuthRepository } from '../../../domain/repositories/IAuthRepository';
import { RepositoryException } from '../../exceptions/AppException';

export class RegisterUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(email: string, password: string) {
    try {
      return await this.authRepository.register(email, password);
    } catch (error) {
      throw new RepositoryException('Failed to register user', error);
    }
  }
}
