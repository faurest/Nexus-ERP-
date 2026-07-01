import { IAuthRepository } from '../../../domain/repositories/IAuthRepository';
import { RepositoryException } from '../../exceptions/AppException';

export class LogoutUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute() {
    try {
      await this.authRepository.signOut();
    } catch (error) {
      throw new RepositoryException('Failed to logout', error);
    }
  }
}
