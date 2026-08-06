import { RegisterUserWithoutLoginUseCase } from '../usecases/auth/RegisterUserWithoutLoginUseCase';
import { ISessionFacade } from '../interfaces/ISessionFacade';
import { ObserveSessionUseCase, RefreshSessionUseCase, SyncProfileUseCase } from '../usecases/auth/SessionUseCases';
import { LoginUseCase } from '../usecases/auth/LoginUseCase';
import { LoginWithGoogleUseCase } from '../usecases/auth/LoginWithGoogleUseCase';
import { RegisterUseCase } from '../usecases/auth/RegisterUseCase';

export class SessionFacade implements ISessionFacade {
  constructor(
    private observeSessionUseCase: ObserveSessionUseCase,
    private refreshSessionUseCase: RefreshSessionUseCase,
    private syncProfileUseCase: SyncProfileUseCase,
    private loginUseCase: LoginUseCase,
    private loginWithGoogleUseCase: LoginWithGoogleUseCase,
    private registerUseCase: RegisterUseCase,
    private registerUserWithoutLoginUseCase: RegisterUserWithoutLoginUseCase,
    private authGateway: any
  ) {}

  observeSession(callback: (user: any) => void): () => void {
    return this.observeSessionUseCase.execute(callback);
  }

  async login(email: string, password?: string): Promise<any> {
    return this.loginUseCase.execute(email, password);
  }

  async loginWithGoogle(): Promise<any> {
    return this.loginWithGoogleUseCase.execute();
  }

  async registerDemo(email: string, password?: string): Promise<any> {
    if (!password) throw new Error("Password required");
    return this.registerUseCase.execute(email, password);
  }

  async logout(): Promise<void> {
    if (this.authGateway && this.authGateway.signOut) {
      await this.authGateway.signOut();
    }
  }

  async refreshSession(): Promise<void> {
    await this.refreshSessionUseCase.execute();
  }

  async syncProfile(user: any): Promise<void> {
    await this.syncProfileUseCase.execute(user);
  }

  async registerWithoutLogin(email: string, pass: string): Promise<any> {
    return this.registerUserWithoutLoginUseCase.execute(email, pass);
  }

  async resetPassword(email: string): Promise<void> {
    if (!this.authGateway || !this.authGateway.resetPassword) {
      throw new Error("Réinitialisation de mot de passe non disponible.");
    }
    await this.authGateway.resetPassword(email);
  }
}
