import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { RepositoryException } from '../exceptions/AppException';

export class AuthUseCases {
  constructor(private authRepository: IAuthRepository) {}

  async getCurrentUser() {
    try {
      return await this.authRepository.getCurrentUser();
    } catch (error) {
      throw new RepositoryException('Failed to get current user', error);
    }
  }

  async login(email: string, password: string) {
    try {
      return await this.authRepository.signIn(email, password);
    } catch (error) {
      throw new RepositoryException('Failed to login', error);
    }
  }

  async logout() {
    try {
      await this.authRepository.signOut();
    } catch (error) {
      throw new RepositoryException('Failed to logout', error);
    }
  }

  onAuthStateChanged(callback: (user: any) => void) {
    return this.authRepository.onAuthStateChanged(callback);
  }
}
