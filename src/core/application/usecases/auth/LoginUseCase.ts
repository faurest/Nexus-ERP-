import { IAuthRepository } from '../../../domain/repositories/IAuthRepository';
import { RepositoryException } from '../../exceptions/AppException';

export class LoginUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(email: string, password?: string) {
    try {
      return await this.authRepository.signIn(email, password);
    } catch (error) {
      throw new RepositoryException('Failed to login', error);
    }
  }
}
