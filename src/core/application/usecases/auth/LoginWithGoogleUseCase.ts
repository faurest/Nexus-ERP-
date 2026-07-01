import { IAuthRepository } from '../../../domain/repositories/IAuthRepository';
import { RepositoryException } from '../../exceptions/AppException';

export class LoginWithGoogleUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute() {
    try {
      return await this.authRepository.signInWithGoogle();
    } catch (error) {
      throw new RepositoryException('Failed to login with Google', error);
    }
  }
}
